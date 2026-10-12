import test, { beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { MemoryKV } from "./helpers.mjs";
import { savePanel, connector, prepareAccount, publicPanel, PROVIDERS } from "../src/services/providers.js";
import { savePlan } from "../src/services/engine.js";
import { put, get } from "../src/services/common.js";
const originalFetch = globalThis.fetch;
const squad = "1fc895a1-282a-4277-875d-bb850263df2e";
let env, calls, handler;
beforeEach(() => {
  env = { BOT_KV: new MemoryKV(), VAULT_KEY: "modern-provider-vault-key-32-characters" };
  calls = [];
  handler = () => ({});
  globalThis.fetch = async (url, init) => {
    const call = { path: new URL(url).pathname, method: init.method, headers: init.headers,
      body: init.body ? JSON.parse(init.body) : undefined };
    calls.push(call);
    const out = await handler(call);
    return out instanceof Response ? out : Response.json(out);
  };
});
afterEach(() => { globalThis.fetch = originalFetch; });
async function setup(type) {
  const p = await savePanel(env, { type, title: type, url: "https://vpn.example.com",
    secret: { token: "private-token", accessClientId: "access-id", accessClientSecret: "access-secret" },
    options: type === "remnawave" ? { squadIds: [squad], hwidDeviceLimit: 3 } : { serviceId: 4, ipLimit: 2 },
  });
  const a = prepareAccount(p, { days: 30, volumeGB: 2 }, "1234567890abcdef", 42);
  return { p, a, api: await connector(env, p) };
}
function remote(type, a) {
  return type === "remnawave" ? { response: {
    id: 71, uuid: squad, username: a.username, description: `BotPanel ${a.operationId}`,
    status: "ACTIVE", expireAt: new Date(a.expiresAt * 1000).toISOString(),
    trafficLimitBytes: a.dataLimit, userTraffic: { usedTrafficBytes: 1234 },
    subscriptionUrl: "https://sub.example.com/s/secret",
  } } : { username: a.username, data_limit: a.dataLimit, used_traffic: 1234,
    expire: a.expiresAt, status: "active", note: `BotPanel ${a.operationId}`,
    subscription_url: "https://sub.example.com/s/secret" };
}
for (const type of ["remnawave", "rebecca"]) {
  test(`${type}: authenticated create/read/update/toggle/reset/revoke/delete contracts`, async () => {
    const { p, a, api } = await setup(type);
    assert(!JSON.stringify(publicPanel(p)).includes("private-token"));
    handler = (c) => c.method === "GET" ? remote(type, a) : {};
    await api.create(a);
    const created = calls.at(-1);
    assert.equal(created.headers.authorization, "Bearer private-token");
    assert.equal(created.headers["CF-Access-Client-Secret"], "access-secret");
    assert.equal(created.path, type === "remnawave" ? "/api/users" : "/api/v2/users");
    assert.equal(created.method, "POST");
    if (type === "remnawave") {
      assert.deepEqual(created.body.activeInternalSquads, [squad]);
      assert.equal(created.body.trafficLimitStrategy, "NO_RESET");
      assert.equal(created.body.hwidDeviceLimit, 3);
      assert.equal(created.body.vlessUuid, a.uuid);
    } else {
      assert.equal(created.body.service_id, 4);
      assert.equal(created.body.ip_limit, 2);
    }
    const r = await api.finishCreate(a);
    assert.equal(r.username, a.username);
    assert.equal(r.dataLimit, a.dataLimit);
    assert.equal(r.usedBytes, 1234);
    assert.equal(r.expiresAt, a.expiresAt);
    assert.equal(r.raw.note, `BotPanel ${a.operationId}`);
    const target = { dataLimit: a.dataLimit * 2, expiresAt: a.expiresAt + 86400 };
    await api.update(a, target);
    assert.equal(calls.at(-1).method, type === "remnawave" ? "PATCH" : "PUT");
    assert.equal(calls.at(-1).body[type === "remnawave" ? "trafficLimitBytes" : "data_limit"], target.dataLimit);
    await api.toggle(a, false);
    assert.equal(calls.at(-1).path, type === "remnawave" ? "/api/users/71/actions/disable" : `/api/v2/users/${a.username}`);
    await api.toggle(a, true);
    assert.equal(calls.at(-1).body?.status || calls.at(-1).path.endsWith("/enable"), type === "remnawave" ? true : "active");
    await api.reset(a);
    assert(calls.at(-1).path.endsWith(type === "remnawave" ? "/reset-traffic" : "/reset"));
    await api.revoke(a, "unused-new-uuid", "unused-sub-id");
    assert(calls.at(-1).path.endsWith(type === "remnawave" ? "/revoke" : "/revoke_sub"));
    await api.remove(a);
    assert.equal(calls.at(-1).method, "DELETE");
    assert.equal(calls.at(-1).path, type === "remnawave" ? "/api/users/71" : `/api/user/${a.username}`);
  });
  test(`${type}: only 404 is absence; unauthorized, HTML, wrong username and timeout fail closed`, async () => {
    const { api, a } = await setup(type);
    handler = () => new Response("missing", { status: 404 });
    assert.equal(await api.get(a), null);
    handler = () => new Response("bad token", { status: 401 });
    await assert.rejects(() => api.get(a), /provider_auth_failed/);
    handler = () => new Response("<html>Login</html>");
    // HTML must not be interpreted as a missing user, otherwise a create would be retried.
    await assert.rejects(() => api.get(a), /provider_invalid_response/);
    handler = () => remote(type, { ...a, username: "someone_else" });
    await assert.rejects(() => api.get(a), /provider_user_mismatch/);
    handler = () => { throw new Error("timeout"); };
    await assert.rejects(() => api.create(a), (e) => e.uncertain === true);
  });
}
test("Rebecca first-use and Remnawave capability/plan validation", async () => {
  const r = await setup("rebecca");
  r.a.firstUse = true;
  await r.api.create(r.a);
  assert.equal(calls.at(-1).body.on_hold_expire_duration, 30 * 86400);
  assert.equal(calls.at(-1).body.status, "on_hold");
  assert(!("expire" in calls.at(-1).body));
  await assert.rejects(() => r.api.nodes(), /panel_action_unsupported/);
  const { p, a, api } = await setup("remnawave");
  assert(!PROVIDERS.remnawave.capabilities.includes("first_use"));
  await assert.rejects(() => api.create({ ...a, firstUse: true }), /first_use_not_supported/);
  await assert.rejects(() => api.update(a, { dataLimit: 5, expiresAt: 0 }), /finite_expiry_required/);
  await assert.rejects(() => savePlan(env, { panelId: p.id, title: "Unlimited", days: 0, volumeGB: 2, price: 10 }), /finite_expiry_required/);
  assert.throws(() => prepareAccount(p, { days: 3, volumeGB: 1, options: { squadIds: ["1"] } }, "order", 42), /invalid_squad_ids/);
  assert.throws(() => prepareAccount(p, { days: 3, volumeGB: 1 }, "order", 42, "x".repeat(37)), /invalid_service_name/);
});
test("Remnawave resources and nodes use UUIDs, not numeric node indices", async () => {
  const { api } = await setup("remnawave");
  handler = () => ({ response: { nodes: [{ uuid: squad, name: "NL", isConnected: true }] } });
  assert.equal((await api.nodes())[0].id, squad);
  await api.reconnectNode(squad);
  assert.equal(calls.at(-1).path, `/api/nodes/${squad}/actions/restart`);
  await assert.rejects(() => api.reconnectNode("1"), /invalid_node_id/);
  await api.resources();
  assert.equal(calls.at(-1).path, "/api/internal-squads");
  await api.health();
  assert.equal(calls.at(-1).path, "/api/system/stats");
});
test("changing panel endpoint invalidates cached authentication, tokens stay encrypted", async () => {
  const { p } = await setup("remnawave");
  await put(env, "login", p.id, { credentials: "stale" });
  const saved = await savePanel(env, { ...publicPanel(p), url: "https://new.example.com" }, p);
  assert.equal(await get(env, "login", p.id), null);
  assert.equal(saved.credentials, p.credentials);
  await assert.rejects(() => savePanel(env, { type: "remnawave", title: "Bad", url: p.url, secret: { password: "wrong" } }), /panel_token_required/);
});

for (const type of ["remnawave", "rebecca"]) {
  test(`${type}: interrupted sale holds money, rejects foreign accounts and reconciles once`, async () => {
    const { setup: setupBot, telegramMock } = await import("./helpers.mjs");
    const { adjustWallet, account } = await import("../src/services/wallet.js");
    const { quote, purchase, processOperation, reconcileOperation } = await import("../src/services/engine.js");
    const tg = telegramMock();
    globalThis.fetch = tg.fetcher;
    const h = await setupBot();
    h.env.VAULT_KEY = env.VAULT_KEY;
    h.env.PUBLIC_BASE_URL = "https://panel.example.com";
    env = h.env;
    await h.msg(42, "/start");
    await adjustWallet(env, 42, 10000, "Test funding", "seed_42");
    const { p } = await setup(type);
    const plan = await savePlan(env, { title: "Modern VPN", panelId: p.id, days: 30, volumeGB: 2, price: 2500 });
    let created = 0, row;
    tg.setOverride((url, _m, body) => {
      if (!url.startsWith(p.url)) return;
      if (body.username) {
        created++;
        row = type === "remnawave" ? { ...body, id: 1, subscriptionUrl: "https://sub.example.com/secret" }
          : { ...body, subscription_url: "https://sub.example.com/secret", status: "active" };
        throw new Error("response lost after remote commit");
      }
      return row ? (type === "remnawave" ? { response: row } : row) : new Response("{}", { status: 404 });
    });
    const q = await quote(env, 42, { planId: plan.id });
    await purchase(env, 42, q.id);
    await processOperation(env, q.id);
    assert.equal((await get(env, "operation", q.id)).status, "review");
    assert.equal((await account(env, 42)).held, 2500);
    const markerField = type === "remnawave" ? "description" : "note";
    const marker = row[markerField];
    row[markerField] = "another application's account";
    await assert.rejects(() => reconcileOperation(env, q.id), /remote_creation_not_confirmed/);
    assert.equal((await account(env, 42)).balance, 10000);
    row[markerField] = marker;
    await reconcileOperation(env, q.id);
    assert.equal((await get(env, "operation", q.id)).status, "done");
    assert.equal((await account(env, 42)).held, 0);
    assert.equal((await account(env, 42)).balance, 7500);
    await processOperation(env, q.id);
    assert.equal(created, 1);
    assert.equal((await account(env, 42)).balance, 7500);
  });
}
