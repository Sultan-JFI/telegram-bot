import test, { beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { MemoryKV } from "./helpers.mjs";
import {
  savePanel,
  connector,
  prepareAccount,
  PROVIDERS,
  xuiLinks,
} from "../src/services/providers.js";
import { get, decimalUnits } from "../src/services/common.js";
let env, calls, handler;
const realFetch = globalThis.fetch;
beforeEach(() => {
  env = {
    BOT_KV: new MemoryKV(),
    VAULT_KEY: "test-vault-key-for-provider-contracts-123",
  };
  calls = [];
  handler = null;
  globalThis.fetch = async (url, options = {}) => {
    let data = {};
    if (options.body instanceof URLSearchParams)
      data = Object.fromEntries(options.body);
    else if (typeof options.body === "string") data = JSON.parse(options.body);
    const call = {
      url: String(url),
      path: new URL(url).pathname,
      method: options.method || "GET",
      headers: options.headers || {},
      data,
    };
    calls.push(call);
    const output = handler ? await handler(call) : undefined;
    if (output instanceof Response) return output;
    if (output !== undefined) return Response.json(output);
    if (call.path.endsWith("/token"))
      return Response.json({ access_token: "jwt" });
    if (call.path === "/login")
      return new Response('{"success":true}', {
        headers: { "set-cookie": "session=abc; HttpOnly; Secure; Path=/" },
      });
    return Response.json({ success: true, obj: [], status: true, data: {} });
  };
});
afterEach(() => (globalThis.fetch = realFetch));
async function api(type, options = {}) {
  const p = await savePanel(env, {
    title: type,
    type,
    url: "https://provider.example.org",
    secret: {
      username: "admin + test",
      password: "pass&word=1",
      token: [
        "marzban",
        "marzban_v1",
        "marzneshin",
        "xui",
        "alireza",
        "alireza_inbound",
        "ibsng",
      ].includes(type)
        ? ""
        : "api-key",
    },
    options,
  });
  return {
    p,
    c: await connector(env, p),
    a: prepareAccount(
      p,
      { volumeGB: 2, days: 30, options: {}, firstUse: false },
      "abcdef1234567890",
      42,
    ),
  };
}

test("registry advertises implemented provider families, not arbitrary methods", () => {
  for (const type of [
    "marzban",
    "marzban_v1",
    "marzneshin",
    "pasarguard",
    "xui",
    "xui_token",
    "alireza",
    "alireza_inbound",
    "sui",
    "hiddify",
    "wgdashboard",
    "mikrotik",
    "ibsng",
    "guard",
    "stock",
  ])
    assert(PROVIDERS[type]);
  assert(!PROVIDERS.ibsng.capabilities.includes("renew"));
  assert(!PROVIDERS.mikrotik.capabilities.includes("volume"));
});
for (const type of ["marzban", "marzban_v1", "marzneshin"])
  test(
    type + " creates users with its actual REST schema and encoded credentials",
    async () => {
      const { c, a } = await api(type, {
        serviceIds: [1],
        proxies: { vless: {} },
      });
      await c.create(a);
      const login = calls.find((x) => x.path.endsWith("/token"));
      assert.equal(login.data.password, "pass&word=1");
      assert.equal(login.data.username, "admin + test");
      const create = calls.at(-1);
      assert.equal(
        create.path,
        type === "marzneshin" ? "/api/users" : "/api/user",
      );
      assert.equal(create.data.username, a.username);
      assert.equal(create.data.data_limit, 2 * 1073741824);
      assert.equal(create.headers.authorization, "Bearer jwt");
      if (type === "marzban_v1") {
        assert(create.data.proxy_settings);
        assert.equal(typeof create.data.expire, "string");
      }
      if (type === "marzneshin") assert.deepEqual(create.data.service_ids, [1]);
    },
  );
test("pasarguard creates users with proxy_settings, group_ids and ISO expire", async () => {
  const { c, a } = await api("pasarguard", {
    serviceIds: [3],
    proxies: { vless: {} },
  });
  await c.create(a);
  const create = calls.at(-1);
  assert.equal(create.path, "/api/user");
  assert.equal(create.method, "POST");
  assert.equal(create.data.username, a.username);
  assert.equal(create.data.data_limit, 2 * 1073741824);
  assert(create.data.proxy_settings);
  assert.deepEqual(create.data.group_ids, [3]);
  assert.equal(typeof create.data.expire, "string");
  assert.equal(create.headers.authorization, "Bearer api-key");
  handler = (req) =>
    req.path === "/api/user/" + a.username
      ? {
          username: a.username,
          status: "active",
          used_traffic: 0,
          data_limit: a.dataLimit,
          expire: new Date(a.expiresAt * 1000).toISOString(),
          subscription_url: "https://provider.example.org/sub/abc",
          links: ["vless://x@y:443"],
        }
      : undefined;
  const remote = await c.get(a);
  assert.equal(remote.username, a.username);
  assert.equal(remote.status, "active");
  handler = (req) =>
    req.method === "DELETE" ? new Response(null, { status: 204 }) : undefined;
  await c.remove(a);
  assert.equal(calls.at(-1).path, "/api/user/" + a.username);
});
test("pasarguard rejects usernames outside its 3-32 lowercase rule", async () => {
  const { p } = await api("pasarguard");
  assert.throws(
    () =>
      prepareAccount(
        p,
        { volumeGB: 1, days: 30, options: {} },
        "abcdef1234567890",
        42,
        "Bad-Name!",
      ),
    /invalid_service_name/,
  );
  const ok = prepareAccount(
    p,
    { volumeGB: 1, days: 30, options: {} },
    "abcdef1234567890",
    42,
    "good_name_1",
  );
  assert.equal(ok.username, "good_name_1");
});
test("3x-ui cookie API uses addClient and keeps the login cookie server-side", async () => {
  const { c, a } = await api("xui", { inboundId: 7 });
  await c.create(a);
  const req = calls.at(-1);
  assert.equal(req.path, "/panel/api/inbounds/addClient");
  assert.equal(req.headers.cookie, "session=abc");
  assert.equal(req.data.id, 7);
  assert.equal(JSON.parse(req.data.settings).clients[0].id, a.uuid);
  assert.equal(
    JSON.stringify(await get(env, "login", c.panel.id)).includes("session=abc"),
    false,
  );
});
test("3x-ui token API sends client plus inboundIds and does not invent ownership proof", async () => {
  const { c, a } = await api("xui_token", { inboundId: 4 });
  await c.create(a);
  assert.equal(calls.at(-1).path, "/panel/api/clients/add");
  assert.deepEqual(calls.at(-1).data.inboundIds, [4]);
  handler = (req) =>
    req.path.includes("/traffic/")
      ? {
          success: true,
          obj: {
            email: a.username,
            total: a.dataLimit,
            expiryTime: a.expiresAt * 1000,
            up: 0,
            down: 0,
          },
        }
      : req.path.includes("/links/")
        ? {
            success: true,
            obj: ["vless://different-remote-uuid@node.example.org:443"],
          }
        : undefined;
  const remote = await c.get(a);
  assert.equal(remote.remoteId, "different-remote-uuid");
  assert.notEqual(remote.raw.client.id, a.uuid);
});
test("Alireza single uses /xui/API/inbounds rather than unrelated endpoints", async () => {
  const { c, a } = await api("alireza");
  await c.create(a);
  assert.equal(calls.at(-1).path, "/xui/API/inbounds/addClient");
});
test("Alireza separate-inbound mode allocates a free valid port and creates one inbound", async () => {
  const { c, a } = await api("alireza_inbound", {
    portMin: 42000,
    portMax: 42001,
  });
  handler = (req) =>
    req.path === "/xui/API/inbounds" && req.method === "GET"
      ? { success: true, obj: [{ port: 42000 }] }
      : undefined;
  await c.create(a);
  const request = calls.at(-1);
  assert.equal(request.path, "/xui/API/inbounds/add");
  assert.equal(request.data.port, 42001);
  assert.equal(request.data.total, a.dataLimit);
  assert.equal(JSON.parse(request.data.settings).clients.length, 1);
});
test("S-UI uses its Token header and form-encoded apiv2 save contract", async () => {
  const { c, a } = await api("sui", { inboundIds: [3, 4] });
  await c.create(a);
  const request = calls.at(-1);
  assert.equal(request.path, "/apiv2/save");
  assert.equal(request.headers.Token, "api-key");
  assert.equal(request.data.action, "new");
  const data = JSON.parse(request.data.data);
  assert.deepEqual(data.inbounds, [3, 4]);
  assert.equal(data.config.vless.uuid, a.uuid);
  assert.equal(data.volume, a.dataLimit);
});
test("Hiddify v2 uses its API key and GB/day model", async () => {
  const { c, a } = await api("hiddify", {
    subscriptionBase: "https://sub.example.org",
  });
  await c.create(a);
  const req = calls.at(-1);
  assert.equal(req.path, "/api/v2/admin/user/");
  assert.equal(req.headers["Hiddify-API-Key"], "api-key");
  assert.equal(req.data.usage_limit_GB, 2);
  assert.equal(req.data.package_days, 30);
  assert.equal(req.data.uuid, a.uuid);
});
test("Guard API creates subscriptions as a list and binds service IDs", async () => {
  const { c, a } = await api("guard", { serviceIds: [8] });
  await c.create(a);
  const req = calls.at(-1);
  assert.equal(req.path, "/api/subscriptions");
  assert.equal(req.headers["X-API-Key"], "api-key");
  assert.equal(req.data[0].limit_usage, a.dataLimit);
  assert.deepEqual(req.data[0].service_ids, [8]);
});
test("MikroTik uses TLS REST user-manager rather than executing RouterOS commands", async () => {
  const { c, a } = await api("mikrotik", { profile: "30days" });
  await c.create(a);
  assert.equal(calls.at(-1).method, "PUT");
  assert.equal(calls.at(-1).path, "/rest/user-manager/user");
  assert(calls.at(-1).headers.authorization.startsWith("Basic "));
  assert.equal(calls.at(-1).data.password, a.password);
});
test("IBSng web adapter handles login redirects and keeps allocated UID for safe completion", async () => {
  let assigned = false;
  handler = (req) => {
    if (req.path === "/IBSng/admin/")
      return new Response("", {
        status: 302,
        headers: {
          location: "/IBSng/admin/admin_index.php",
          "set-cookie": "PHPSESSID=ibs; Secure",
        },
      });
    if (req.path.endsWith("/add_new_users.php"))
      return new Response("", {
        status: 302,
        headers: {
          location: "/IBSng/admin/plugins/edit.php?user_id=77&submit_form=1",
        },
      });
    if (req.path.endsWith("/plugins/edit.php")) {
      assigned = true;
      return new Response("", {
        status: 302,
        headers: {
          location: "/IBSng/admin/user/user_info.php?user_id_multi=77",
        },
      });
    }
    if (req.path.endsWith("/user_info.php"))
      return new Response(
        assigned
          ? '<a href="change_credit.php?user_id=77">User</a>'
          : "does not exists",
      );
  };
  const { c, a } = await api("ibsng", { profile: "TestGroup" });
  await c.create(a);
  assert.equal(
    (await get(env, "provider-progress", a.operationId)).userId,
    "77",
  );
  assert.equal((await c.get(a)).remoteId, "77");
  assert.equal(
    calls.find((c) => c.path.endsWith("/plugins/edit.php")).data.password,
    a.password,
  );
  assert.equal(
    calls.filter((c) => c.path.endsWith("/add_new_users.php")).length,
    1,
  );
  await c.ibsCreate(a);
  assert.equal(
    calls.filter((c) => c.path.endsWith("/add_new_users.php")).length,
    1,
  );
});
test("WireGuard quota jobs are replaced with stable IDs and observed limits come from remote jobs", async () => {
  const { c, a } = await api("wgdashboard", { interface: "wg0" });
  const jobs = [];
  handler = (req) => {
    if (req.path.includes("getWireguardConfigurationInfo"))
      return {
        status: true,
        data: {
          configurationPeers: [
            {
              name: a.username,
              id: a.wgPublic,
              total_receive: 0,
              total_sent: 0,
              jobs: structuredClone(jobs),
            },
          ],
        },
      };
    if (req.path.endsWith("savePeerScheduleJob")) {
      jobs.push(req.data.Job);
      return { status: true };
    }
    if (req.path.endsWith("deletePeerScheduleJob")) {
      const i = jobs.findIndex((j) => j.JobID === req.data.Job.JobID);
      if (i >= 0) jobs.splice(i, 1);
      return { status: true };
    }
  };
  await c.wgLimits(a);
  assert.equal(jobs.length, 2);
  const ids = jobs.map((j) => j.JobID);
  const next = {
    ...a,
    dataLimit: 4 * 1073741824,
    expiresAt: a.expiresAt + 86400,
    operationId: "another-operation",
  };
  await c.wgLimits(next);
  assert.equal(jobs.length, 2);
  assert.deepEqual(
    jobs.map((j) => j.JobID),
    ids,
  );
  let remote = await c.get(a);
  assert.equal(remote.dataLimit, next.dataLimit);
  assert.equal(remote.expiresAt, next.expiresAt);
  await c.wgLimits({ ...next, dataLimit: 0, expiresAt: 0 });
  assert.equal(jobs.length, 0);
  remote = await c.get(a);
  assert.equal(remote.dataLimit, 0);
});
test("Reality links can derive a public key without exposing the server private key", () => {
  const privateKey = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
  const links = xuiLinks(
    {
      url: "https://panel.example.org",
      options: { publicHost: "node.example.org" },
    },
    {
      port: 443,
      protocol: "vless",
      streamSettings: JSON.stringify({
        network: "tcp",
        security: "reality",
        realitySettings: {
          privateKey,
          serverNames: ["example.org"],
          shortIds: ["ab"],
        },
      }),
    },
    { id: "user-uuid", email: "test" },
  );
  assert(links[0].includes("pbk="));
  assert(!links[0].includes(privateKey));
});
test("scientific notation from crypto gateway JSON is converted without float arithmetic", () => {
  assert.equal(decimalUnits(1e-7, 18), 100000000000n);
  assert.equal(decimalUnits("1.5e3", 2), 150000n);
  assert.throws(() => decimalUnits("1e999", 6));
});
