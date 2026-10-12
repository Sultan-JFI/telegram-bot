import test, { beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import worker from "../src/index.js";
import { MemoryKV } from "./helpers.mjs";
import { makeTag, readTag, creatorKeys, repoUrl, ownerId, isLocalBase } from "../src/creator.js";

const OWNER = ownerId();
const oldFetch = globalThis.fetch;

function makePanel(base) {
  const env = {
    BOT_KV: new MemoryKV(),
    TEST_MODE: true,
    WEBHOOK_SECRET: "test-webhook-secret",
    BOT_TOKEN: "123:TEST_TOKEN",
    APP_VERSION: "3.2.0",
    PUBLIC_BASE_URL: base,
  };
  const ctx = { waitUntil(p) { return p; } };
  const raw = (method, path, { body, token, headers = {}, rawBody = false } = {}) => {
    const h = { ...headers };
    if (token) h.authorization = "Bearer " + token;
    if (body !== undefined && !rawBody) h["content-type"] = "application/json";
    return worker.fetch(new Request(base + path, {
      method,
      headers: h,
      body: rawBody ? body : body === undefined ? undefined : JSON.stringify(body),
    }), env, ctx);
  };
  const login = async () => {
    const res = await raw("POST", "/api/auth/login", { body: { password: "botpanel123" } });
    const j = await res.json();
    if (j.data.requiresPasswordChange) {
      await raw("POST", "/api/auth/change-password", {
        token: j.data.token,
        body: { currentPassword: "botpanel123", newPassword: "unit-test-private-password" },
      });
    }
    return j.data.token;
  };
  return { env, ctx, raw, base, login };
}

let panels, tg;
function makeFetch() {
  return async (url, options = {}) => {
    const u = String(url);
    if (u.startsWith("https://api.telegram.org/")) {
      const method = u.split("/").at(-1);
      const payload = options.body ? JSON.parse(options.body) : {};
      tg.calls.push({ method, payload });
      if (method === "getWebhookInfo") return Response.json({ ok: true, result: { url: tg.webhookUrl } });
      if (method === "setWebhook") { tg.webhookUrl = payload.url; return Response.json({ ok: true, result: true }); }
      if (method === "sendMessage") {
        const id = tg.messages.length + 1;
        tg.messages.push({ message_id: id, chat_id: payload.chat_id, text: payload.text });
        return Response.json({ ok: true, result: { message_id: id, chat: { id: payload.chat_id } } });
      }
      return Response.json({ ok: true, result: {} });
    }
    for (const p of Object.values(panels)) {
      if (u.startsWith(p.base)) {
        const path = u.slice(p.base.length);
        return p.raw("POST", path, {
          body: options.body,
          headers: options.headers ? Object.fromEntries(new Headers(options.headers).entries()) : {},
          rawBody: true,
        });
      }
    }
    throw new Error("Unexpected fetch: " + u);
  };
}

beforeEach(() => {
  panels = {};
  tg = { webhookUrl: "", calls: [], messages: [] };
});
afterEach(() => (globalThis.fetch = oldFetch));

const stateOf = async (panel, token) => (await (await panel.raw("GET", "/api/creator/state", { token })).json()).data;

test("routing tag is encrypted and round-trips back to the panel address", async () => {
  const base = "https://panel-x.example.com";
  const tag = await makeTag(base);
  assert.ok(tag.length > 0);
  assert.equal(tag.includes("https"), false, "the tag must not leak the address in plaintext");
  assert.equal(tag.includes("panel-x"), false);
  assert.equal(await readTag(tag), base);
  assert.equal(isLocalBase("http://localhost:8787"), true);
  assert.equal(isLocalBase("https://panel-x.example.com"), false);
});

test("the first state check sets the webhook (hub) and never sets it on localhost", async () => {
  const hub = makePanel("https://hub.example.com");
  panels.hub = hub;
  globalThis.fetch = makeFetch();
  const token = await hub.login();
  const state = await stateOf(hub, token);
  assert.equal(state.link.hub, true);
  assert.ok(tg.webhookUrl.startsWith("https://hub.example.com/cr-hook/"), "webhook is set on the worker");
  const setCall = tg.calls.find((c) => c.method === "setWebhook");
  assert.ok(setCall, "setWebhook was called");
  assert.ok(setCall.payload.secret_token && setCall.payload.secret_token.length >= 32, "webhook header secret is configured");

  const local = makePanel("http://localhost:8787");
  panels.local = local;
  const before = tg.calls.filter((c) => c.method === "setWebhook").length;
  const ltoken = await local.login();
  const lstate = await stateOf(local, ltoken);
  assert.equal(lstate.link.local, true, "localhost is detected as local");
  assert.equal(tg.calls.filter((c) => c.method === "setWebhook").length, before, "no webhook is set on localhost");
});

test("creator state requires authentication", async () => {
  const panel = makePanel("https://hub2.example.com");
  panels.p = panel;
  globalThis.fetch = makeFetch();
  const res = await panel.raw("GET", "/api/creator/state");
  assert.equal(res.status, 401);
});

test("hub relays a broadcast update to registered panels only", async () => {
  const hub = makePanel("https://hub.example.com");
  const b = makePanel("https://panel-b.example.com");
  const c = makePanel("https://panel-c.example.com");
  panels = { hub, b, c };
  globalThis.fetch = makeFetch();

  const [hubTok, bTok, cTok] = await Promise.all([hub.login(), b.login(), c.login()]);
  await stateOf(hub, hubTok); // hub claims the webhook
  await stateOf(b, bTok); // b registers with the hub
  await stateOf(c, cTok); // c registers too

  const k = await creatorKeys();
  await hub.raw("POST", `/cr-hook/${k.hookSeg}`, {
    body: { message: { message_id: 8, chat: { id: Number(OWNER) }, from: { id: Number(OWNER) }, text: "📣 پیام کوتاه به پنل" } },
    headers: { "x-telegram-bot-api-secret-token": k.hookSecret },
  });
  await hub.raw("POST", `/cr-hook/${k.hookSeg}`, {
    body: { message: { message_id: 6, chat: { id: Number(OWNER) }, from: { id: Number(OWNER) }, text: "🆕 پیام به‌روزرسانی" } },
    headers: { "x-telegram-bot-api-secret-token": k.hookSecret },
  });
  const update = {
    message: { message_id: 7, chat: { id: Number(OWNER), type: "private" }, from: { id: Number(OWNER), first_name: "Creator" }, text: "نسخه جدید منتشر شد" },
  };
  const res = await hub.raw("POST", `/cr-hook/${k.hookSeg}`, {
    body: update,
    headers: { "x-telegram-bot-api-secret-token": k.hookSecret },
  });
  assert.equal(res.status, 200, "the webhook accepts a signed creator message");

  const [hs, bs, cs] = await Promise.all([stateOf(hub, hubTok), stateOf(b, bTok), stateOf(c, cTok)]);
  assert.equal(hs.update && hs.update.text, "نسخه جدید منتشر شد", "the hub stores the update");
  assert.equal(bs.update && bs.update.text, "نسخه جدید منتشر شد", "panel b receives the update via relay");
  assert.equal(cs.update && cs.update.text, "نسخه جدید منتشر شد", "panel c receives the update via relay");
  assert.equal(repoUrl().startsWith("https://github.com/"), true, "the repo is exposed for the update button");
  assert.equal(repoUrl(), "https://github.com/developerAmira/telegram-bot", "the update button points at the public repository");
});

test("a creator reply is delivered only to the panel that sent the message", async () => {
  const hub = makePanel("https://hub.example.com");
  const b = makePanel("https://panel-b.example.com");
  const c = makePanel("https://panel-c.example.com");
  panels = { hub, b, c };
  globalThis.fetch = makeFetch();

  const [hubTok, bTok, cTok] = await Promise.all([hub.login(), b.login(), c.login()]);
  await stateOf(hub, hubTok);
  await stateOf(b, bTok);
  await stateOf(c, cTok);

  await b.raw("POST", "/api/creator/support", { token: bTok, body: { text: "سلام از پنل B" } });

  const sent = tg.messages.find((m) => String(m.chat_id) === OWNER && m.text.includes("سلام از پنل B"));
  assert.ok(sent, "the support message reaches the creator chat");
  assert.equal(sent.text, "سلام از پنل B", "routing metadata must not appear in the message");

  const k = await creatorKeys();
  const reply = {
    message: {
      message_id: 8,
      chat: { id: Number(OWNER), type: "private" },
      from: { id: Number(OWNER), first_name: "Creator" },
      text: "پاسخ سازنده برای شما",
      reply_to_message: { message_id: sent.message_id, text: sent.text },
    },
  };
  await hub.raw("POST", `/cr-hook/${k.hookSeg}`, {
    body: reply,
    headers: { "x-telegram-bot-api-secret-token": k.hookSecret },
  });

  const [bs, cs] = await Promise.all([stateOf(b, bTok), stateOf(c, cTok)]);
  assert.ok(bs.thread.some((m) => m.dir === "in" && m.text === "پاسخ سازنده برای شما"), "the reply reaches panel b");
  assert.equal(bs.unread, 1, "the reply counts as unread on panel b");
  assert.equal(cs.thread.length, 0, "panel c receives nothing");
  assert.equal(cs.unread, 0, "panel c has no unread");
});

test("dismiss persists server-side and read clears the unread count", async () => {
  const hub = makePanel("https://hub.example.com");
  const b = makePanel("https://panel-b.example.com");
  panels = { hub, b };
  globalThis.fetch = makeFetch();

  const [hubTok, bTok] = await Promise.all([hub.login(), b.login()]);
  await stateOf(hub, hubTok);
  await stateOf(b, bTok);

  await b.raw("POST", "/api/creator/support", { token: bTok, body: { text: "سلام" } });
  const sent = tg.messages.find((m) => String(m.chat_id) === OWNER);
  const k = await creatorKeys();
  await hub.raw("POST", `/cr-hook/${k.hookSeg}`, {
    body: { message: { message_id: 8, chat: { id: Number(OWNER) }, from: { id: Number(OWNER) }, text: "📣 پیام کوتاه به پنل" } },
    headers: { "x-telegram-bot-api-secret-token": k.hookSecret },
  });
  await hub.raw("POST", `/cr-hook/${k.hookSeg}`, {
    body: { message: { message_id: 9, chat: { id: Number(OWNER), type: "private" }, from: { id: Number(OWNER) }, text: "جواب" } },
    headers: { "x-telegram-bot-api-secret-token": k.hookSecret },
  });

  const before = await stateOf(b, bTok);
  assert.equal(before.notice && before.notice.id, "9", "an explicitly composed notice is stored");

  const dismissed = (await (await b.raw("POST", "/api/creator/dismiss", { token: bTok, body: { kind: "notice" } })).json()).data;
  assert.equal(dismissed.dismiss.notice, "9", "dismissal is stored on the server");

  const afterRead = (await (await b.raw("POST", "/api/creator/read", { token: bTok })).json()).data;
  assert.equal(afterRead.unread, 0, "read resets the unread counter");
});

test("start shows owner controls; ordinary messages and unrelated replies never publish", async () => {
  const hub = makePanel('https://hub.example.com');
  panels = { hub }; globalThis.fetch = makeFetch();
  const token = await hub.login(); await stateOf(hub, token);
  const k = await creatorKeys();
  const send = (text, extra = {}, from = OWNER) => hub.raw('POST', `/cr-hook/${k.hookSeg}`, {
    body: { message: { message_id: 90, chat: { id: Number(from) }, from: { id: Number(from) }, text, ...extra } },
    headers: { 'x-telegram-bot-api-secret-token': k.hookSecret },
  });
  await send('/start');
  const menu = tg.calls.at(-1).payload.reply_markup.keyboard.flat();
  assert.ok(menu.includes('🆕 پیام به‌روزرسانی'));
  assert.ok(menu.includes('📣 پیام کوتاه به پنل'));
  await send('پاسخ بدون ریپلای');
  await send('🆕 متن عادی');
  await send('جواب', { reply_to_message: { message_id: 999, text: 'ناشناخته' } });
  await send('📣 پیام کوتاه به پنل'); await send('❌ لغو'); await send('نباید منتشر شود');
  const before = tg.calls.length;
  await send('/start', {}, '12345');
  assert.equal(tg.calls.length, before);
  const state = await stateOf(hub, token);
  assert.equal(state.notice, null); assert.equal(state.update, null);
  assert.equal(state.thread.length, 0);
});
