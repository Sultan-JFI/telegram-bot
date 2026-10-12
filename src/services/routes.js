import { refreshMarketRates } from "./rates.js";
import { playDice } from "./engagement.js";
import { Hono } from "hono";
import { requireAuth } from "../auth.js";
import {
  getUser,
  getSettings,
  getTicket,
  putTicket,
  ticketAppendUser,
} from "../kv.js";
import { enabled } from "../config.js";
import { tgApi, resolveToken } from "../bot-api.js";
import { fileResponse } from "../media.js";
import {
  get,
  put,
  key,
  list,
  assert,
  str,
  integer,
  hash,
  limited,
  randomToken,
  unseal,
  audit,
} from "./common.js";
import {
  serviceSettings,
  saveServiceSettings,
  publicSettings,
} from "./settings.js";
import { PROVIDERS, publicPanel, savePanel, connector } from "./providers.js";
import {
  account,
  available,
  adjustWallet,
  updateAccount,
  saveGift,
  redeemGift,
  requestAgent,
  decideAgent,
  spinWheel,
  createRaffle,
  enterRaffle,
} from "./wallet.js";
import {
  catalogue,
  savePlan,
  saveCoupon,
  createShelf,
  importStock,
  quote,
  purchase,
  ownedService,
  serviceContent,
  simpleServiceAction,
  decideServiceRequest,
  synchronize,
  processOperation,
  reconcileOperation,
  cancelOperation,
  operationView,
  manualStockSale,
} from "./engine.js";
import {
  GATEWAYS,
  gatewayView,
  saveGateway,
  createPayment,
  paymentView,
  verifyPayment,
  attachHash,
  attachReceipt,
  decideReceipt,
} from "./payments.js";
import {
  requireCustomer,
  requireAccess,
  portalLogin,
  portalTicket,
  customerGate,
  acceptRules,
} from "./customer-auth.js";
import {
  qrSVG,
  usageCard,
  financeReport,
  csv,
  xlsx,
  exportBackup,
  restoreBackup,
} from "./reports.js";
import { readJson, readForm } from "../body.js";

const result = (c, data) => c.json({ ok: true, data });
const body = (c) => readJson(c);
function paged(c, rows) {
  const offset = integer(c.req.query("offset") || 0, 0, 10000000),
    limit = integer(c.req.query("limit") || 50, 1, 500);
  return {
    rows: rows.slice(offset, offset + limit),
    total: rows.length,
    nextOffset: offset + limit < rows.length ? offset + limit : null,
  };
}
const recent = (rows, field = "createdAt") =>
  rows.sort((a, b) => (b[field] || 0) - (a[field] || 0));
export async function serviceView(env, s) {
  const p = await get(env, "panel", s.panelId);
  return {
    id: s.id,
    userId: s.userId,
    title: s.title,
    username: s.username,
    planId: s.planId,
    panelId: s.panelId,
    panelTitle: p?.title,
    provider: p?.type,
    location: p?.location,
    status: s.status,
    dataLimit: s.dataLimit,
    usedBytes: s.usedBytes,
    expiresAt: s.expiresAt,
    createdAt: s.createdAt,
    lastSyncAt: s.lastSyncAt,
    lastSyncError: s.lastSyncError || "",
    trial: s.trial,
    paidTotal: s.paidTotal,
    note: s.note,
    usageAvailable: !["stock", "mikrotik", "ibsng"].includes(p?.type),
    deliveryState: s.deliveryState,
    capabilities: PROVIDERS[p?.type]?.capabilities || [],
  };
}
const admin = new Hono();
admin.use("*", requireAuth);
admin.use("*", async (c, next) => {
  assert(enabled(await getSettings(c.env), "services"), "module_disabled", 403);
  await next();
});
// Counting every record scans the whole store, so the result is briefly memoised and
// the panel skips it entirely for tabs that only need provider metadata.
let countsCache = { at: 0, value: null };
async function serviceCounts(env) {
  if (countsCache.value && Date.now() - countsCache.at < 5000)
    return countsCache.value;
  const types = [
    "panel",
    "plan",
    "service",
    "operation",
    "account",
    "payment",
    "stock",
    "request",
  ];
  const data = Object.fromEntries(
    await Promise.all(types.map(async (t) => [t, await list(env, t)])),
  );
  const value = {
    panels: data.panel.length,
    plans: data.plan.length,
    services: data.service.length,
    pending: data.operation.filter((o) =>
      ["queued", "sending", "review"].includes(o.status),
    ).length,
    receipts: data.payment.filter((p) => p.status === "receipt_review").length,
    stock: data.stock.filter((s) => s.status === "available").length,
    requests: data.request.filter((r) => r.status === "pending").length,
    wallets: data.account.length,
  };
  countsCache = { at: Date.now(), value };
  return value;
}
admin.get("/bootstrap", async (c) => {
  const withCounts = c.req.query("counts") !== "0";
  return result(c, {
    settings: await serviceSettings(c.env),
    providers: PROVIDERS,
    gateways: GATEWAYS,
    ready: {
      vault: !!c.env.VAULT_KEY,
      backup: !!c.env.BACKUPS && !!c.env.BACKUP_PASSWORD,
    },
    counts: withCounts
      ? await serviceCounts(c.env)
      : {
          panels: 0,
          plans: 0,
          services: 0,
          pending: 0,
          receipts: 0,
          stock: 0,
          requests: 0,
          wallets: 0,
        },
    source: {
      repository: "Mmd-Amir/Faoxima",
      commit: "015d970120df6e279546efee4ef2759df520c091",
      runtime: "Cloudflare Workers + Durable Objects SQLite",
    },
  });
});
admin.get("/rates", async (c) =>
  result(c, {
    config: (await serviceSettings(c.env)).rates,
    snapshot: await get(c.env, "market", "latest"),
  }),
);
admin.post("/rates/refresh", async (c) => {
  await limited(c.env, "admin-rate-refresh", 5, 60);
  return result(c, { snapshot: await refreshMarketRates(c.env) });
});
admin.get("/settings", async (c) =>
  result(c, { settings: await serviceSettings(c.env) }),
);
admin.put("/settings", async (c) =>
  result(c, { settings: await saveServiceSettings(c.env, await body(c)) }),
);
admin.get("/panels", async (c) =>
  result(c, { rows: (await list(c.env, "panel")).map(publicPanel) }),
);
admin.post("/panels", async (c) =>
  result(c, { panel: publicPanel(await savePanel(c.env, await body(c))) }),
);
admin.put("/panels/:id", async (c) => {
  const p = await get(c.env, "panel", c.req.param("id"));
  assert(p, "panel_not_found", 404);
  return result(c, {
    panel: publicPanel(await savePanel(c.env, await body(c), p)),
  });
});
admin.delete("/panels/:id", async (c) => {
  const id = c.req.param("id");
  assert(
    !(await list(c.env, "service")).some((s) => s.panelId === id),
    "panel_has_services",
  );
  assert(
    !(await list(c.env, "plan")).some((p) => p.panelId === id),
    "panel_has_plans",
  );
  await c.env.BOT_KV.delete(key("panel", id));
  return result(c, {});
});
admin.post("/panels/:id/test", async (c) => {
  const p = await get(c.env, "panel", c.req.param("id"));
  assert(p, "panel_not_found");
  try {
    const api = await connector(c.env, p),
      health = await api.health();
    p.health = { ok: true, ms: health.ms || 0, at: Date.now() };
    await put(c.env, "panel", p.id, p);
    return result(c, { health: p.health });
  } catch (e) {
    p.health = { ok: false, error: e.message, at: Date.now() };
    await put(c.env, "panel", p.id, p);
    return result(c, { health: p.health });
  }
});
admin.get("/panels/:id/resources", async (c) => {
  const p = await get(c.env, "panel", c.req.param("id"));
  assert(p, "panel_not_found");
  return result(c, {
    resources: await (await connector(c.env, p)).resources(),
  });
});
admin.get("/panels/:id/nodes", async (c) => {
  const p = await get(c.env, "panel", c.req.param("id"));
  assert(p, "panel_not_found");
  return result(c, { nodes: await (await connector(c.env, p)).nodes() });
});
admin.post("/panels/:id/nodes/:node/reconnect", async (c) => {
  const p = await get(c.env, "panel", c.req.param("id"));
  assert(p, "panel_not_found");
  return result(c, {
    response: await (
      await connector(c.env, p)
    ).reconnectNode(c.req.param("node")),
  });
});
admin.get("/plans", async (c) =>
  result(c, { rows: recent(await list(c.env, "plan")) }),
);
admin.post("/plans", async (c) =>
  result(c, { plan: await savePlan(c.env, await body(c)) }),
);
admin.put("/plans/:id", async (c) => {
  const p = await get(c.env, "plan", c.req.param("id"));
  assert(p, "plan_not_found");
  return result(c, { plan: await savePlan(c.env, await body(c), p) });
});
admin.delete("/plans/:id", async (c) => {
  const p = await get(c.env, "plan", c.req.param("id"));
  assert(p, "plan_not_found");
  p.enabled = false;
  await put(c.env, "plan", p.id, p);
  return result(c, {});
});
admin.get("/shelves", async (c) =>
  result(c, { rows: await list(c.env, "shelf") }),
);
admin.post("/shelves", async (c) =>
  result(c, { shelf: await createShelf(c.env, await body(c)) }),
);
admin.get("/stock", async (c) => {
  let rows = recent(await list(c.env, "stock"));
  if (c.req.query("shelf"))
    rows = rows.filter((r) => r.shelfId === c.req.query("shelf"));
  return result(
    c,
    paged(
      c,
      rows.map(({ content, ...row }) => row),
    ),
  );
});
admin.post("/stock/import", async (c) => {
  const b = await body(c);
  return result(c, await importStock(c.env, b.shelfId, b.items));
});
admin.post("/stock/manual-sale", async (c) =>
  result(c, await manualStockSale(c.env, await body(c))),
);
admin.post("/stock/:id/disable", async (c) => {
  const r = await get(c.env, "stock", c.req.param("id"));
  assert(
    r && ["available", "disabled"].includes(r.status),
    "stock_not_available",
  );
  r.status = r.status === "available" ? "disabled" : "available";
  await put(c.env, "stock", r.id, r);
  return result(c, {});
});
admin.get("/stock/:id/content", async (c) => {
  const r = await get(c.env, "stock", c.req.param("id"));
  assert(r, "stock_not_found");
  return result(c, await unseal(c.env, r.content));
});
admin.get("/services", async (c) =>
  result(
    c,
    paged(
      c,
      await Promise.all(
        recent(await list(c.env, "service")).map((s) => serviceView(c.env, s)),
      ),
    ),
  ),
);
admin.post("/services/:id/sync", async (c) =>
  result(c, {
    service: await serviceView(
      c.env,
      await synchronize(c.env, c.req.param("id")),
    ),
  }),
);
admin.get("/services/:id/content", async (c) => {
  const s = await get(c.env, "service", c.req.param("id"));
  assert(s, "service_not_found");
  return result(c, await serviceContent(c.env, s.userId, s.id));
});
admin.post("/services/:id/reset", async (c) => {
  const s = await get(c.env, "service", c.req.param("id"));
  assert(s, "service_not_found");
  const p = await get(c.env, "panel", s.panelId);
  await (await connector(c.env, p)).reset(s.remoteAccount);
  await audit(c.env, "admin_reset_usage", { serviceId: s.id });
  return result(c, {
    service: await serviceView(c.env, await synchronize(c.env, s.id)),
  });
});
admin.get("/operations", async (c) =>
  result(
    c,
    paged(c, recent(await list(c.env, "operation")).map(operationView)),
  ),
);
admin.post("/operations/:id/run", async (c) => {
  // processOperation hands back null for an id that no longer exists (an operation
  // that expired or was released while the panel was open). Passing that to
  // operationView used to throw a TypeError and answer HTTP 500.
  const operation = await processOperation(c.env, c.req.param("id"));
  assert(operation, "operation_not_found", 404);
  return result(c, { operation: operationView(operation) });
});
admin.post("/operations/:id/reconcile", async (c) =>
  result(c, { operation: await reconcileOperation(c.env, c.req.param("id")) }),
);
admin.post("/operations/:id/cancel", async (c) =>
  result(c, {
    operation: await cancelOperation(c.env, "", c.req.param("id"), true),
  }),
);
admin.get("/accounts", async (c) => {
  const rows = await Promise.all(
    recent(await list(c.env, "account")).map(async (a) => ({
      ...a,
      name: (await getUser(c.env, a.userId))?.firstName || a.userId,
      available: available(a),
    })),
  );
  return result(c, paged(c, rows));
});
admin.get("/accounts/:id", async (c) =>
  result(c, {
    account: await account(c.env, c.req.param("id")),
    ledger: recent(
      (await list(c.env, "ledger")).filter(
        (e) => e.userId === c.req.param("id"),
      ),
      "at",
    ).slice(0, 100),
  }),
);
admin.put("/accounts/:id", async (c) =>
  result(c, {
    account: await updateAccount(c.env, c.req.param("id"), await body(c)),
  }),
);
admin.post("/accounts/:id/adjust", async (c) => {
  const b = await body(c);
  assert(
    /^[A-Za-z0-9_-]{8,80}$/.test(b.requestId || ""),
    "idempotency_key_required",
  );
  return result(c, {
    account: await adjustWallet(
      c.env,
      c.req.param("id"),
      b.amount,
      b.reason,
      b.requestId,
    ),
  });
});
admin.get("/requests", async (c) =>
  result(c, {
    rows: recent(await list(c.env, "request")),
    agents: recent(await list(c.env, "agent-request")),
  }),
);
admin.post("/requests/:id/decide", async (c) =>
  result(c, {
    request: await decideServiceRequest(
      c.env,
      c.req.param("id"),
      await body(c),
    ),
  }),
);
admin.post("/agents/:id/decide", async (c) =>
  result(c, {
    request: await decideAgent(c.env, c.req.param("id"), await body(c)),
  }),
);
for (const [path, type, save] of [
  ["coupons", "coupon", saveCoupon],
  ["gifts", "gift", saveGift],
  ["gateways", "gateway", saveGateway],
]) {
  admin.get("/" + path, async (c) =>
    result(c, {
      rows: (await list(c.env, type)).map((r) =>
        type === "gateway" ? gatewayView(r) : r,
      ),
    }),
  );
  admin.post("/" + path, async (c) => {
    const row = await save(c.env, await body(c));
    return result(c, { row: type === "gateway" ? gatewayView(row) : row });
  });
  admin.put("/" + path + "/:id", async (c) => {
    const old = await get(c.env, type, c.req.param("id"));
    assert(old, "not_found");
    const row = await save(c.env, await body(c), old);
    return result(c, { row: type === "gateway" ? gatewayView(row) : row });
  });
  admin.delete("/" + path + "/:id", async (c) => {
    const row = await get(c.env, type, c.req.param("id"));
    assert(row, "not_found");
    row.enabled = false;
    await put(c.env, type, row.id, row);
    return result(c, {});
  });
}
admin.get("/payments", async (c) =>
  result(c, paged(c, recent(await list(c.env, "payment")).map(paymentView))),
);
admin.post("/payments/:id/approve", async (c) =>
  result(c, {
    payment: paymentView(
      await decideReceipt(c.env, c.req.param("id"), true, ""),
    ),
  }),
);
admin.post("/payments/:id/reject", async (c) =>
  result(c, {
    payment: paymentView(
      await decideReceipt(
        c.env,
        c.req.param("id"),
        false,
        (await body(c)).reason,
      ),
    ),
  }),
);
admin.post("/payments/:id/verify", async (c) => {
  const p = await get(c.env, "payment", c.req.param("id"));
  assert(p, "payment_not_found");
  return result(c, {
    payment: paymentView(await verifyPayment(c.env, p, await body(c))),
  });
});
admin.get("/payments/:id/receipt", async (c) => {
  const p = await get(c.env, "payment", c.req.param("id"));
  assert(p?.receipt, "receipt_not_found");
  return fileResponse(await resolveToken(c.env), p.receipt.fileId, {
    inline: true,
    name: p.receipt.name,
  });
});
admin.get("/raffles", async (c) =>
  result(c, { rows: recent(await list(c.env, "raffle")) }),
);
admin.post("/raffles", async (c) =>
  result(c, { raffle: await createRaffle(c.env, await body(c)) }),
);
admin.get("/audit", async (c) =>
  result(c, paged(c, recent(await list(c.env, "audit"), "at"))),
);
admin.get("/export", async (c) => {
  const rows = await financeReport(
      c.env,
      Number(c.req.query("from")) || 0,
      Number(c.req.query("to")) || Date.now(),
    ),
    excel = c.req.query("format") === "xlsx";
  return new Response(excel ? xlsx(rows) : csv(rows), {
    headers: {
      "content-type": excel
        ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        : "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="service-finance.${excel ? "xlsx" : "csv"}"`,
      "cache-control": "no-store",
    },
  });
});
admin.post("/backup/export", async (c) => {
  const b = await body(c);
  return result(c, { backup: await exportBackup(c.env, b.password) });
});
admin.post("/backup/restore", async (c) => {
  const b = await body(c);
  return result(c, await restoreBackup(c.env, b.backup, b.password, b.confirm));
});
admin.post("/customer-link/:id", async (c) => {
  const user = await getUser(c.env, c.req.param("id"));
  assert(user, "user_not_found");
  return result(c, { ticket: await portalTicket(c.env, user.id) });
});
export default admin;

export const portal = new Hono();
portal.post("/login", async (c) =>
  result(
    c,
    await portalLogin(
      c.env,
      await body(c),
      c.req.header("cf-connecting-ip") || "local",
    ),
  ),
);
portal.use("*", requireCustomer);
portal.get("/bootstrap", async (c) => {
  const user = c.get("customer"),
    s = await serviceSettings(c.env),
    a = await account(c.env, user.id),
    v2 = await getSettings(c.env),
    ticket = await getTicket(c.env, user.id);
  return result(c, {
    settings: publicSettings(s),
    user: { id: user.id, name: user.firstName, lang: user.lang },
    account: { ...a, available: available(a) },
    gate: await customerGate(c.env, user),
    botUsername: v2.botUsername,
    support: {
      enabled: enabled(v2, "support"),
      unread: supportUnread(ticket),
      total: (ticket?.messages || []).length,
    },
  });
});
// Mini App support desk: messages land in the same panel inbox the bot uses, and
// the administrator reply is delivered both here and in the Telegram chat.
function supportUnread(ticket) {
  const seen = ticket?.userSeenAt || 0;
  return (ticket?.messages || []).filter((m) => m.s === "a" && m.at > seen)
    .length;
}
function supportView(ticket) {
  return {
    open: ticket ? ticket.open !== false : true,
    messages: (ticket?.messages || []).slice(-60).map((m) => ({
      from: m.s === "a" ? "support" : "customer",
      text: m.t,
      at: m.at,
    })),
    unread: 0,
  };
}
portal.get("/support", async (c) => {
  const user = c.get("customer");
  const ticket = await getTicket(c.env, user.id);
  if (ticket && supportUnread(ticket)) {
    ticket.userSeenAt = Date.now();
    await putTicket(c.env, ticket);
  }
  return result(c, {
    support: supportView(ticket),
    enabled: enabled(await getSettings(c.env), "support"),
  });
});
portal.post("/support", async (c) => {
  const user = c.get("customer");
  await limited(c.env, "support-msg:" + user.id, 10, 60);
  assert(enabled(await getSettings(c.env), "support"), "support_disabled");
  const text = str((await body(c)).text, 2000);
  assert(text, "support_message_required");
  const ticket = await ticketAppendUser(
    c.env,
    { id: user.id, firstName: user.firstName },
    text,
  );
  ticket.userSeenAt = Date.now();
  await putTicket(c.env, ticket);
  const settings = await serviceSettings(c.env);
  if (settings.reportChat) {
    const token = await resolveToken(c.env);
    if (token)
      await tgApi(token, "sendMessage", {
        chat_id: settings.reportChat,
        text: `💬 پیام پشتیبانی از مینی‌اپ / Mini App support message\n${user.firstName || ""} · ${user.id}\n\n${text}`,
      }).catch(() => {});
  }
  return result(c, { support: supportView(ticket) });
});
portal.post("/rules", async (c) =>
  result(c, {
    account: await acceptRules(
      c.env,
      c.get("customer").id,
      (await body(c)).version,
    ),
  }),
);
portal.post("/logout", async (c) => {
  await c.env.BOT_KV.delete(
    key("session", await hash(c.get("customerSession"))),
  );
  return result(c, {});
});
portal.use("*", requireAccess);
portal.get("/catalog", async (c) =>
  result(c, { plans: await catalogue(c.env, c.get("customer").id) }),
);
portal.get("/services", async (c) =>
  result(c, {
    rows: await Promise.all(
      recent(
        (await list(c.env, "service")).filter(
          (s) => s.userId === String(c.get("customer").id),
        ),
      ).map((s) => serviceView(c.env, s)),
    ),
  }),
);
portal.get("/services/:id/content", async (c) =>
  result(
    c,
    await serviceContent(c.env, c.get("customer").id, c.req.param("id")),
  ),
);
portal.get("/services/:id/qr", async (c) => {
  const v = await serviceContent(
    c.env,
    c.get("customer").id,
    c.req.param("id"),
  );
  const text = v.proxyUrl || v.subscriptionUrl || v.configs[0];
  return new Response(qrSVG(text), {
    headers: { "content-type": "image/svg+xml", "cache-control": "no-store" },
  });
});
portal.get("/services/:id/card", async (c) => {
  const s = await ownedService(c.env, c.get("customer").id, c.req.param("id")),
    config = await serviceSettings(c.env);
  const panel = await get(c.env, "panel", s.panelId);
  s.usageAvailable = !["stock", "mikrotik", "ibsng"].includes(panel?.type);
  return new Response(usageCard(s, config.brand), {
    headers: { "content-type": "image/svg+xml", "cache-control": "no-store" },
  });
});
portal.post("/services/:id/action", async (c) => {
  await limited(c.env, "actions:" + c.get("customer").id, 10, 60);
  const b = await body(c);
  const r = await simpleServiceAction(
    c.env,
    c.get("customer").id,
    c.req.param("id"),
    b.action,
    b,
  );
  return result(c, { result: r.kind ? r : await serviceView(c.env, r) });
});
portal.post("/quote", async (c) => {
  await limited(c.env, "quote:" + c.get("customer").id, 20, 60);
  return result(c, {
    quote: await quote(c.env, c.get("customer").id, await body(c)),
  });
});
portal.post("/purchase", async (c) =>
  result(c, {
    operation: await purchase(
      c.env,
      c.get("customer").id,
      (await body(c)).quoteId,
    ),
  }),
);
portal.get("/operations", async (c) =>
  result(c, {
    rows: recent(
      (await list(c.env, "operation")).filter(
        (o) => o.userId === String(c.get("customer").id),
      ),
    )
      .slice(0, 50)
      .map(operationView),
  }),
);
portal.post("/operations/:id/cancel", async (c) =>
  result(c, {
    operation: await cancelOperation(
      c.env,
      c.get("customer").id,
      c.req.param("id"),
    ),
  }),
);
portal.post("/combined-subscription", async (c) => {
  const userId = String(c.get("customer").id),
    old = await get(c.env, "sub-owner", userId),
    body = await readJson(c);
  let token = old?.token;
  if (!token || body.rotate) {
    token = randomToken();
    if (old) await c.env.BOT_KV.delete(key("sub-all", await hash(old.token)));
    await put(c.env, "sub-owner", userId, { token });
    await put(c.env, "sub-all", await hash(token), { token, userId });
  }
  const s = await serviceSettings(c.env),
    root = await getSettings(c.env),
    base = s.publicUrl || c.env.PUBLIC_BASE_URL || root.publicBaseUrl;
  assert(base, "public_url_required");
  return result(c, { url: base.replace(/\/$/, "") + "/sub-all/" + token });
});
portal.get("/wallet", async (c) => {
  const a = await account(c.env, c.get("customer").id);
  return result(c, {
    account: { ...a, available: available(a) },
    entries: recent(
      (await list(c.env, "ledger")).filter(
        (e) => e.userId === String(c.get("customer").id),
      ),
      "at",
    ).slice(0, 100),
  });
});
portal.get("/gateways", async (c) =>
  result(c, {
    rows: (await list(c.env, "gateway"))
      .filter((g) => g.enabled)
      .map((g) => ({
        id: g.id,
        title: g.title,
        type: g.type,
        currency: g.currency,
      })),
  }),
);
portal.get("/payments", async (c) =>
  result(c, {
    rows: recent(
      (await list(c.env, "payment")).filter(
        (p) => p.userId === String(c.get("customer").id),
      ),
    )
      .slice(0, 50)
      .map(paymentView),
  }),
);
portal.post("/payments", async (c) => {
  await limited(c.env, "pay-create:" + c.get("customer").id, 5, 60);
  return result(c, {
    payment: await createPayment(c.env, c.get("customer").id, await body(c)),
  });
});
portal.post("/payments/:id/check", async (c) => {
  await limited(c.env, "pay-check:" + c.get("customer").id, 10, 60);
  const p = await get(c.env, "payment", c.req.param("id"));
  assert(p && p.userId === String(c.get("customer").id), "payment_not_found");
  try {
    await verifyPayment(c.env, p, await body(c));
  } catch (e) {
    p.lastError = e.message;
  }
  return result(c, { payment: paymentView(p) });
});
portal.post("/payments/:id/hash", async (c) => {
  await limited(c.env, "pay-hash:" + c.get("customer").id, 5, 60);
  return result(c, {
    payment: await attachHash(
      c.env,
      c.get("customer").id,
      c.req.param("id"),
      (await body(c)).hash,
    ),
  });
});
portal.post("/payments/:id/cancel", async (c) => {
  const p = await get(c.env, "payment", c.req.param("id"));
  assert(
    p && p.userId === String(c.get("customer").id) && p.status === "pending",
    "payment_not_cancellable",
  );
  p.status = "cancelled";
  await put(c.env, "payment", p.id, p);
  return result(c, { payment: paymentView(p) });
});
portal.post("/payments/:id/receipt", async (c) => {
  const user = c.get("customer");
  await limited(c.env, "receipt:" + user.id, 10, 3600);
  const p = await get(c.env, "payment", c.req.param("id"));
  assert(
    p &&
      p.userId === String(user.id) &&
      p.status === "pending" &&
      p.type === "manual",
    "receipt_not_allowed",
  );
  assert(
    (c.req.header("content-type") || "").startsWith("multipart/form-data"),
    "multipart_required",
  );
  const form = await readForm(c),
    file = form.get("file");
  assert(
    file &&
      file.size > 0 &&
      file.size <= 10 * 1024 * 1024 &&
      ["image/jpeg", "image/png", "application/pdf"].includes(file.type),
    "invalid_receipt_file",
  );
  const settings = await serviceSettings(c.env),
    media = new FormData();
  const kind = file.type === "application/pdf" ? "document" : "photo";
  media.set("chat_id", settings.reportChat || String(user.id));
  media.set(kind, file, file.name || "receipt");
  media.set("caption", `رسید شارژ #${p.id}\n${user.id} · ${p.amount} IRT`);
  media.set("protect_content", "true");
  const res = await tgApi(
    await resolveToken(c.env),
    kind === "photo" ? "sendPhoto" : "sendDocument",
    media,
  );
  assert(res.ok, res.description || "receipt_upload_failed");
  const f = kind === "photo" ? res.result.photo.at(-1) : res.result.document;
  return result(c, {
    payment: await attachReceipt(c.env, user.id, p.id, {
      fileId: f.file_id,
      name: file.name || "receipt",
    }),
  });
});
portal.post("/gift", async (c) => {
  await limited(c.env, "gift:" + c.get("customer").id, 8, 60);
  return result(c, {
    account: await redeemGift(
      c.env,
      c.get("customer").id,
      (await body(c)).code,
    ),
  });
});
portal.post("/agent", async (c) =>
  result(c, {
    request: await requestAgent(
      c.env,
      c.get("customer").id,
      (await body(c)).note,
    ),
  }),
);
portal.get("/raffles", async (c) =>
  result(c, {
    rows: (await list(c.env, "raffle"))
      .filter((r) => r.status === "open" || r.status === "drawn")
      .map(({ entries, ...r }) => ({
        ...r,
        entriesCount: entries.length,
        joined: entries.includes(String(c.get("customer").id)),
      })),
  }),
);
portal.post("/raffles/:id/enter", async (c) => {
  const r = await enterRaffle(c.env, c.get("customer").id, c.req.param("id"));
  return result(c, { joined: true, entriesCount: r.entries.length });
});
portal.post("/wheel", async (c) => {
  const b = await body(c);
  assert(
    /^[A-Za-z0-9_-]{8,80}$/.test(b.requestId || ""),
    "idempotency_key_required",
  );
  return result(c, {
    spin: await spinWheel(
      c.env,
      c.get("customer").id,
      b.requestId,
      b.expectedFee,
    ),
  });
});

portal.post("/dice", async (c) => {
  await limited(c.env, "dice-api:" + c.get("customer").id, 5, 60);
  return result(c, {
    game: await playDice(
      c.env,
      c.get("customer").id,
      (await body(c)).requestId,
    ),
  });
});
