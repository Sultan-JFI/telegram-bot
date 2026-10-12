import test, { beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import worker, { BotCoordinator } from '../src/index.js';
import { MemoryKV, telegramMock } from './helpers.mjs';
import authRoutes from '../src/routes/auth.routes.js';
import broadcastRoutes from '../src/broadcast.js';
import engagementRoutes from '../src/routes/engagement.routes.js';
import supportRoutes from '../src/routes/support.routes.js';
import menuRoutes from '../src/routes/menu.routes.js';
import newsRoutes from '../src/routes/news.routes.js';
import settingsRoutes from '../src/routes/settings.routes.js';
import mediaRoutes from '../src/media.js';
import studioRoutes from '../src/routes/studio.routes.js';
import creatorRoutes from '../src/routes/creator.routes.js';
import serviceRoutes, { portal } from '../src/services/routes.js';
import managedRoutes from '../src/services/managed-bots.js';
import { MODULES, activeModules } from '../src/config.js';

/* Regression: a request that reached a mutating route with a missing, empty,
 * truncated or non-object JSON body used to blow up inside the handler —
 * `c.req.json()` threw SyntaxError and `.catch(() => ({}))` let a parsed `null`
 * through to a TypeError. Both escaped as HTTP 500 `internal_error`, and because
 * the panel renders any 500 as a red error toast, a single flaky request looked
 * like "the whole panel is down". Every such request must now be a clean 4xx with
 * a JSON error body, and the Worker must keep serving afterwards. */

const ADMIN_ROUTES = {
  auth: authRoutes, broadcast: broadcastRoutes, engagement: engagementRoutes,
  support: supportRoutes, menu: menuRoutes, news: newsRoutes, settings: settingsRoutes,
  media: mediaRoutes, studio: studioRoutes, creator: creatorRoutes,
  services: serviceRoutes, portal, bots: managedRoutes,
};
// Parameterised routes are probed with values that simply do not exist, so the
// handler runs its own 404/400 path. A few params must look plausible or the
// route rejects them before it ever reads the body.
const PARAM_VALUES = { action: 'approve', node: 'missingnode' };
function concretePath(prefix, path) {
  return '/api/' + prefix + (path === '/' ? '' : path.replace(/:([A-Za-z0-9_]+)/g, (_, name) => PARAM_VALUES[name] || 'missingid'));
}
function mutatingRoutes() {
  const found = new Set();
  for (const [name, app] of Object.entries(ADMIN_ROUTES)) {
    for (const route of app.routes) {
      if (route.method !== 'ALL' && !['POST', 'PUT', 'DELETE'].includes(route.method)) continue;
      if (route.path.includes('*')) continue; // catch-alls duplicate the concrete routes
      for (const method of route.method === 'ALL' ? ['POST', 'PUT', 'DELETE'] : [route.method]) {
        const entry = method + ' ' + concretePath(name, route.path);
        // Logging out mid-sweep kills the session every later assertion depends on and
        // silently turns the rest of the run into a wall of 401s. Covered separately.
        if (entry === 'POST /api/auth/logout') continue;
        found.add(entry);
      }
    }
  }
  return [...found].map((entry) => entry.split(' '));
}

const MALFORMED = [
  ['no body at all', undefined],
  ['empty body', ''],
  ['truncated json', '{"text":"unterminated'],
  ['plain text', 'not-json'],
  ['json null', 'null'],
  ['json string', '"a string"'],
  ['json number', '123'],
];

function storageAdapter() {
  const db = new DatabaseSync(':memory:'); let alarm = null;
  return {
    db,
    sql: { exec(sql, ...args) { const rows = db.prepare(sql).all(...args); return { toArray: () => rows }; } },
    transactionSync(fn) { db.exec('BEGIN IMMEDIATE'); try { const value = fn(); db.exec('COMMIT'); return value; } catch (e) { db.exec('ROLLBACK'); throw e; } },
    async getAlarm() { return alarm; }, async setAlarm(value) { alarm = value; },
  };
}

let env, coordinator, tg, token, storage;
const originalFetch = globalThis.fetch;
beforeEach(async () => {
  tg = telegramMock(); globalThis.fetch = tg.fetcher; storage = storageAdapter();
  const outer = { BOT_KV: new MemoryKV(), BOT_TOKEN: '123:TEST_TOKEN', WEBHOOK_SECRET: 'test-hook', TEST_MODE: true, VAULT_KEY: 'a-long-test-vault-key-over-32-characters' };
  outer.BOT_STATE = { idFromName: () => 'test', get: () => coordinator };
  coordinator = new BotCoordinator({ storage, waitUntil(p) { return p; } }, outer);
  env = coordinator.env;
  const login = await raw('POST', '/api/auth/login', JSON.stringify({ password: 'botpanel123' }), false);
  token = (await login.json()).data.token;
  await raw('POST', '/api/auth/change-password', JSON.stringify({ currentPassword: 'botpanel123', newPassword: 'malformed-body-test-password' }));
  // Every module must be switched on, otherwise the module guards answer 403 before a
  // handler runs and the sweep silently proves nothing about that route.
  const configured = await json(await raw('PUT', '/api/settings', JSON.stringify({
    botPurpose: 'custom', customModules: MODULES, botToken: '123:TEST_TOKEN', uploads: { chatId: '4242' },
  })));
  assert.equal(configured.status, 200, 'the sweep needs every module enabled');
  assert.deepEqual(activeModules(await (await import('../src/kv.js')).getSettings(env)).sort(), [...MODULES].sort());
});
afterEach(() => { globalThis.fetch = originalFetch; storage.db.close(); });

function raw(method, path, body, auth = true, headers = {}) {
  return coordinator.fetch(new Request('https://panel.example.com' + path, {
    method,
    headers: { 'content-type': 'application/json', ...(auth ? { authorization: 'Bearer ' + token } : {}), ...headers },
    ...(body === undefined ? {} : { body }),
  }));
}
const json = async (res) => ({ status: res.status, type: res.headers.get('content-type'), ...await res.json().catch(() => ({ ok: false, error: 'unparsable' })) });

test('no mutating route answers a malformed body with an unhandled 500', async () => {
  const routes = mutatingRoutes();
  assert.ok(routes.length > 90, 'the sweep should cover the whole mutating API, saw ' + routes.length);
  const failures = [];
  for (const [method, path] of routes) {
    for (const [label, body] of MALFORMED) {
      let res;
      try { res = await json(await raw(method, path, body)); } catch (e) { failures.push(`${method} ${path} <${label}> threw ${e.name}: ${e.message}`); continue; }
      // A 502 from a genuinely unreachable upstream is the handler's own verdict, not a
      // crash. What must never happen is an unhandled exception escaping as 500.
      if (res.status === 500 || res.error === 'internal_error') failures.push(`${method} ${path} <${label}> -> ${res.status} ${res.error}`);
      if (res.status >= 400 && res.ok !== false) failures.push(`${method} ${path} <${label}> -> ${res.status} without an error body`);
    }
  }
  assert.deepEqual(failures, []);
  // Guard against the sweep disabling itself part-way through: if the session died,
  // every remaining route would have answered 401 and proven nothing.
  const session = await json(await raw('GET', '/api/auth/session'));
  assert.equal(session.status, 200, 'the sweep lost its session; the results above are meaningless');
});

test('logout answers a malformed body without a 500', async () => {
  // Logout deliberately ignores its body, so any of these still ends the session;
  // the only requirement is that none of them becomes an unhandled error.
  for (const [, body] of MALFORMED) {
    const res = await json(await raw('POST', '/api/auth/logout', body));
    assert.ok(res.status < 500, `logout with <${body ?? 'no body'}> returned ${res.status}`);
    assert.notEqual(res.error, 'internal_error');
  }
});

test('a malformed body is reported as invalid_body, never as internal_error', async () => {
  for (const [method, path] of [['PUT', '/api/settings'], ['POST', '/api/broadcast'], ['POST', '/api/studio/products'], ['POST', '/api/menu/preview']]) {
    for (const body of ['null', '"a string"', '123']) {
      const res = await json(await raw(method, path, body));
      assert.equal(res.status, 400, `${method} ${path} <${body}> should be a 400`);
      assert.equal(res.error, 'invalid_body', `${method} ${path} <${body}> reported ${res.error}`);
    }
  }
});

test('a missing body behaves like an empty object instead of crashing the handler', async () => {
  const preview = await json(await raw('POST', '/api/menu/preview', undefined));
  assert.equal(preview.status, 400);
  assert.equal(preview.error, 'invalid_chat_id', 'the handler must run its own validation, saw ' + preview.error);
});

test('the panel keeps working after a burst of malformed requests', async () => {
  for (const [, path] of [['PUT', '/api/settings'], ['POST', '/api/broadcast'], ['POST', '/api/studio/products']]) {
    for (const [, body] of MALFORMED) await raw('PUT', path, body);
  }
  const health = await json(await raw('GET', '/api/health', undefined, false));
  assert.equal(health.status, 200);
  const settings = await json(await raw('GET', '/api/settings'));
  assert.equal(settings.status, 200);
  assert.equal(settings.ok, true);
  // A well-formed save still lands, proving nothing was left half-broken.
  const saved = await json(await raw('PUT', '/api/settings', JSON.stringify({ botLangMode: 'en' })));
  assert.equal(saved.status, 200);
  assert.equal(saved.data.settings.botLangMode, 'en');
});

test('login survives a dropped or malformed body without a 500', async () => {
  for (const body of [undefined, '', 'not-json', 'null', '123']) {
    const res = await json(await raw('POST', '/api/auth/login', body, false));
    assert.ok(res.status < 500, `login with <${body ?? 'no body'}> returned ${res.status}`);
    assert.equal(res.ok, false);
  }
});

test('the webhook and the public payment/subscription endpoints never answer with a bare 500', async () => {
  const hook = await coordinator.fetch(new Request('https://panel.example.com/telegram/webhook', {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-telegram-bot-api-secret-token': 'test-hook' }, body: 'not-json',
  }));
  assert.equal(hook.status, 400);
  for (const path of ['/pay/callback/0000000000000000', '/service-pay/missing', '/sub/missing', '/sub-all/missing']) {
    const res = await coordinator.fetch(new Request('https://panel.example.com' + path));
    assert.ok(res.status < 500, `${path} returned ${res.status}`);
  }
});

test('an unexpected handler failure still returns a JSON error instead of a workerd 500 page', async () => {
  const original = coordinator.environment;
  coordinator.environment = async () => { throw new Error('synthetic_isolate_fault'); };
  try {
    const res = await worker.fetch(new Request('https://panel.example.com/api/health'), env, { waitUntil(p) { return p; } });
    assert.equal(res.status, 500);
    assert.match(res.headers.get('content-type') || '', /application\/json/);
    const body = await res.json();
    assert.equal(body.ok, false);
    // A coded, status-bearing error keeps its own code and status instead of a bare 500.
    const coded = new Error('vault_decryption_failed'); coded.status = 503;
    coordinator.environment = async () => { throw coded; };
    const res2 = await worker.fetch(new Request('https://panel.example.com/api/settings'), env, { waitUntil(p) { return p; } });
    assert.equal(res2.status, 503);
    assert.equal((await res2.json()).error, 'vault_decryption_failed');
    // A raw JavaScript exception message must never be echoed to the client.
    coordinator.environment = async () => { throw new TypeError("Cannot read properties of null (reading 'id')"); };
    const leaked = await worker.fetch(new Request('https://panel.example.com/api/settings'), env, { waitUntil(p) { return p; } });
    assert.equal((await leaked.json()).error, 'internal_error');
  } finally {
    coordinator.environment = original;
  }
  const healthy = await json(await raw('GET', '/api/health', undefined, false));
  assert.equal(healthy.status, 200, 'the coordinator must recover for the next request');
});

/* When the Workers Free plan's daily allowance is spent, Cloudflare throws from the first
 * storage statement of every request (e.g. "Exceeded allowed rows read in Durable Objects
 * free tier") until 00:00 UTC. Both error boundaries — the coordinator wrapper and Hono's
 * onError — must surface that as a dedicated 503 code the panel can explain, not as the
 * bare `internal_error` that made the login form look broken. */
test('a spent Cloudflare free-tier allowance is reported as cloudflare_free_tier_limit, not internal_error', async () => {
  const original = coordinator.environment;
  const quota = new Error('Exceeded allowed rows read in Durable Objects free tier');
  coordinator.environment = async () => { throw quota; };
  try {
    const res = await raw('POST', '/api/auth/login', JSON.stringify({ password: 'malformed-body-test-password' }), false);
    assert.equal(res.status, 503);
    assert.equal((await res.json()).error, 'cloudflare_free_tier_limit');
  } finally {
    coordinator.environment = original;
  }
  // The same exception raised inside a route handler (Hono's error boundary).
  const get = env.BOT_KV.get.bind(env.BOT_KV);
  env.BOT_KV.get = async () => { throw quota; };
  try {
    const res = await raw('POST', '/api/auth/login', JSON.stringify({ password: 'malformed-body-test-password' }), false);
    assert.equal(res.status, 503);
    assert.equal((await res.json()).error, 'cloudflare_free_tier_limit');
  } finally {
    env.BOT_KV.get = get;
  }
  assert.equal((await raw('POST', '/api/auth/login', JSON.stringify({ password: 'malformed-body-test-password' }), false)).status, 200, 'the coordinator must recover for the next request');
});

test('a non-multipart upload body is rejected as invalid_form_body, not as a crash', async () => {
  const configured = await json(await raw('PUT', '/api/settings', JSON.stringify({ uploads: { chatId: '4242' } })));
  assert.equal(configured.status, 200);
  const res = await coordinator.fetch(new Request('https://panel.example.com/api/media', {
    method: 'POST',
    headers: { authorization: 'Bearer ' + token, 'content-type': 'multipart/form-data; boundary=xyz', 'content-length': '4' },
    body: 'oops',
  }));
  const body = await res.json();
  assert.ok(res.status < 500, 'upload with a broken multipart body returned ' + res.status);
  assert.equal(body.error, 'invalid_form_body');
});

test('the worker entry point only calls fetch on the Durable Object stub', () => {
  /* BotCoordinator is a plain class: it does not `extends DurableObject`, so invoking
   * any method other than `fetch` on its stub is a Durable Object RPC call, which
   * workerd rejects with a TypeError — an HTTP 500 on every route at once. The Node
   * test doubles hand back the instance itself, so only this check (and a real
   * `wrangler dev`) can catch such a regression. */
  const source = readFileSync(new URL('../src/index.js', import.meta.url), 'utf8');
  const methods = [...new Set([...source.matchAll(/stub\(env\)\.([A-Za-z_$][\w$]*)/g)].map((m) => m[1]))];
  assert.deepEqual(methods, ['fetch'], 'only fetch may be called through the stub, found: ' + methods.join(', '));
});

test('the sweep covers every concrete mutating route registered in the app', () => {
  const swept = new Set(mutatingRoutes().map(([m, p]) => m + ' ' + p));
  const registered = [];
  for (const [name, app] of Object.entries(ADMIN_ROUTES)) {
    for (const route of app.routes) {
      if (route.method !== 'ALL' && !['POST', 'PUT', 'DELETE'].includes(route.method)) continue;
      if (route.path.includes('*')) continue;
      for (const method of route.method === 'ALL' ? ['POST', 'PUT', 'DELETE'] : [route.method]) {
        const entry = method + ' ' + concretePath(name, route.path);
        if (entry === 'POST /api/auth/logout') continue; // covered by its own test
        registered.push(entry);
      }
    }
  }
  assert.ok(registered.length > 100, 'expected the whole mutating API, saw ' + registered.length);
  assert.deepEqual([...registered].filter((entry) => !swept.has(entry)), []);
});
