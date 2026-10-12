// LOCAL ONLY: exercises the real Durable Object/SQLite runtime, not remote providers.
// Start: npx wrangler dev --local --ip 0.0.0.0 --var VAULT_KEY:<local-test-key-32-chars>
import assert from "node:assert/strict";
const base = process.env.E2E_BASE_URL || "http://127.0.0.1:8787";
assert(["127.0.0.1", "localhost", "[::1]"].includes(new URL(base).hostname), "Never run fixture writes against production");
let token;
async function call(method, path, body, expected = 200) {
  const r = await fetch(base + "/api" + path, {
    method, headers: { "content-type": "application/json", ...(token ? { authorization: "Bearer " + token } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = await r.json();
  assert.equal(r.status, expected, path + ": " + JSON.stringify(data));
  return data.data;
}
const health = await call("GET", "/health");
assert(health.durable);
await call("GET", "/services/bootstrap", undefined, 401);
const status = await call("GET", "/auth/default-status");
const password = process.env.E2E_ADMIN_PASSWORD || "e2e-local-private-password-2026";
const login = await call("POST", "/auth/login", { password: status.defaultActive ? "botpanel123" : password });
token = login.token;
if (login.requiresPasswordChange) await call("POST", "/auth/change-password", { currentPassword: "botpanel123", newPassword: password });
const original = (await call("GET", "/settings")).settings;
const fixtures = [];
try {
  await call("PUT", "/settings", { botPurpose: "vpn" });
  const meta = await call("GET", "/services/bootstrap");
  assert(meta.ready.vault, "Set VAULT_KEY in local Wrangler environment");
  for (const type of ["remnawave", "rebecca"]) {
    assert(meta.providers[type]);
    const { panel } = await call("POST", "/services/panels", {
      title: "Local test " + type, type, url: "https://provider.example.com", enabled: false,
      secret: { token: "fake-local-api-token" },
      options: type === "remnawave" ? { squadIds: ["1fc895a1-282a-4277-875d-bb850263df2e"] } : { serviceId: 2 },
    });
    fixtures.push(["panels", panel]);
    assert(panel.hasCredentials && !panel.credentials);
    const { plan } = await call("POST", "/services/plans", {
      title: "Local plan", panelId: panel.id, price: 1000, days: 30, volumeGB: 5, enabled: false,
    });
    fixtures.push(["plans", plan]);
    const saved = (await call("GET", "/services/panels")).rows.find(p => p.id === panel.id);
    assert.deepEqual(saved.options, panel.options);
    if (type === "remnawave") await call("POST", "/services/plans", { ...plan, days: 0 }, 400);
  }
  for (const type of ["tonpay", "blupal", "cubepay", "tronado"]) {
    assert(meta.gateways[type]);
    const { row } = await call("POST", "/services/gateways", {
      title: "Local test " + type, type, enabled: false,
      address: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
      secret: { apiKey: "fake-local-api-key", ipnSecret: "fake-local-signing-key" },
    });
    fixtures.push(["gateways", row]);
    assert(row.configured && !row.secret);
  }
  assert.equal((await fetch(base + "/portal/")).status, 200);
  const js = await (await fetch(base + "/services.js")).text();
  assert(js.includes("sv-squads") && js.includes("sg-wage"));
  console.log("PASS: local Workerd/SQLite auth, metadata, encrypted provider/gateway registration, plans and portal assets");
} finally {
  // The public fixtures are disabled and contain no real credentials or customer data.
  for (const [collection, row] of fixtures)
    if (row) await call("PUT", `/services/${collection}/${row.id}`, { ...row, enabled: false });
  await call("PUT", "/settings", original);
}
