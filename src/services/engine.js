import { isModernProvider, validateModernOptions } from "./modern-providers.js";
import { getUser, getSettings } from "../kv.js";
import { resolveToken, sendToUser } from "../bot-api.js";
import { membershipGate, sendMembershipLock } from "../gate.js";
import {
  get,
  put,
  key,
  list,
  commitJson,
  assert,
  id,
  str,
  integer,
  money,
  GB,
  epoch,
  seal,
  unseal,
  hash,
  randomToken,
  audit,
  MAX_MONEY,
} from "./common.js";
import { serviceSettings } from "./settings.js";
import { PROVIDERS, connector, prepareAccount } from "./providers.js";
import { account, available, walletWrites, drawRaffles } from "./wallet.js";

export const ownedService = async (env, userId, serviceId) => {
  const s = await get(env, "service", serviceId);
  assert(s && s.userId === String(userId), "service_not_found", 404);
  return s;
};
export async function savePlan(env, b, old = {}) {
  const panel = await get(env, "panel", b.panelId);
  assert(panel, "panel_not_found");
  const p = {
    id: old.id || id(),
    title: str(b.title, 100),
    titleEn: str(b.titleEn, 100),
    description: str(b.description, 2000),
    panelId: panel.id,
    category: str(b.category, 64),
    days: integer(b.days, 0, 3650),
    volumeGB: Number(b.volumeGB),
    price: money(b.price),
    prices: {},
    roles: Array.isArray(b.roles)
      ? b.roles.filter((r) => ["customer", "agent", "credit_agent"].includes(r))
      : ["customer", "agent", "credit_agent"],
    enabled: b.enabled !== false,
    firstUse: !!b.firstUse,
    stockShelfId: str(b.stockShelfId, 32),
    custom: !!b.custom,
    perGB: money(b.perGB || 0),
    perDay: money(b.perDay || 0),
    minGB: Number(b.minGB ?? 1),
    maxGB: Number(b.maxGB ?? 1000),
    minDays: integer(b.minDays ?? 1, 0, 3650),
    maxDays: integer(b.maxDays ?? 365, 1, 3650),
    extraGB: money(b.extraGB || 0),
    extraDay: money(b.extraDay || 0),
    options:
      b.options && typeof b.options === "object" && !Array.isArray(b.options)
        ? b.options
        : {},
    createdAt: old.createdAt || Date.now(),
    updatedAt: Date.now(),
  };
  assert(
    p.title &&
      p.roles.length &&
      Number.isFinite(p.volumeGB) &&
      p.volumeGB >= 0 &&
      p.volumeGB <= 100000,
    "invalid_service_plan",
  );
  assert(
    !p.firstUse || PROVIDERS[panel.type].capabilities.includes("first_use"),
    "first_use_not_supported",
  );
  assert(
    Number.isFinite(p.minGB) &&
      Number.isFinite(p.maxGB) &&
      p.minGB > 0 &&
      p.maxGB >= p.minGB &&
      p.maxGB <= 100000 &&
      p.maxDays >= p.minDays,
    "invalid_custom_bounds",
  );
  if (isModernProvider(panel.type)) {
    validateModernOptions(panel.type, { ...panel.options, ...p.options }, true);
    if (panel.type === "remnawave")
      assert(p.days > 0 && (!p.custom || p.minDays > 0), "finite_expiry_required");
  }
  for (const r of ["customer", "agent", "credit_agent"])
    if (b.prices?.[r] !== undefined && b.prices[r] !== "")
      p.prices[r] = money(b.prices[r]);
  assert(JSON.stringify(p.options).length < 10000, "plan_options_too_large");
  await put(env, "plan", p.id, p);
  return p;
}
export async function saveCoupon(env, b, old = {}) {
  const c = {
    id: old.id || id(),
    code: str(b.code, 40).toUpperCase(),
    type: b.type || "percent",
    value: money(b.value),
    scope: b.scope || "all",
    planId: str(b.planId, 32),
    panelId: str(b.panelId, 32),
    roles: Array.isArray(b.roles)
      ? b.roles
      : ["customer", "agent", "credit_agent"],
    maxUses: integer(b.maxUses || 0, 0, 1000000),
    used: old.used || 0,
    reserved: old.reserved || 0,
    expiresAt: Number(b.expiresAt) || 0,
    enabled: b.enabled !== false,
    perUser: integer(b.perUser || 1, 1, 1000),
    createdAt: old.createdAt || Date.now(),
  };
  assert(
    /^[A-Z0-9_-]{3,40}$/.test(c.code) &&
      ["percent", "amount"].includes(c.type) &&
      ["all", "buy", "renew", "volume", "time"].includes(c.scope),
    "invalid_service_coupon",
  );
  assert(c.type !== "percent" || c.value <= 100, "invalid_discount_percent");
  assert(
    !(await list(env, "coupon")).some(
      (x) => x.code === c.code && x.id !== c.id,
    ),
    "duplicate_coupon",
  );
  await put(env, "coupon", c.id, c);
  return c;
}
export async function createShelf(env, b, old = {}) {
  const s = {
    id: old.id || id(),
    title: str(b.title, 100),
    panelId: str(b.panelId, 32),
    createdAt: old.createdAt || Date.now(),
  };
  assert(s.title, "shelf_title_required");
  if (s.panelId) assert(await get(env, "panel", s.panelId), "panel_not_found");
  await put(env, "shelf", s.id, s);
  return s;
}
export async function importStock(env, shelfId, input) {
  assert(await get(env, "shelf", shelfId), "shelf_not_found");
  assert(
    Array.isArray(input) && input.length > 0 && input.length <= 200,
    "stock_import_limit",
  );
  const rows = [],
    writes = [];
  const existing = new Set(
    (await list(env, "stock")).map((r) => r.fingerprint),
  );
  for (const source of input) {
    const content = typeof source === "string" ? { configs: [source] } : source;
    const configs = (Array.isArray(content.configs) ? content.configs : [])
      .map((x) => String(x).trim())
      .filter(Boolean);
    const subscriptionUrl = str(content.subscriptionUrl, 2000);
    assert(configs.length || subscriptionUrl, "stock_content_required");
    assert(
      configs.every((s) => s.length <= 16000),
      "stock_config_too_large",
    );
    assert(
      !subscriptionUrl || /^https:\/\//.test(subscriptionUrl),
      "invalid_subscription_url",
    );
    const fingerprint = await hash(
      JSON.stringify({ configs, subscriptionUrl }),
    );
    if (existing.has(fingerprint)) continue;
    existing.add(fingerprint);
    const row = {
      id: id(),
      shelfId,
      label: str(content.label, 100),
      fingerprint,
      status: "available",
      content: await seal(env, { configs, subscriptionUrl }),
      createdAt: Date.now(),
    };
    rows.push(row);
    writes.push([key("stock", row.id), row]);
  }
  await commitJson(env, writes);
  return { imported: rows.length, duplicates: input.length - rows.length };
}
async function effectivePanel(env, panelId) {
  let p = await get(env, "panel", panelId);
  const seen = new Set();
  while (p?.emergency && p.fallbackPanelId) {
    assert(!seen.has(p.id), "fallback_cycle");
    seen.add(p.id);
    p = await get(env, "panel", p.fallbackPanelId);
  }
  assert(p && p.enabled, "panel_unavailable");
  return p;
}
export async function catalogue(env, userId) {
  const a = await account(env, userId),
    plans = [];
  for (const p of await list(env, "plan")) {
    if (!p.enabled || !p.roles.includes(a.role)) continue;
    let panel;
    try {
      panel = await effectivePanel(env, p.panelId);
    } catch {
      continue;
    }
    const { options, prices, ...publicPlan } = p;
    plans.push({
      ...publicPlan,
      price: Math.floor(
        ((p.prices[a.role] ?? p.price) * (100 - a.discountPercent)) / 100,
      ),
      location: panel.location || panel.title,
      country: panel.country,
      panelTitle: panel.title,
      effectivePanelId: panel.id,
      provider: panel.type,
      capabilities: PROVIDERS[panel.type].capabilities,
    });
  }
  return plans;
}
export async function quote(env, userId, b) {
  const settings = await serviceSettings(env);
  assert(settings.enabled && !settings.maintenance, "service_shop_unavailable");
  const kind = b.kind || "buy";
  assert(
    ["buy", "trial", "renew", "volume", "time"].includes(kind),
    "invalid_service_action",
  );
  const a = await account(env, userId),
    service = b.serviceId ? await ownedService(env, userId, b.serviceId) : null;
  if (service) {
    assert(
      !["deleted", "refunded", "cancelled"].includes(service.status),
      "service_unavailable",
    );
    assert(!service.actionLock, "service_operation_pending");
  }
  const plan = await get(env, "plan", b.planId || service?.planId);
  assert(
    plan && plan.enabled && plan.roles.includes(a.role),
    "plan_unavailable",
  );
  if (kind !== "buy" && kind !== "trial") assert(service, "service_required");
  if (kind === "trial") {
    assert(settings.testPlanId === plan.id, "test_plan_unavailable");
    const used = (await list(env, "service")).filter(
      (s) => s.userId === String(userId) && s.trial,
    ).length;
    const pending = (await list(env, "operation")).filter(
      (o) =>
        o.userId === String(userId) &&
        o.kind === "trial" &&
        ["queued", "sending", "review"].includes(o.status),
    ).length;
    assert(used + pending < settings.testsPerUser, "trial_limit_reached");
  }
  const panel = service
    ? await get(env, "panel", service.panelId)
    : await effectivePanel(env, plan.panelId);
  assert(panel && panel.enabled, "panel_unavailable");
  const quantity = kind === "buy" ? integer(b.quantity || 1, 1, 10) : 1;
  const p = structuredClone(plan);
  let price = p.prices[a.role] ?? p.price;
  if (p.custom) {
    p.volumeGB = Number(b.volumeGB ?? p.volumeGB);
    p.days = integer(b.days ?? p.days, p.minDays, p.maxDays);
    assert(
      p.volumeGB >= p.minGB &&
        p.volumeGB <= p.maxGB &&
        Number.isFinite(p.volumeGB),
      "custom_volume_bounds",
    );
    price = Math.ceil(p.volumeGB * p.perGB + p.days * p.perDay);
  }
  let units = 0;
  if (kind === "volume" || kind === "time") {
    assert(
      PROVIDERS[panel.type].capabilities.includes(kind),
      "panel_action_unsupported",
    );
    units = integer(b.units, 1, kind === "time" ? 3650 : 100000);
    price = units * (kind === "time" ? p.extraDay : p.extraGB);
    assert(price > 0, "extra_price_not_configured");
  }
  if (kind === "renew")
    assert(
      PROVIDERS[panel.type].capabilities.includes("renew"),
      "panel_action_unsupported",
    );
  if (kind === "trial") price = 0;
  price = money(
    Math.floor((price * quantity * (100 - a.discountPercent)) / 100),
  );
  let discount = 0,
    couponId = "";
  if (b.coupon) {
    const c = (await list(env, "coupon")).find(
      (c) => c.code === String(b.coupon).trim().toUpperCase(),
    );
    assert(
      c &&
        c.enabled &&
        (!c.expiresAt || c.expiresAt > Date.now()) &&
        (!c.maxUses || c.used + c.reserved < c.maxUses) &&
        ["all", kind === "trial" ? "buy" : kind].includes(c.scope) &&
        (!c.planId || c.planId === p.id) &&
        (!c.panelId || c.panelId === panel.id) &&
        c.roles.includes(a.role),
      "coupon_unavailable",
    );
    const used = await get(env, "coupon-use", `${c.id}:${userId}`, 0);
    const reservations = (await list(env, "operation")).filter(
      (o) =>
        o.userId === String(userId) &&
        o.couponId === c.id &&
        ["queued", "sending", "review"].includes(o.status),
    ).length;
    assert(used + reservations < c.perUser, "coupon_already_used");
    discount = Math.min(
      price,
      c.type === "percent" ? Math.floor((price * c.value) / 100) : c.value,
    );
    couponId = c.id;
  }
  if (b.name)
    assert(
      settings.customNames &&
        quantity === 1 &&
        /^[a-zA-Z][a-zA-Z0-9_-]{2,59}$/.test(b.name),
      "invalid_service_name",
    );
  const q = {
    id: id(),
    userId: String(userId),
    kind,
    serviceId: service?.id || "",
    panelId: panel.id,
    plan: p,
    planVersion: plan.updatedAt,
    quantity,
    units,
    name: str(b.name, 60),
    basePrice: price,
    discount,
    amount: price - discount,
    couponId,
    role: a.role,
    accountDiscount: a.discountPercent,
    expiresAt: Date.now() + 300000,
    createdAt: Date.now(),
  };
  await put(env, "quote", q.id, q, { ttl: 900 });
  return quoteView(q, a);
}
export const quoteView = (q, a) => ({
  id: q.id,
  kind: q.kind,
  planId: q.plan.id,
  planTitle: q.plan.title,
  serviceId: q.serviceId,
  quantity: q.quantity,
  days: q.plan.days,
  volumeGB: q.plan.volumeGB,
  amount: q.amount,
  discount: q.discount,
  basePrice: q.basePrice,
  expiresAt: q.expiresAt,
  available: available(a),
  shortfall: Math.max(0, q.amount - available(a)),
});
export async function purchase(env, userId, quoteId) {
  const old = await get(env, "operation", quoteId);
  if (old) {
    assert(old.userId === String(userId), "operation_not_found");
    return operationView(old);
  }
  const q = await get(env, "quote", quoteId);
  assert(
    q && q.userId === String(userId) && q.expiresAt > Date.now(),
    "quote_expired",
  );
  const settings = await serviceSettings(env);
  assert(settings.enabled && !settings.maintenance, "service_shop_unavailable");
  const a = await account(env, userId),
    live = await get(env, "plan", q.plan.id);
  assert(
    live?.enabled &&
      live.updatedAt === q.planVersion &&
      a.role === q.role &&
      a.discountPercent === q.accountDiscount,
    "quote_changed",
  );
  const operations = await list(env, "operation");
  assert(
    operations.filter(
      (o) =>
        o.userId === String(userId) &&
        ["queued", "sending", "review"].includes(o.status),
    ).length < settings.maxOpenOperations,
    "too_many_open_operations",
  );
  if (q.serviceId)
    assert(
      !(await get(env, "service", q.serviceId))?.actionLock,
      "service_operation_pending",
    );
  if (q.serviceId)
    assert(
      !operations.some(
        (o) =>
          o.serviceId === q.serviceId &&
          ["queued", "sending", "review"].includes(o.status),
      ),
      "service_operation_pending",
    );
  const services = await list(env, "service");
  assert(
    services.filter(
      (s) =>
        s.userId === String(userId) &&
        !["deleted", "refunded"].includes(s.status),
    ).length +
      q.quantity <=
      settings.maxServices,
    "service_count_limit",
  );
  if (q.kind === "trial")
    assert(
      services.filter((s) => s.userId === String(userId) && s.trial).length +
        operations.filter(
          (o) =>
            o.userId === String(userId) &&
            o.kind === "trial" &&
            ["queued", "sending", "review"].includes(o.status),
        ).length <
        settings.testsPerUser,
      "trial_limit_reached",
    );
  const panel = await get(env, "panel", q.panelId);
  assert(panel && panel.enabled, "panel_unavailable");
  assert(
    services.filter(
      (s) =>
        s.panelId === panel.id && !["deleted", "refunded"].includes(s.status),
    ).length +
      q.quantity <=
      panel.capacity,
    "panel_capacity_reached",
  );
  const operation = {
    ...q,
    status: "queued",
    accounts: [],
    results: [],
    stockIds: [],
    createdAt: Date.now(),
    error: "",
    attempts: 0,
  };
  const writes = [];
  if (
    q.kind === "buy" ||
    q.kind === "trial" ||
    (q.kind === "renew" && panel.type === "stock")
  ) {
    for (let i = 0; i < q.quantity; i++)
      operation.accounts.push(
        prepareAccount(
          panel,
          q.plan,
          q.id + (q.quantity > 1 ? "_" + i : ""),
          userId,
          q.name,
        ),
      );
    if (q.serviceId && panel.type === "stock")
      operation.targetAccount = operation.accounts[0];
    if (panel.type === "stock") {
      const shelf = q.plan.stockShelfId || panel.options.shelfId;
      const stock = (await list(env, "stock")).filter(
        (s) => s.shelfId === shelf && s.status === "available",
      );
      assert(stock.length >= q.quantity, "stock_empty");
      for (const row of stock.slice(0, q.quantity)) {
        row.status = "reserved";
        row.operationId = q.id;
        row.userId = String(userId);
        operation.stockIds.push(row.id);
        writes.push([key("stock", row.id), row]);
      }
    }
  }
  if (q.couponId) {
    const c = await get(env, "coupon", q.couponId);
    assert(
      c?.enabled &&
        (!c.expiresAt || c.expiresAt > Date.now()) &&
        (!c.maxUses || c.used + c.reserved < c.maxUses),
      "coupon_unavailable",
    );
    const uses = await get(env, "coupon-use", `${c.id}:${userId}`, 0);
    const reserved = operations.filter(
      (o) =>
        o.userId === String(userId) &&
        o.couponId === c.id &&
        ["queued", "sending", "review"].includes(o.status),
    ).length;
    assert(uses + reserved < c.perUser, "coupon_already_used");
    c.reserved++;
    writes.push([key("coupon", c.id), c]);
  }
  const change = await walletWrites(env, userId, {
    holdDelta: q.amount,
    eventId: "hold:" + q.id,
    reason: "service_reservation",
  });
  writes.push(...change.writes, [key("operation", q.id), operation]);
  await commitJson(env, writes);
  return operationView(operation);
}
export const operationView = (o) => ({
  id: o.id,
  userId: o.userId,
  kind: o.kind,
  status: o.status,
  amount: o.amount,
  planTitle: o.plan?.title,
  serviceId: o.serviceId,
  serviceIds: o.serviceIds || [],
  createdAt: o.createdAt,
  error: o.error || "",
  quantity: o.quantity,
  paidAt: o.paidAt,
});
async function releaseOperation(env, o, reason) {
  const writes = [];
  for (const stockId of o.stockIds) {
    const s = await get(env, "stock", stockId);
    if (s?.operationId === o.id && s.status === "reserved") {
      s.status = "available";
      delete s.operationId;
      delete s.userId;
      writes.push([key("stock", s.id), s]);
    }
  }
  if (o.couponId) {
    const c = await get(env, "coupon", o.couponId);
    if (c) {
      c.reserved = Math.max(0, c.reserved - 1);
      writes.push([key("coupon", c.id), c]);
    }
  }
  const change = await walletWrites(env, o.userId, {
    holdDelta: -o.amount,
    eventId: "release:" + o.id,
    reason: "service_failed",
  });
  o.status = "failed";
  o.error = reason;
  o.finishedAt = Date.now();
  writes.push(...change.writes, [key("operation", o.id), o]);
  await commitJson(env, writes);
}
async function finalizeOperation(env, o) {
  if ((await get(env, "operation", o.id))?.status === "done") return;
  const settings = await serviceSettings(env),
    writes = [],
    services = [];
  let existing;
  if (o.serviceId) {
    existing = await get(env, "service", o.serviceId);
    assert(existing && existing.userId === o.userId, "service_owner_changed");
    const remote = o.results[0];
    Object.assign(existing, {
      remoteAccount: o.targetAccount || existing.remoteAccount,
      remote: remote.raw || null,
      configs: remote.configs?.length ? remote.configs : existing.configs,
      subscriptionUrl: remote.subscriptionUrl || existing.subscriptionUrl,
      dataLimit: remote.dataLimit,
      usedBytes: remote.usedBytes,
      expiresAt: remote.expiresAt,
      status: remote.status || "active",
      lastSyncAt: Date.now(),
      paidTotal: (existing.paidTotal || 0) + o.amount,
      planId: o.kind === "renew" ? o.plan.id : existing.planId,
    });
    services.push(existing);
  } else
    for (let i = 0; i < o.quantity; i++) {
      const r = o.results[i],
        serviceId = o.id + "_" + i;
      services.push({
        id: serviceId,
        userId: o.userId,
        payerId: o.userId,
        panelId: o.panelId,
        planId: o.plan.id,
        title: o.plan.title,
        username: o.accounts[i].username,
        status: r.status || "active",
        configs: r.configs || [],
        subscriptionUrl: r.subscriptionUrl || "",
        dataLimit: r.dataLimit,
        usedBytes: r.usedBytes || 0,
        expiresAt: r.expiresAt,
        remoteAccount: o.accounts[i],
        remote: r.raw || null,
        ownerToken: randomToken(),
        createdAt: Date.now(),
        lastSyncAt: Date.now(),
        operationId: o.id,
        paidTotal: Math.floor(o.amount / o.quantity),
        trial: o.kind === "trial",
        note: "",
        deliveryState: "pending",
      });
    }
  for (const s of services) {
    writes.push(
      [key("service", s.id), s],
      [key("sub", await hash(s.ownerToken)), s.id],
    );
  }
  for (const stockId of o.stockIds) {
    const r = await get(env, "stock", stockId);
    r.status = "delivered";
    r.deliveredAt = Date.now();
    writes.push([key("stock", r.id), r]);
  }
  if (o.couponId) {
    const c = await get(env, "coupon", o.couponId);
    if (c) {
      c.reserved = Math.max(0, c.reserved - 1);
      c.used++;
      writes.push(
        [key("coupon", c.id), c],
        [
          key("coupon-use", `${c.id}:${o.userId}`),
          (await get(env, "coupon-use", `${c.id}:${o.userId}`, 0)) + 1,
        ],
      );
    }
  }
  const cashback = Math.floor((o.amount * settings.purchaseCashback) / 100),
    change = await walletWrites(env, o.userId, {
      delta: -o.amount + cashback,
      holdDelta: -o.amount,
      eventId: "settle:" + o.id,
      reason: "service_" + o.kind,
      spent: o.amount,
      details: { cashback, amount: o.amount },
    });
  writes.push(...change.writes);
  const user = await getUser(env, o.userId);
  if (
    settings.referralPercent &&
    user?.referredBy &&
    String(user.referredBy) !== o.userId
  ) {
    const ref = await getUser(env, user.referredBy);
    if (ref && !ref.banned)
      writes.push(
        ...(
          await walletWrites(env, ref.id, {
            delta: Math.floor((o.amount * settings.referralPercent) / 100),
            eventId: "commission:" + o.id,
            reason: "referral_commission",
            details: { buyer: o.userId },
          })
        ).writes,
      );
  }
  o.status = "done";
  o.serviceIds = services.map((s) => s.id);
  o.finishedAt = Date.now();
  writes.push([key("operation", o.id), o]);
  await commitJson(env, writes);
  for (const s of services) await deliverService(env, s);
}
export async function processOperation(env, operationId) {
  const o = await get(env, "operation", operationId);
  if (!o || !["queued", "review", "sending"].includes(o.status)) return o;
  if (o.status === "sending") {
    o.status = "review";
    o.error = "interrupted_operation_review_required";
    await put(env, "operation", o.id, o);
    return o;
  }
  const panel = await get(env, "panel", o.panelId);
  assert(panel, "panel_not_found");
  if (o.status === "review") return o;
  o.status = "sending";
  o.attempts++;
  await put(env, "operation", o.id, o);
  try {
    if (panel.type === "stock") {
      for (let i = 0; i < o.stockIds.length; i++) {
        const row = await get(env, "stock", o.stockIds[i]);
        assert(
          row?.operationId === o.id && row.status === "reserved",
          "stock_reservation_lost",
        );
        const content = await unseal(env, row.content);
        o.results[i] = {
          ...content,
          status: "active",
          dataLimit: o.accounts[i].dataLimit,
          usedBytes: 0,
          expiresAt: o.accounts[i].expiresAt,
          raw: null,
        };
      }
    } else {
      const api = await connector(env, panel);
      if (o.kind === "buy" || o.kind === "trial")
        for (let i = o.results.length; i < o.quantity; i++) {
          const a = o.accounts[i];
          const existing = await api.get(a);
          assert(!existing, "remote_username_exists");
          o.inFlightIndex = i;
          await put(env, "operation", o.id, o);
          await api.create(a);
          o.createdRemote = o.createdRemote || [];
          o.createdRemote.push(i);
          await put(env, "operation", o.id, o);
          o.results[i] = await api.finishCreate(a);
          delete o.inFlightIndex;
          await put(env, "operation", o.id, o);
        }
      else {
        const svc = await ownedService(env, o.userId, o.serviceId),
          remote = await api.get(svc.remoteAccount);
        assert(remote, "remote_service_missing");
        const baseTime = Math.max(epoch(), remote.expiresAt || 0),
          baseLimit = remote.dataLimit;
        o.beforeRemote = {
          dataLimit: remote.dataLimit,
          expiresAt: remote.expiresAt,
        };
        assert(
          o.kind !== "volume" || baseLimit > 0,
          "unlimited_volume_service",
        );
        o.desired = {
          dataLimit:
            o.kind === "time"
              ? baseLimit
              : o.kind === "volume"
                ? baseLimit + o.units * GB
                : baseLimit === 0 || o.plan.volumeGB === 0
                  ? 0
                  : baseLimit + Math.round(o.plan.volumeGB * GB),
          expiresAt:
            o.kind === "volume"
              ? remote.expiresAt
              : o.kind === "time"
                ? baseTime + o.units * 86400
                : o.plan.days
                  ? baseTime + o.plan.days * 86400
                  : 0,
        };
        assert(
          o.desired.dataLimit !== remote.dataLimit ||
            o.desired.expiresAt !== remote.expiresAt,
          "no_effective_change",
        );
        o.dispatched = true;
        o.targetAccount = {
          ...svc.remoteAccount,
          ...o.desired,
          operationId: o.id,
        };
        await put(env, "operation", o.id, o);
        await api.update(svc.remoteAccount, o.desired);
        o.results = [await api.get(o.targetAccount)];
        assert(o.results[0], "provider_update_unconfirmed");
      }
    }
    await finalizeOperation(env, o);
  } catch (e) {
    const committed = await get(env, "operation", o.id);
    if (committed?.status === "done") {
      await audit(env, "delivery_after_commit_error", {
        operationId: o.id,
        error: e.message,
      });
      return committed;
    }
    const unsafe =
      e.uncertain ||
      o.results.length > 0 ||
      o.createdRemote?.length ||
      (o.inFlightIndex !== undefined &&
        !(e.remoteStatus >= 400 && e.remoteStatus < 500)) ||
      o.dispatched;
    if (unsafe) {
      o.status = "review";
      o.error = e.message;
      await put(env, "operation", o.id, o);
    } else await releaseOperation(env, o, e.message);
    await audit(env, "operation_failed", {
      operationId: o.id,
      error: e.message,
      uncertain: !!unsafe,
    });
  }
  return o;
}
export async function reconcileOperation(env, operationId) {
  const o = await get(env, "operation", operationId);
  assert(
    o && ["review", "sending"].includes(o.status),
    "operation_not_in_review",
  );
  const panel = await get(env, "panel", o.panelId);
  assert(panel && panel.type !== "stock", "manual_review_required");
  const api = await connector(env, panel);
  if (o.serviceId) {
    const svc = await get(env, "service", o.serviceId),
      r = await api.get(o.targetAccount || svc.remoteAccount);
    assert(
      r &&
        o.desired &&
        r.dataLimit === o.desired.dataLimit &&
        Math.abs(r.expiresAt - o.desired.expiresAt) < 120,
      "remote_update_not_confirmed",
    );
    o.results = [r];
  } else {
    for (let i = 0; i < o.quantity; i++) {
      const r =
        panel.type === "ibsng"
          ? (await api.ibsCreate(o.accounts[i]), await api.get(o.accounts[i]))
          : await api.get(o.accounts[i]);
      assert(
        r &&
          (await ownsRemote(env, panel, o.accounts[i], r)) &&
          (["mikrotik", "ibsng"].includes(panel.type) ||
            r.dataLimit === o.accounts[i].dataLimit),
        "remote_creation_not_confirmed",
      );
      o.results[i] = await api.finishCreate(o.accounts[i]);
    }
  }
  await finalizeOperation(env, o);
  return operationView(o);
}
export async function cancelOperation(env, userId, opId, admin = false) {
  const o = await get(env, "operation", opId);
  assert(o && (admin || o.userId === String(userId)), "operation_not_found");
  if (o.status !== "queued") {
    assert(admin && o.status === "review", "cannot_cancel_uncertain_operation");
    const p = await get(env, "panel", o.panelId),
      api = await connector(env, p);
    if (o.serviceId) {
      const s = await get(env, "service", o.serviceId),
        r = await api.get(s.remoteAccount);
      assert(
        r &&
          o.beforeRemote &&
          r.dataLimit === o.beforeRemote.dataLimit &&
          r.expiresAt === o.beforeRemote.expiresAt,
        "remote_change_exists_cannot_cancel",
      );
    } else if (p.type !== "stock") {
      for (const a of o.accounts) {
        assert(!(await api.get(a)), "remote_user_exists_cannot_cancel");
        assert(
          !(await get(env, "provider-progress", a.operationId)),
          "partial_remote_creation_requires_cleanup",
        );
      }
    }
  }
  await releaseOperation(env, o, "cancelled");
  return operationView(o);
}
async function ownsRemote(env, panel, a, r) {
  if (!r || r.username !== a.username) return false;
  if (["xui", "xui_token", "alireza", "alireza_inbound"].includes(panel.type))
    return (r.raw?.client?.id || r.raw?.client?.password) === a.uuid;
  if (panel.type === "hiddify") return r.remoteId === a.uuid;
  if (panel.type === "wgdashboard") return r.remoteId === a.wgPublic;
  if (panel.type === "sui") return r.raw?.config?.vless?.uuid === a.uuid;
  if (panel.type === "mikrotik") return r.raw?.password === a.password;
  if (panel.type === "ibsng")
    return (
      (await get(env, "provider-progress", a.operationId))?.userId ===
      r.remoteId
    );
  if (isModernProvider(panel.type)) return r.raw?.note === `BotPanel ${a.operationId}`;
  return String(r.raw?.note || "").includes(a.operationId);
}

export async function deliverService(env, service) {
  if (service.deliveryState === "sent") return service;
  const token = await resolveToken(env);
  if (!token) return service;
  const gate = await membershipGate(
    env,
    token,
    { id: service.userId },
    await getSettings(env),
  );
  if (!gate.ok) {
    if (!service.deliveryLocked)
      await sendMembershipLock(
        token,
        service.userId,
        gate,
        "fa",
        service.userId,
      );
    service.deliveryLocked = true;
    await put(env, "service", service.id, service);
    return service;
  }
  if (service.deliveryState === "sending") {
    service.deliveryState = "review";
    await put(env, "service", service.id, service);
    return service;
  }
  service.deliveryState = "sending";
  await put(env, "service", service.id, service);
  const text = `✅ سرویس شما آماده است / Service ready\n${service.title}\n${service.username}\n\nبرای مشاهده کانفیگ، QR و مدیریت سرویس از دکمه زیر استفاده کنید.`;
  const response = await sendToUser(token, service.userId, text, {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "📡 سرویس / Service",
            callback_data: "vpn:service:" + service.id,
          },
        ],
      ],
    },
  });
  service.deliveryState = response.ok
    ? "sent"
    : response.uncertain
      ? "review"
      : "pending";
  service.deliveryError = response.ok ? "" : response.description;
  service.deliveryLocked = false;
  await put(env, "service", service.id, service);
  return service;
}
export async function serviceContent(env, userId, serviceId) {
  const s = await ownedService(env, userId, serviceId);
  assert(
    !["deleted", "refunded", "disabled"].includes(s.status),
    "service_unavailable",
  );
  const cfg = await serviceSettings(env);
  const base =
    cfg.publicUrl ||
    (await getSettings(env)).publicBaseUrl ||
    env.PUBLIC_BASE_URL ||
    "";
  return {
    configs: s.configs || [],
    subscriptionUrl: /^https:\/\//.test(s.subscriptionUrl || "")
      ? s.subscriptionUrl
      : "",
    proxyUrl: base ? base.replace(/\/$/, "") + "/sub/" + s.ownerToken : "",
    username: s.username,
  };
}
export async function synchronize(env, serviceId) {
  const s = await get(env, "service", serviceId);
  assert(s, "service_not_found");
  const p = await get(env, "panel", s.panelId);
  if (p.type === "stock") return s;
  const c = await connector(env, p);
  const r = await c.get(s.remoteAccount);
  assert(r, "remote_service_missing");
  Object.assign(s, {
    dataLimit: r.dataLimit,
    usedBytes: r.usedBytes,
    expiresAt: r.expiresAt,
    status: r.status,
    remote: r.raw,
    subscriptionUrl: r.subscriptionUrl || s.subscriptionUrl,
    configs: r.configs?.length ? r.configs : s.configs,
    lastSyncAt: Date.now(),
    lastSyncError: "",
  });
  await put(env, "service", s.id, s);
  return s;
}
export async function simpleServiceAction(
  env,
  userId,
  serviceId,
  action,
  body = {},
) {
  const s = await ownedService(env, userId, serviceId),
    panel = await get(env, "panel", s.panelId),
    c = await connector(env, panel);
  assert(!s.actionLock, "service_operation_pending");
  assert(
    !(await list(env, "operation")).some(
      (o) =>
        o.serviceId === s.id &&
        ["queued", "sending", "review"].includes(o.status),
    ),
    "service_operation_pending",
  );
  if (action === "note") {
    s.note = str(body.note, 1000);
    await put(env, "service", s.id, s);
    return s;
  }
  if (action === "sync") return synchronize(env, s.id);
  if (
    action === "report" ||
    action === "refund" ||
    action === "transfer" ||
    action === "move"
  ) {
    if (action === "transfer") {
      assert(
        body.targetUserId && String(body.targetUserId) !== s.userId,
        "invalid_transfer_target",
      );
      assert(await getUser(env, body.targetUserId), "target_must_start_bot");
    }
    const existing = (await list(env, "request")).find(
      (r) =>
        r.serviceId === s.id && r.kind === action && r.status === "pending",
    );
    if (existing) return existing;
    const r = {
      id: id(),
      serviceId: s.id,
      userId: s.userId,
      kind: action,
      note: str(body.note, 2000),
      targetUserId: str(body.targetUserId, 20),
      targetPanelId: str(body.targetPanelId, 32),
      status: "pending",
      createdAt: Date.now(),
    };
    await put(env, "request", r.id, r);
    return r;
  }
  assert(
    ["enable", "disable", "revoke"].includes(action),
    "invalid_service_action",
  );
  if (action === "revoke") {
    const uuid = crypto.randomUUID(),
      subId = id();
    await c.revoke(s.remoteAccount, uuid, subId);
    s.remoteAccount.uuid = uuid;
    s.remoteAccount.subId = subId;
    s.ownerToken = randomToken();
    await put(env, "sub", await hash(s.ownerToken), s.id);
  } else await c.toggle(s.remoteAccount, action === "enable");
  await put(env, "service", s.id, s);
  return synchronize(env, s.id);
}
async function connectionHash(remote) {
  return hash(
    JSON.stringify([
      (remote.configs || []).map((c) => String(c).split("#")[0]).sort(),
      remote.subscriptionUrl || "",
    ]),
  );
}
export async function decideServiceRequest(env, requestId, b) {
  const r = await get(env, "request", requestId);
  assert(r, "request_not_found");
  if (["approved", "resolved", "rejected"].includes(r.status)) return r;
  assert(
    r.status === "pending" || (r.status === "review" && b.reconcile === true),
    "request_not_pending",
  );
  const s = await get(env, "service", r.serviceId);
  assert(s && s.userId === r.userId, "service_owner_changed");
  if (!b.approve) {
    assert(r.status === "pending", "cannot_reject_uncertain_request");
    r.status = "rejected";
    r.answer = str(b.answer, 1000);
    await put(env, "request", r.id, r);
    return r;
  }
  if (r.kind === "report") {
    r.status = "resolved";
    r.answer = str(b.answer, 1000);
    await put(env, "request", r.id, r);
    await sendToUser(
      await resolveToken(env),
      r.userId,
      r.answer || "گزارش سرویس بررسی شد.",
    );
    return r;
  }
  if (r.kind === "move") return migrateService(env, r, s, b);
  const panel = await get(env, "panel", s.panelId),
    c = await connector(env, panel),
    recover = r.status === "review";
  if (!recover) {
    if (r.kind === "refund") r.amount = integer(b.amount, 0, s.paidTotal || 0);
    if (r.kind === "transfer") {
      const before = await c.get(s.remoteAccount);
      assert(before, "remote_service_missing");
      r.intent = {
        uuid: crypto.randomUUID(),
        subId: id(),
        beforeHash: await connectionHash(before),
      };
    }
    r.status = "processing";
    s.actionLock = r.id;
    await commitJson(env, [
      [key("service", s.id), s],
      [key("request", r.id), r],
    ]);
  }
  try {
    if (r.kind === "refund") {
      if (panel.type === "stock")
        assert(
          b.confirmManualDisable === true,
          "confirm_manual_config_disable",
        );
      else if (recover) {
        const remote = await c.get(s.remoteAccount);
        assert(
          !remote || remote.status === "disabled",
          "remote_disable_not_confirmed",
        );
      } else await c.toggle(s.remoteAccount, false);
      s.status = "refunded";
      s.refundedAt = Date.now();
      delete s.actionLock;
      const change = await walletWrites(env, s.payerId || s.userId, {
        delta: r.amount,
        eventId: "refund:" + s.id,
        reason: "service_refund",
      });
      r.status = "approved";
      await commitJson(env, [
        ...change.writes,
        [key("service", s.id), s],
        [key("request", r.id), r],
      ]);
    } else if (r.kind === "transfer") {
      const target = await getUser(env, r.targetUserId);
      assert(target && !target.banned, "target_unavailable");
      if (recover) {
        const current = await c.get(s.remoteAccount);
        assert(
          current && (await connectionHash(current)) !== r.intent.beforeHash,
          "remote_revoke_not_confirmed",
        );
      } else await c.revoke(s.remoteAccount, r.intent.uuid, r.intent.subId);
      s.remoteAccount.uuid = r.intent.uuid;
      s.remoteAccount.subId = r.intent.subId;
      s.userId = r.targetUserId;
      s.ownerToken = randomToken();
      s.deliveryState = "pending";
      delete s.actionLock;
      r.status = "approved";
      const remote = await c.get(s.remoteAccount);
      assert(remote, "remote_service_missing");
      s.configs = remote.configs || [];
      s.subscriptionUrl = remote.subscriptionUrl || "";
      await commitJson(env, [
        [key("service", s.id), s],
        [key("sub", await hash(s.ownerToken)), s.id],
        [key("request", r.id), r],
      ]);
      await deliverService(env, s);
    }
  } catch (e) {
    if ((await get(env, "request", r.id))?.status === "approved")
      return get(env, "request", r.id);
    r.status = "review";
    r.error = e.message;
    await put(env, "request", r.id, r);
    throw e;
  }
  return r;
}
export async function serviceTick(env) {
  const settings = await serviceSettings(env);
  const queue = (await list(env, "operation"))
    .filter((o) => ["queued", "sending"].includes(o.status))
    .sort((a, b) => a.createdAt - b.createdAt);
  for (const o of queue.slice(0, 1)) await processOperation(env, o.id);
  const services = await list(env, "service");
  for (const s of services
    .filter(
      (s) =>
        !["deleted", "refunded"].includes(s.status) &&
        Date.now() - (s.lastSyncAttempt || s.lastSyncAt || 0) >
          settings.syncMinutes * 60000,
    )
    .sort((a, b) => (a.lastSyncAttempt || 0) - (b.lastSyncAttempt || 0))
    .slice(0, 3)) {
    s.lastSyncAttempt = Date.now();
    await put(env, "service", s.id, s);
    try {
      const fresh = await synchronize(env, s.id);
      const lowTime =
        fresh.expiresAt && fresh.expiresAt - epoch() < settings.lowDays * 86400;
      const lowVolume =
        fresh.dataLimit > 0 &&
        fresh.dataLimit - fresh.usedBytes < settings.lowVolumeGB * GB;
      if (
        (lowTime || lowVolume) &&
        Date.now() - (fresh.lastWarning || 0) > 86400000
      ) {
        await sendToUser(
          await resolveToken(env),
          fresh.userId,
          `⚠️ زمان یا حجم سرویس رو به پایان است.\n${fresh.title}\n/vpnservices`,
        );
        fresh.lastWarning = Date.now();
        await put(env, "service", fresh.id, fresh);
      }
      if (
        settings.deleteExpiredDays &&
        fresh.expiresAt > 0 &&
        epoch() - fresh.expiresAt > settings.deleteExpiredDays * 86400
      ) {
        await (
          await connector(env, await get(env, "panel", fresh.panelId))
        ).remove(fresh.remoteAccount);
        fresh.status = "deleted";
        await put(env, "service", fresh.id, fresh);
      }
    } catch (e) {
      s.lastSyncError = e.message;
      await put(env, "service", s.id, s);
    }
  }
  for (const s of services
    .filter((s) => s.deliveryState === "pending" && !s.deliveryLocked)
    .slice(0, 3))
    await deliverService(env, s);
  const panels = (await list(env, "panel"))
    .filter(
      (p) =>
        p.enabled &&
        p.type !== "stock" &&
        Date.now() - (p.health?.at || 0) > 300000,
    )
    .sort((a, b) => (a.health?.at || 0) - (b.health?.at || 0));
  if (panels[0]) {
    const p = panels[0];
    try {
      const health = await (await connector(env, p)).health();
      p.health = { ok: true, ms: health.ms, at: Date.now() };
    } catch (e) {
      const alert = p.health?.ok !== false;
      p.health = { ok: false, error: e.message, at: Date.now() };
      if (alert && settings.reportChat)
        await sendToUser(
          await resolveToken(env),
          settings.reportChat,
          `⚠️ پنل ${p.title} در دسترس نیست.\n${e.message}`,
        );
    }
    await put(env, "panel", p.id, p);
  }
  await drawRaffles(env);
}

async function migrateService(env, request, service, body) {
  const source = await get(env, "panel", service.panelId),
    destination = await get(
      env,
      "panel",
      body.targetPanelId || request.targetPanelId,
    );
  assert(
    source &&
      destination &&
      destination.enabled &&
      source.id !== destination.id,
    "invalid_migration_target",
  );
  assert(
    PROVIDERS[source.type].capabilities.includes("toggle") &&
      destination.type !== "stock",
    "migration_not_supported_for_panel",
  );
  const sourceApi = await connector(env, source),
    destApi = await connector(env, destination),
    current = await sourceApi.get(service.remoteAccount);
  assert(current, "remote_service_missing");
  const remaining = current.dataLimit
    ? Math.max(0, current.dataLimit - current.usedBytes)
    : 0;
  assert(!current.dataLimit || remaining > 0, "no_remaining_quota");
  assert(!current.expiresAt || current.expiresAt > epoch(), "service_expired");
  const plan = {
    volumeGB: remaining / GB,
    days: current.expiresAt
      ? Math.ceil((current.expiresAt - epoch()) / 86400)
      : 0,
    options: destination.options,
    firstUse: false,
  };
  const recovering = request.status === "review";
  const a = recovering
    ? request.targetAccount
    : prepareAccount(destination, plan, request.id, service.userId);
  assert(a, "migration_intent_missing");
  a.expiresAt = recovering ? a.expiresAt : current.expiresAt;
  request.status = "processing";
  request.targetPanelId = destination.id;
  request.targetAccount = a;
  service.actionLock = request.id;
  await commitJson(env, [
    [key("request", request.id), request],
    [key("service", service.id), service],
  ]);
  try {
    if (recovering) {
      const existing = await destApi.get(a);
      assert(
        existing && (await ownsRemote(env, destination, a, existing)),
        "remote_creation_not_confirmed",
      );
    } else await destApi.create(a);
    request.destinationCreated = true;
    await put(env, "request", request.id, request);
    const result = await destApi.finishCreate(a);
    await sourceApi.toggle(service.remoteAccount, false);
    service.migrations = service.migrations || [];
    service.migrations.push({
      from: source.id,
      to: destination.id,
      at: Date.now(),
      oldAccount: service.remoteAccount,
    });
    Object.assign(service, {
      panelId: destination.id,
      remoteAccount: a,
      configs: result.configs || [],
      subscriptionUrl: result.subscriptionUrl || "",
      dataLimit: result.dataLimit,
      usedBytes: result.usedBytes,
      expiresAt: result.expiresAt,
      status: result.status,
      remote: result.raw,
      ownerToken: randomToken(),
      lastSyncAt: Date.now(),
      deliveryState: "pending",
    });
    delete service.actionLock;
    request.status = "approved";
    request.finishedAt = Date.now();
    await commitJson(env, [
      [key("service", service.id), service],
      [key("sub", await hash(service.ownerToken)), service.id],
      [key("request", request.id), request],
    ]);
    await deliverService(env, service);
    return request;
  } catch (e) {
    request.status = "review";
    request.error = e.message;
    await put(env, "request", request.id, request);
    throw e;
  }
}
export async function manualStockSale(env, body) {
  const count = integer(body.count, 1, 100),
    amount = money(body.amount || 0),
    buyer = str(body.buyer, 100);
  assert(
    buyer && body.confirmPaid === true,
    "manual_sale_confirmation_required",
  );
  const available = (await list(env, "stock")).filter(
    (r) => r.shelfId === body.shelfId && r.status === "available",
  );
  assert(available.length >= count, "stock_empty");
  const sale = {
    id: id(),
    buyer,
    amount,
    count,
    status: "recorded_by_admin",
    createdAt: Date.now(),
    stockIds: available.slice(0, count).map((r) => r.id),
  };
  const contents = [],
    writes = [];
  for (const row of available.slice(0, count)) {
    contents.push(await unseal(env, row.content));
    row.status = "delivered";
    row.manualSaleId = sale.id;
    row.deliveredAt = Date.now();
    writes.push([key("stock", row.id), row]);
  }
  writes.push([key("manual-sale", sale.id), sale]);
  await commitJson(env, writes);
  return { sale, contents };
}
