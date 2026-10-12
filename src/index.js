import { serviceEngagementTick } from "./services/engagement.js";
import managedRoutes, { managedPublic, TENANT_KEY } from './services/managed-bots.js';
import { unseal as unsealManaged } from './services/common.js';
import serviceRoutes, { portal } from './services/routes.js';
import { serviceTick } from './services/engine.js';
import { fundingTick, handleServicePayment } from './services/payments.js';
import { backupTick } from './services/reports.js';
import { subscription, combinedSubscription } from './services/subscriptions.js';
import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { handleUpdate } from './telegram.js';
import { DurableKV } from './storage.js';
import { getJson, putJson } from './kv.js';
import { safeEqual } from './auth.js';
import { broadcastTick } from './broadcast.js';
import { expireOrders } from './commerce.js';
import { groupTick } from './groups.js';
import { feedTick, relayTick } from './automation.js';
import { handlePayment } from './payments.js';
import authRoutes from './routes/auth.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import usersRoutes from './routes/users.routes.js';
import broadcastRoutes from './broadcast.js';
import engagementRoutes from './routes/engagement.routes.js';
import supportRoutes from './routes/support.routes.js';
import menuRoutes from './routes/menu.routes.js';
import newsRoutes from './routes/news.routes.js';
import ratesRoutes from './routes/rates.routes.js';
import { newsTick } from './news.js';
import { ratesTick } from './rates.js';
import settingsRoutes from './routes/settings.routes.js';
import mediaRoutes from './media.js';
import studioRoutes from './routes/studio.routes.js';
import creatorRoutes from './routes/creator.routes.js';
import { creatorHook, creatorRelay } from './creator.js';

const api = new Hono().basePath('/api');
api.use('*', async (c, next) => {
  const proxied = /^\/api\/bots\/[a-f0-9]{16}\/admin(\/api\/.*)$/.exec(c.req.path);
  const path = proxied ? proxied[1] : c.req.path;
  const maxSize = path.startsWith('/api/media') ? 22 * 1024 * 1024 : path.startsWith('/api/services/backup/') ? 20 * 1024 * 1024 : /^\/api\/portal\/payments\/[^/]+\/receipt$/.test(path) ? 12 * 1024 * 1024 : 1024 * 1024;
  return bodyLimit({maxSize,onError:c=>c.json({ok:false,error:'request_too_large'},413)})(c,next);
});
api.use('*', async (c, next) => { c.header('cache-control', 'no-store'); c.header('x-content-type-options', 'nosniff'); await next(); });
for (const [path, routes] of Object.entries({ auth: authRoutes, dashboard: dashboardRoutes, users: usersRoutes, broadcast: broadcastRoutes, engagement: engagementRoutes, support: supportRoutes, menu: menuRoutes, news: newsRoutes, rates: ratesRoutes, settings: settingsRoutes, media: mediaRoutes, studio: studioRoutes, creator: creatorRoutes, services: serviceRoutes, portal, bots: managedRoutes })) api.route('/' + path, routes);
api.get('/health', c => c.json({ ok: true, data: { ts: Date.now(), version: c.env.APP_VERSION || '2.0.0', colo: c.req.raw.cf?.colo || null, durable: !!c.env.__coordinated } }));
api.notFound(c => c.json({ ok: false, error: 'not_found' }, 404));
// Cloudflare's own "you are over the Free plan's daily allowance" exceptions (rows read /
// written, requests, duration). They are thrown by the very first storage statement of a
// request, so without this mapping the whole panel — including the login form — shows a
// bare `internal_error` until the allowance resets at 00:00 UTC.
const FREE_TIER_LIMIT = /free tier|exceeded allowed|daily (?:request |duration )?limit/i;
export const errorCode = (error) => {
  const message = String(error?.message || '');
  if (FREE_TIER_LIMIT.test(message)) return 'cloudflare_free_tier_limit';
  // Only the API's own snake_case codes are safe to echo back; anything else is a
  // JavaScript exception message and must not leak to the client.
  return /^[a-z0-9_]+$/.test(message) ? message : 'internal_error';
};
api.onError((err, c) => {
  if (err.status) return c.json({ ok: false, error: err.message }, err.status);
  console.error('[api] request failed', c.req.method, c.req.path, err.name, String(err.message).slice(0, 200));
  const code = errorCode(err);
  return c.json({ ok: false, error: code }, code === 'cloudflare_free_tier_limit' ? 503 : 500);
});

export async function runScheduled(env) {
  const at = Date.now(), previous = await getJson(env, 'v2:runtime:cron', {});
  if (at - (previous.at || 0) < 10000) return;
  const errors = [];
  await putJson(env, 'v2:runtime:cron', { at, status: 'running' });
  // Each subsystem records its own delivery results; one failure must not stop the others.
  for (const [name, fn] of Object.entries({ orders: expireOrders, groups: groupTick, broadcasts: broadcastTick, feeds: feedTick, relay: relayTick, news: newsTick, rates: ratesTick, services: serviceTick, funding: fundingTick, backups: backupTick, servicesExtra: serviceEngagementTick })) {
    try { await fn(env); } catch (e) { errors.push({ name, error: String(e.message).slice(0, 160) }); }
  }
  await putJson(env, 'v2:runtime:cron', { at, finishedAt: Date.now(), status: errors.length ? 'partial' : 'ok', errors });
}
// workerd throws an isolate-killing "Can't read from request stream after response has been
// sent" whenever a request forwarded to a Durable Object still has an unconsumed body when the
// response is returned (cloudflare/workerd#918) — e.g. an expired-session 401, an unknown-route
// 404 or any validation reply that returns before reading the body. Under `wrangler dev` the
// exception crashes the session and every later request fails with http 500. Buffering the body
// up front hands the handlers a detached request, so the socket-backed stream is always fully
// drained before any response can be sent. Oversized bodies are drained too: every bodyLimit
// cap stays below this ceiling, so such requests can only ever be rejected with 413.
const MAX_BUFFERED_BODY = 23 * 1024 * 1024;
async function detachedRequest(request) {
  if (!request.body) return request;
  const oversized = Number(request.headers.get('content-length') || 0) > MAX_BUFFERED_BODY;
  const body = await request.arrayBuffer();
  return new Request(request, oversized ? { body: null } : { body });
}
const serverError = (label, error, status = 500) => {
  console.error('[worker] ' + label + ' failed', error?.name, String(error?.message).slice(0, 200));
  const code = errorCode(error);
  const httpStatus = Number.isInteger(error?.status) ? Math.min(599, Math.max(400, error.status)) : code === 'cloudflare_free_tier_limit' ? 503 : status;
  return Response.json({ ok: false, error: code }, { status: httpStatus });
};
// Wraps the public (non-Hono) entry points: payment callbacks, subscription links,
// creator webhooks and the Telegram webhook all live outside api.onError.
// NOTE: this must be a plain call on the stub. Adding a method to BotCoordinator and
// invoking it through the stub would need Durable Object RPC, which workerd refuses
// unless the class `extends DurableObject` — that turns every request into a 500.
async function guarded(label, fn) {
  try { return await fn(); } catch (error) { return serverError(label, error); }
}
async function dispatch(request, env, ctx) {
  const { pathname } = new URL(request.url);
  if (pathname.startsWith('/cr-hook/')) return guarded('cr-hook', () => creatorHook(env, request, pathname.slice('/cr-hook/'.length)));
  if (pathname.startsWith('/cr-relay/')) return guarded('cr-relay', () => creatorRelay(env, request, pathname.slice('/cr-relay/'.length)));
  if (pathname.startsWith('/bots/')) { try { return await managedPublic(request, env); } catch (error) { return Response.json({ok:false,error:error.status?error.message:'managed_request_failed'},{status:error.status||500}); } }
  if (pathname === '/internal/tick') { await runScheduled(env); return Response.json({ ok: true }); }
  if (pathname === '/telegram/webhook') {
    if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
    const secret = request.headers.get('x-telegram-bot-api-secret-token') || '';
    if (!env.WEBHOOK_SECRET || !await safeEqual(secret, env.WEBHOOK_SECRET)) return Response.json({ ok: false, error: 'unauthorized' }, { status: 401 });
    if (Number(request.headers.get('content-length') || 0) > 1024 * 1024) return new Response('Too large', { status: 413 });
    let update; try { update = await request.json(); } catch {}
    if (!update || Array.isArray(update) || typeof update !== 'object') return Response.json({ ok: false, error: 'bad_request' }, { status: 400 });
    // Acknowledge only after durable state changes. Telegram may retry a non-2xx update.
    try { await handleUpdate(env, update); } catch (e) { console.error('[webhook] processing failed', e.name); return Response.json({ ok: false }, { status: 500 }); }
    return Response.json({ ok: true });
  }
  if (pathname.startsWith('/service-pay/')) return guarded('service-pay', () => handleServicePayment(request, env));
  if (pathname.startsWith('/sub-all/')) return guarded('sub-all', () => combinedSubscription(request, env));
  if (pathname.startsWith('/sub/')) return guarded('sub', () => subscription(request, env));
  if (pathname.startsWith('/pay/')) return guarded('pay', () => handlePayment(request, env));
  return api.fetch(request, env, ctx);
}

export class BotCoordinator {
  constructor(state, env) {
    this.state = state;
    this.kv = new DurableKV(state.storage, env.BOT_KV);
    this.env = { ...env, BOT_KV: this.kv, __coordinated: true };
    this.queue = Promise.resolve();
    this.groupQueues = new Map();
    this.env.withGroupLock = (id, fn) => this.withGroupLock(id, fn);
  }
  enqueue(fn) { const task = this.queue.then(fn, fn); this.queue = task.catch(() => {}); return task; }
  withGroupLock(id, fn) {
    const previous = this.groupQueues.get(String(id)) || Promise.resolve();
    const task = previous.then(fn, fn);
    this.groupQueues.set(String(id), task);
    const cleanup = () => { if (this.groupQueues.get(String(id)) === task) this.groupQueues.delete(String(id)); };
    task.then(cleanup, cleanup); return task;
  }
  async arm() {
    const current = await this.state.storage.getAlarm(), next = Date.now() + 15000;
    if (!current || current > next) await this.state.storage.setAlarm(next);
  }
  async environment() {
    const row = this.kv.sql.exec('SELECT value FROM panel_kv WHERE key = ? AND deleted=0', TENANT_KEY).toArray()[0];
    if (!row?.value) return this.env;
    this.kv.legacy = null;
    if (this.managedStamp === row.value && this.managedEnv) return this.managedEnv;
    const meta = JSON.parse(row.value), secrets = await unsealManaged(this.env, meta.credentials);
    this.managedEnv = { BOT_KV: this.kv, BOT_STATE: this.env.BOT_STATE, ASSETS: this.env.ASSETS, VAULT_KEY: this.env.VAULT_KEY, APP_VERSION: this.env.APP_VERSION, BOT_TOKEN: secrets.token, WEBHOOK_SECRET: secrets.webhookSecret, PUBLIC_BASE_URL: meta.baseUrl, MANAGED_BASE_URL: meta.baseUrl, MANAGED_BOT_ID: meta.id, __coordinated: true, withGroupLock: this.env.withGroupLock };
    if (this.env.BACKUPS) { const bucket = this.env.BACKUPS; this.managedEnv.BACKUPS = { put: (path, data, opts) => bucket.put('bots/'+meta.id+'/'+path, data, opts) }; this.managedEnv.BACKUP_PASSWORD = this.env.BACKUP_PASSWORD; }
    this.managedStamp = row.value;
    return this.managedEnv;
  }
  async fetch(request) {
    try { return await this.handle(request); } catch (error) { return serverError('coordinator', error); }
  }
  async handle(request) {
    let path = new URL(request.url).pathname;
    request = await detachedRequest(request);
    if (path === '/internal/managed/init') return this.enqueue(async () => {
      const meta = await request.json();
      if (!meta?.id || !meta?.credentials || !meta?.baseUrl) return Response.json({ok:false},{status:400});
      this.kv.legacy = null;
      const exists = this.kv.sql.exec('SELECT value FROM panel_kv WHERE key=? AND deleted=0', TENANT_KEY).toArray()[0];
      if (!exists) {
        await this.kv.batch([{key:TENANT_KEY,value:JSON.stringify(meta)},{key:'settings',value:JSON.stringify({botPurpose:'vpn',schemaVersion:3,botUsername:meta.username,publicBaseUrl:meta.baseUrl})},{key:'v2:svc-config:main',value:JSON.stringify({publicUrl:meta.baseUrl,brand:{name:meta.title,nameEn:meta.title,mark:'S',accent:'#38bdf8',logo:''}})}]);
      } else if (exists.value !== JSON.stringify(meta)) await this.kv.put(TENANT_KEY, JSON.stringify(meta));
      await this.arm();
      return Response.json({ok:true});
    });
    let requestEnv = await this.environment();
    if (path === '/internal/managed/dispatch') {
      if (!requestEnv.MANAGED_BOT_ID) return Response.json({ok:false,error:'managed_bot_initialization_required'},{status:503});
      const route = request.headers.get('x-managed-route') || '';
      if (!route.startsWith('/') || route.startsWith('//') || route.includes('..')) return Response.json({ok:false},{status:400});
      const url = new URL(route, requestEnv.MANAGED_BASE_URL);
      const admin = request.headers.get('x-managed-admin') === '1';
      request = new Request(url, {method:request.method,headers:request.headers,...(['GET','HEAD'].includes(request.method)||!request.body?{}:{body:request.body,duplex:'half'})});
      requestEnv = {...requestEnv,TRUSTED_PARENT_ADMIN:admin}; path=url.pathname;
    }
    const run = () => dispatch(request, requestEnv, this.state);
    // Uploads/downloads have independent UUID records and need not block group moderation.
    let fastPreCheckout = false;
    const independentRead = request.method === 'GET' && (path.startsWith('/bots/') || path.startsWith('/api/services/') || path.startsWith('/api/portal/') || path.startsWith('/sub/') || path.startsWith('/sub-all/'));
    const independentMedia = path.startsWith('/api/media') || /^\/api\/studio\/orders\/[^/]+\/receipt$/.test(path);
    let groupId = /^\/api\/studio\/groups\/(-\d+)(?:\/|$)/.exec(path)?.[1];
    if (path === '/telegram/webhook' || (path === '/api/studio/groups' && request.method === 'POST')) {
      const body = await request.clone().json().catch(() => null);
      fastPreCheckout = !!body?.pre_checkout_query;
      const update = body?.message || body?.edited_message || body?.chat_member || body?.my_chat_member || (body?.callback_query?.data?.startsWith('cap:') ? body.callback_query.message : null);
      if (update && ['group', 'supergroup'].includes(update.chat?.type)) groupId = String(update.chat.id);
      if (path === '/api/studio/groups' && /^-\d+$/.test(body?.chatId)) groupId = body.chatId;
    }
    // A slow broadcast/upload must not serialize unrelated busy groups. Each group keeps its own ordered mutations.
    const response = await (independentMedia || independentRead || fastPreCheckout ? run() : groupId ? this.withGroupLock(groupId, run) : this.enqueue(run));
    if (request.method !== 'GET' || path.startsWith('/pay/')) await this.arm();
    return response;
  }
  async alarm() {
    await this.enqueue(async () => runScheduled(await this.environment())); this.kv.cleanup();
    await this.state.storage.setAlarm(Date.now() + 60000);
  }
}
function stub(env) { return env.BOT_STATE.get(env.BOT_STATE.idFromName('telegram-bot-panel-v2')); }
export default {
  async fetch(request, env, ctx) {
    try { return await routeRequest(request, env, ctx); } catch (error) { return serverError('worker:' + new URL(request.url).pathname, error); }
  },
  async scheduled(event, env, ctx) {
    try {
      if (env.BOT_STATE) ctx.waitUntil(guarded('coordinator:tick', () => stub(env).fetch(new Request('https://internal/internal/tick', { method: 'POST' }))));
      else if (env.TEST_MODE) ctx.waitUntil(runScheduled(env));
    } catch (error) { serverError('scheduled', error); }
  },
};
async function routeRequest(request, env, ctx) {
  const path = new URL(request.url).pathname;
  if (/^\/bots\/[a-f0-9]{16}\/portal\/?$/.test(path) && request.method === 'GET') {
    const assetURL = new URL('/portal/', request.url);
    return env.ASSETS ? env.ASSETS.fetch(new Request(assetURL, request)) : new Response('Not Found', {status:404});
  }
  if (path.startsWith('/internal/')) return new Response('Not Found', { status: 404 });
  if (path === '/telegram/webhook') {
    if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
    const secret = request.headers.get('x-telegram-bot-api-secret-token') || '';
    if (!env.WEBHOOK_SECRET || !await safeEqual(secret, env.WEBHOOK_SECRET)) return Response.json({ ok: false, error: 'unauthorized' }, { status: 401 });
    if (Number(request.headers.get('content-length') || 0) > 1024 * 1024) return new Response('Too large', { status: 413 });
  }
  if (path.startsWith('/api/') || path === '/telegram/webhook' || path.startsWith('/pay/') || path.startsWith('/service-pay/') || path.startsWith('/sub/') || path.startsWith('/sub-all/') || path.startsWith('/bots/') || path.startsWith('/cr-hook/') || path.startsWith('/cr-relay/')) {
    if (env.BOT_STATE) return guarded('coordinator:' + path, () => stub(env).fetch(request));
    if (env.TEST_MODE) return dispatch(request, env, ctx);
    return Response.json({ ok: false, error: 'durable_object_binding_required' }, { status: 503 });
  }
  return env.ASSETS && request.method === 'GET' ? env.ASSETS.fetch(request) : new Response('Not Found', { status: 404 });
}
