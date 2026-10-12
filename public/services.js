"use strict";
MODULE_LABELS.services = ["فروش سرویس و مینی‌اپ", "Services & customer portal"];
const SV = { tab: "overview", cache: {}, meta: null, metaAt: 0, html: {}, edit: null, offset: 0 };
const svAPI = (path, opts) => {
  // Any mutation invalidates the rendered-tab cache so lists never show stale rows.
  if (opts && opts.method && opts.method !== "GET") SV.html = {};
  return api("/services" + path, opts);
};
const svBtn = (label, act, data = "", primary = false) =>
  vButton(label, act, data, primary);
// Only the fields relevant to the chosen provider/gateway type stay visible:
// conditional blocks carry data-pf="<group> [group2 …]" and svApplyPf hides the
// rest whenever the type dropdown changes.
const SV_PF_API_PANELS = [
  "remnawave",
  "rebecca",
  "marzban",
  "marzban_v1",
  "marzneshin",
  "pasarguard",
  "xui",
  "xui_token",
  "alireza",
  "alireza_inbound",
  "ibsng",
  "sui",
  "hiddify",
  "wgdashboard",
  "guard",
  "mikrotik",
];
const SV_PF_GROUPS = {
  "pf-api": SV_PF_API_PANELS,
  "pf-url": SV_PF_API_PANELS,
  "pf-login": ["marzban", "marzban_v1", "marzneshin", "pasarguard", "xui", "alireza", "alireza_inbound", "ibsng", "mikrotik"],
  "pf-token": ["remnawave", "rebecca","marzban", "marzban_v1", "marzneshin", "pasarguard", "xui_token", "sui", "hiddify", "wgdashboard", "guard"],
  "pf-inbound": ["xui", "xui_token", "alireza", "alireza_inbound"],
  "pf-ids": ["marzban_v1", "marzneshin", "pasarguard", "guard"],
  "pf-squads": ["remnawave"],
  "pf-rebecca": ["rebecca"],
  "pf-interface": ["wgdashboard"],
  "pf-profile": ["ibsng", "mikrotik"],
  "pf-subbase": SV_PF_API_PANELS,
  "pf-shelf": ["stock"],
  "pf-cf": SV_PF_API_PANELS,
  "gw-card": ["manual"],
  "gw-merchant": ["zarinpal", "aqaye", "tetrapay"],
  "gw-apikey": ["tonpay", "blupal", "cubepay", "tronado","tetrapay", "iranpay3", "zarinpay", "nowpayments", "plisio"],
  "gw-ipn": ["nowpayments", "tronado"],
  "gw-sandbox": ["zarinpal"],
  "gw-currency": ["crypto", "plisio"],
  "gw-address": ["crypto", "iranpay3", "tronado"],
  "gw-rate": ["crypto"],
  "gw-confirm": ["crypto"],
  "gw-fee": ["cubepay"],
  "gw-wage": ["tronado"],
  "gw-crypto-block": ["crypto", "plisio", "iranpay3", "tronado"],
};
function svApplyPf(scope, type) {
  const root = typeof scope === "string" ? document.getElementById(scope) : scope;
  if (!root) return;
  root.querySelectorAll("[data-pf]").forEach((el) => {
    const show = String(el.dataset.pf || "")
      .split(/\s+/)
      .filter(Boolean)
      .some((g) => (SV_PF_GROUPS[g] || []).includes(type));
    el.classList.toggle("hidden", !show);
  });
}
function svPfSync() {
  const box = document.getElementById("modal-box");
  const type = vVal("sv-provider") || vVal("sg-type");
  if (box && type) svApplyPf(box, type);
  const hint = document.getElementById("sv-provider-hint");
  if (hint) {
    const meta = type && SV.meta?.providers?.[type];
    hint.innerHTML = meta?.hint
      ? `<span class="v-badge">${esc(meta.label || type)}</span> <span dir="ltr">${esc(meta.hint)}</span>`
      : "";
  }
}
document.addEventListener("change", (e) => {
  if (e.target && (e.target.id === "sv-provider" || e.target.id === "sg-type")) svPfSync();
});
const svRows = (body) => `<div class="space-y-4">${body}</div>`;
const svRole = (role) =>
  ({
    customer: L("کاربر عادی", "Customer"),
    agent: L("نماینده", "Reseller"),
    credit_agent: L("نماینده اعتباری", "Credit reseller"),
  })[role] || role;
const svStatus = (status) =>
  ({
    queued: L("در صف", "Queued"),
    sending: L("در حال انجام", "Processing"),
    review: L("نیازمند بررسی", "Needs review"),
    done: L("انجام شد", "Done"),
    pending: L("در انتظار", "Pending"),
    receipt_review: L("بررسی فیش", "Receipt review"),
    paid: L("پرداخت تأیید شده", "Paid"),
    active: L("فعال", "Active"),
    disabled: L("غیرفعال", "Disabled"),
    available: L("موجود", "Available"),
    reserved: L("رزرو", "Reserved"),
    delivered: L("تحویل داده‌شده", "Delivered"),
    on_hold: L("شروع با اتصال", "Starts on first use"),
    expired: L("منقضی", "Expired"),
    failed: L("ناموفق", "Failed"),
    refunded: L("مسترد شده", "Refunded"),
    rejected: L("رد شده", "Rejected"),
    cancelled: L("لغو شده", "Cancelled"),
    approved: L("تأیید شده", "Approved"),
    drawn: L("قرعه‌کشی انجام شد", "Drawn"),
    processing: L("در حال پردازش", "Processing"),
    open: L("باز", "Open"),
    resolved: L("بررسی شد", "Resolved"),
    deleted: L("حذف شده", "Deleted"),
  })[status] || status;
const svBadge = (value) =>
  `<span class="v-badge ${["review", "receipt_review", "pending", "reserved", "on_hold"].includes(value) ? "warn" : ["paid", "done", "active", "available", "approved"].includes(value) ? "good" : ["failed", "rejected", "deleted"].includes(value) ? "bad" : ""}">${svStatus(value)}</span>`;
const svNum = (n, digits = 2) =>
  Number(n || 0).toLocaleString(loc(), { maximumFractionDigits: digits });
const svJSON = (id) => {
  const text = vVal(id);
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(
      L(
        "فرمت تنظیمات پیشرفته JSON درست نیست.",
        "Advanced settings are not valid JSON.",
      ),
    );
  }
};
const svOldError = vError;
vError = (code) => {
  const map = {
    market_rates_unavailable: L(
      "منبع نرخ ارز در دسترس نیست؛ بعداً دوباره تلاش کنید.",
      "Market rates are unavailable. Try again later.",
    ),
    market_rates_stale: L(
      "نرخ ذخیره‌شده منقضی است؛ فاکتور جدید با نرخ قدیمی ساخته نمی‌شود.",
      "Stored rates expired; a stale quote will not be used.",
    ),
    market_response_invalid: L(
      "پاسخ منبع نرخ معتبر نیست.",
      "Invalid rate-provider response.",
    ),
    market_pair_missing: L(
      "نرخ یکی از جفت‌های لازم در پاسخ منبع نیست.",
      "A required market pair is missing.",
    ),
    report_chat_required: L(
      "ابتدا چت گزارش مدیر را تنظیم کنید.",
      "Configure the administrator report chat first.",
    ),
    invalid_rate_intervals: L(
      "حداکثر عمر نرخ باید کمتر از فاصله بررسی نباشد.",
      "Maximum quote age must be at least the refresh interval.",
    ),
    vault_key_required: L(
      "ابتدا secret با نام VAULT_KEY را در Cloudflare تنظیم کنید (حداقل ۳۲ کاراکتر). اطلاعات اتصال رمزگذاری می‌شوند.",
      "Configure a VAULT_KEY secret in Cloudflare (at least 32 characters) to encrypt credentials.",
    ),
    vault_decryption_failed: L(
      "کلید رمزگذاری با اطلاعات ذخیره‌شده مطابقت ندارد؛ VAULT_KEY قبلی لازم است.",
      "The encryption key does not match. Restore the original VAULT_KEY.",
    ),
    panel_https_required: L(
      "نشانی پنل باید HTTPS با دامنه عمومی و گواهی معتبر باشد.",
      "Use a public HTTPS panel URL with a valid certificate.",
    ),
    panel_credentials_required: L(
      "اطلاعات اتصال پنل را وارد کنید.",
      "Enter panel credentials.",
    ),
    provider_auth_failed: L(
      "ورود به پنل مقصد رد شد؛ توکن یا نام کاربری و رمز را بررسی کنید.",
      "Provider authentication failed. Check its credentials.",
    ),
    provider_network_error: L(
      "ارتباط با پنل برقرار نشد. عملیات نامشخص را بدون بررسی تکرار نکنید.",
      "Provider connection failed. Inspect uncertain operations before retrying.",
    ),
    stock_empty: L(
      "کانفیگ کافی در انبار موجود نیست.",
      "Not enough available configurations.",
    ),
    insufficient_balance: L(
      "موجودی یا سقف اعتبار کافی نیست.",
      "Insufficient balance or credit limit.",
    ),
    service_operation_pending: L(
      "این سرویس عملیات در حال انجام دارد.",
      "Another operation is pending for this service.",
    ),
    operation_not_in_review: L(
      "عملیات در وضعیت بررسی نیست.",
      "The operation is not under review.",
    ),
    cannot_cancel_uncertain_operation: L(
      "فقط عملیات شروع‌نشده قابل لغو است؛ نتیجه نامشخص را ابتدا با پنل تطبیق دهید.",
      "Only unstarted operations can be cancelled. Reconcile uncertain results first.",
    ),
    remote_creation_not_confirmed: L(
      "ساخت سرویس در پنل مقصد هنوز تأیید نشده است.",
      "The remote service was not confirmed.",
    ),
    remote_update_not_confirmed: L(
      "تغییر حجم یا زمان در پنل مقصد تأیید نشد.",
      "Remote quota or expiry changes were not confirmed.",
    ),
    panel_action_unsupported: L(
      "این عمل در API این نوع پنل پشتیبانی نمی‌شود.",
      "This provider API does not support the action.",
    ),
    quote_expired: L("پیش‌فاکتور منقضی شده است.", "Quote expired."),
    quote_changed: L(
      "قیمت یا تنظیمات تغییر کرده؛ دوباره پیش‌فاکتور بگیرید.",
      "Price or settings changed. Request a new quote.",
    ),
    public_url_required: L(
      "نشانی عمومی مینی‌اپ را در تنظیمات خدمات ثبت کنید.",
      "Configure the customer portal public URL.",
    ),
    receipt_review_required: L(
      "این فاکتور رسیدِ در انتظار بررسی ندارد.",
      "This invoice has no receipt awaiting review.",
    ),
    payment_not_verified: L(
      "درگاه هنوز پرداخت را تأیید نکرده است.",
      "Payment has not been verified.",
    ),
    payment_not_finished: L(
      "پرداخت هنوز نهایی نشده است.",
      "Payment is not finished yet.",
    ),
    invalid_amount: L(
      "مبلغ معتبر و صحیح به تومان وارد کنید.",
      "Enter a valid integer amount in toman.",
    ),
    user_not_found: L(
      "کاربر باید ابتدا ربات یا مینی‌اپ را باز کند.",
      "The user must first open the bot or Mini App.",
    ),
    adjustment_reason_required: L(
      "دلیل تغییر موجودی را وارد کنید.",
      "Enter an adjustment reason.",
    ),
    coupon_unavailable: L(
      "کد تخفیف معتبر نیست یا ظرفیت آن تمام شده است.",
      "The discount code is unavailable.",
    ),
    gateway_credentials_required: L(
      "کلید یا مرچنت درگاه را وارد کنید.",
      "Enter the gateway key or merchant ID.",
    ),
    usd_rate_required: L(
      "نرخ تبدیل دلار به تومان را در تنظیمات خدمات تعیین کنید.",
      "Set the USD-to-toman rate in service settings.",
    ),
    star_rate_required: L(
      "ارزش هر Star را در تنظیمات خدمات تعیین کنید.",
      "Set the Star-to-toman rate in service settings.",
    ),
    crypto_rate_required: L(
      "ارزش یک واحد رمزارز به تومان را وارد کنید.",
      "Enter the toman value of one coin.",
    ),
    backup_password_too_short: L(
      "رمز فایل پشتیبان باید حداقل ۱۲ کاراکتر باشد.",
      "Backup password must have at least 12 characters.",
    ),
    backup_decryption_failed: L(
      "رمز یا فایل پشتیبان صحیح نیست.",
      "Wrong backup password or file.",
    ),
    restore_requires_empty_services: L(
      "بازیابی فقط در ماژول خدمات خالی مجاز است؛ داده مالی موجود بازنویسی نمی‌شود.",
      "Restore is allowed only into an empty services module.",
    ),
    panel_has_services: L(
      "این پنل سرویس دارد؛ به جای حذف، غیرفعالش کنید.",
      "This panel has services. Disable it instead.",
    ),
    panel_has_plans: L(
      "ابتدا پلن‌های این پنل را تعیین تکلیف کنید.",
      "Resolve this panel’s plans first.",
    ),
    first_use_not_supported: L(
      "این پنل شروع زمان از اولین اتصال را پشتیبانی نمی‌کند.",
      "This provider does not support first-use expiry.",
    ),
    service_connection_details_missing: L(
      "پنل کاربر را ساخته اما لینک یا کانفیگ نداده؛ subscription base و API را بررسی کنید.",
      "User created but connection details are missing. Check subscription base and API settings.",
    ),
    confirm_manual_config_disable: L(
      "برای کانفیگ انباری، غیرفعال‌سازی واقعی باید دستی تأیید شود.",
      "For stock configurations, confirm manual deactivation first.",
    ),
    invalid_service_name: L(
      "نام سرویس فقط حروف لاتین، عدد، خط تیره و زیرخط؛ ۳ تا ۶۰ کاراکتر.",
      "Service names must use 3–60 ASCII letters, numbers, hyphens or underscores.",
    ),
    manual_sale_confirmation_required: L(
      "نام خریدار و تأیید دریافت مبلغ لازم است.",
      "Enter a buyer and confirm the manually received payment.",
    ),
    invalid_squad_ids: L("شناسه Squad باید UUID معتبر باشد؛ آن را از منابع پنل کپی کنید.", "Enter valid Squad UUIDs from provider resources."),
    rebecca_service_required: L("شناسه عددی Service ربکا را در پنل یا پلن وارد کنید.", "Set a numeric Rebecca Service ID on the provider or plan."),
    finite_expiry_required: L("این اتصال به مدت محدود نیاز دارد؛ روز را بیشتر از صفر تعیین کنید.", "This provider requires a finite expiry; set days greater than zero."),
    panel_token_required: L("توکن API پنل الزامی است.", "Provider API token is required."),
    signed_webhook_required: L("تأیید ترونادو فقط از وب‌هوک امضاشده انجام می‌شود؛ پس از پرداخت منتظر بمانید.", "Tronado requires its signed webhook; wait for the payment notification."),
    payment_requires_review: L("وضعیت این فاکتور نیازمند بررسی مدیر است.", "This invoice requires administrator review."),
    unmanaged_wireguard_schedule_requires_review: L(
      "Job محدودیت ناشناخته روی peer وجود دارد؛ قبل از تمدید بررسی کنید.",
      "The peer has unmanaged limit jobs. Review before renewing.",
    ),
  };
  return (
    map[code] ||
    (code?.startsWith("provider_http_")
      ? L("پاسخ ناموفق پنل مقصد: ", "Provider HTTP error: ") + code.slice(14)
      : svOldError(code))
  );
};
const SV_TABS = [
  ["overview", "layout-dashboard", ["نمای کلی", "Overview"]],
  ["panels", "server", ["پنل‌ها", "Providers"]],
  ["plans", "layers", ["پلن‌ها", "Plans"]],
  ["stock", "warehouse", ["انبار", "Stock"]],
  ["services", "network", ["سرویس‌ها", "Services"]],
  ["operations", "workflow", ["عملیات", "Operations"]],
  ["accounts", "wallet", ["کیف پول", "Wallets"]],
  ["payments", "credit-card", ["پرداخت‌ها", "Payments"]],
  ["requests", "inbox", ["درخواست‌ها", "Requests"]],
  ["coupons", "ticket-percent", ["تخفیف و هدیه", "Promotions"]],
  ["campaigns", "trophy", ["گردونه و قرعه‌کشی", "Rewards"]],
  ["settings", "settings", ["تنظیمات", "Settings"]],
  ["backup", "archive", ["گزارش و پشتیبان", "Reports & backup"]],
];
// The workspace shell paints immediately; the heavy tab body streams in afterwards.
async function svMeta(force = false) {
  if (!force && SV.meta && Date.now() - SV.metaAt < 60000) return SV.meta;
  SV.meta = await svAPI("/bootstrap?counts=0");
  SV.metaAt = Date.now();
  return SV.meta;
}
async function studioServices() {
  await svMeta();
  setTimeout(() => svRefresh(), 0);
  return `<div class="sv-workspace"><div class="sv-header"><div><span class="v-eyebrow">SERVICE COMMERCE / CLOUDFLARE</span><h3>${L("مرکز فروش و مدیریت سرویس", "Service management center")}</h3><p>${L("مینی‌اپ مشتری، کیف پول و ساخت سرویس با ثبت مالی هماهنگ", "Customer portal, coordinated wallet accounting and service provisioning")}</p></div><div class="flex items-center gap-2 flex-wrap">${svBtn(L("باز/بستن همه بخش‌ها", "Expand / collapse all"), "secAll")}<span class="v-badge ${SV.meta.ready.vault ? "good" : "warn"}">${SV.meta.ready.vault ? L("رمزگذاری اتصال آماده است", "Credential vault ready") : L("تنظیم VAULT_KEY لازم است", "VAULT_KEY required")}</span></div></div><nav class="v-tabs sv-tabs">${SV_TABS.map(([id, icon, label]) => `<button type="button" class="v-tab ${SV.tab === id ? "active" : ""}" data-act="svTab" data-tab="${id}">${vIcon(icon)}${label[S.lang === "en" ? 1 : 0]}</button>`).join("")}</nav><div id="sv-body"><div class="v-skeleton"></div></div></div>`;
}
ACTIONS.svTab = async (d) => {
  SV.tab = d.tab;
  SV.offset = 0;
  document
    .querySelectorAll(".sv-tabs button")
    .forEach((b) => b.classList.toggle("active", b.dataset.tab === SV.tab));
  await svRefresh();
};
function svPaint(host, html) {
  host.innerHTML = html;
  refreshIcons();
  paintDropdowns(host);
  if (typeof updateSaveBar === "function") updateSaveBar();
}
async function svRefresh() {
  const host = $("sv-body");
  if (!host) return;
  const tab = SV.tab;
  const cached = SV.html[tab + ":" + SV.offset];
  const warm = cached && Date.now() - cached.at < 45000;
  // A previously rendered tab is shown instantly and refreshed in the background.
  if (warm) svPaint(host, cached.html);
  else host.innerHTML = '<div class="v-skeleton"></div>';
  try {
    const html = await svContent();
    if (SV.tab !== tab) return;
    SV.html[tab + ":" + SV.offset] = { html, at: Date.now() };
    const target = $("sv-body");
    if (target && target.isConnected) svPaint(target, html);
  } catch (e) {
    const target = $("sv-body");
    if (warm) toast(vError(e.message), "error");
    else if (target && target.isConnected)
      target.innerHTML =
        vNote(esc(vError(e.message)), true) +
        `<div class="mt-4">${svBtn(t("refresh"), "svRefresh")}</div>`;
  }
}
ACTIONS.svRefresh = () => svRefresh();
const svPaginator = (d) =>
  `<div class="v-actions mt-4"><span class="v-meta me-auto">${fmtNum(d.total || 0)} ${L("مورد", "records")}</span>${SV.offset ? svBtn("‹", "svPage", `data-offset="${Math.max(0, SV.offset - 50)}"`) : ""}${d.nextOffset != null ? svBtn("›", "svPage", `data-offset="${d.nextOffset}"`) : ""}</div>`;
ACTIONS.svPage = (d) => {
  SV.offset = Number(d.offset) || 0;
  svRefresh();
};
async function svContent() {
  return {
    overview: svOverview,
    panels: svPanels,
    plans: svPlans,
    stock: svStock,
    services: svServices,
    operations: svOperations,
    accounts: svAccounts,
    payments: svPayments,
    requests: svRequests,
    coupons: svPromotions,
    campaigns: svCampaigns,
    settings: svSettings,
    backup: svBackup,
  }[SV.tab]();
}
async function svOverview() {
  SV.meta = await svAPI("/bootstrap");
  SV.metaAt = Date.now();
  const c = SV.meta.counts;
  return svRows(
    `<div class="v-grid v-stagger">${[
      ["panels", c.panels, L("پنل متصل / تعریف‌شده", "Configured providers")],
      ["services", c.services, L("سرویس ثبت‌شده", "Services")],
      [
        "operations",
        c.pending,
        L("عملیات در صف یا بررسی", "Pending/review operations"),
      ],
      ["stock", c.stock, L("کانفیگ آماده", "Available configs")],
      ["payments", c.receipts, L("رسید منتظر بررسی", "Receipts to review")],
      ["accounts", c.wallets, L("کیف پول مشتری", "Customer wallets")],
    ]
      .map(
        ([tab, num, label]) =>
          `<button data-act="svTab" data-tab="${tab}" class="${CLS.card} p-5 text-start"><strong class="block text-2xl">${fmtNum(num)}</strong><span class="v-meta">${label}</span></button>`,
      )
      .join(
        "",
      )}</div>${vSection(L("شروع کار", "Getting started"), `<ol class="sv-steps"><li>${L("VAULT_KEY را در Cloudflare تنظیم کنید تا اطلاعات اتصال رمزگذاری شوند.", "Set VAULT_KEY in Cloudflare for encrypted provider credentials.")}</li><li>${L("یک پنل API یا انبار دستی بسازید، سپس پلن‌ها و قیمت‌ها را تعریف کنید.", "Add a provider or manual stock, then define plans and prices.")}</li><li>${L("روش پرداخت و نشانی عمومی مینی‌اپ را ثبت کنید. مشتری از /vpn یا /vpnportal وارد می‌شود.", "Configure payments and the portal URL. Customers enter using /vpn or /vpnportal.")}</li><li>${L("ابتدا با پلن کم‌حجم و حساب آزمایشی، خرید، تمدید و شکست اتصال را بررسی کنید.", "Test a small plan: purchase, renewal and connection failure.")}</li></ol>`)}${vNote(L("نام یک پنل در فهرست به معنی آزمایش اتصال زنده شما نیست. «آزمایش اتصال» را بزنید و نسخه/API مقصد را بررسی کنید. عملیات نامشخص پول را دوباره کسر نمی‌کند و نیازمند تطبیق است.", "A listed provider is not a live verification of your installation. Test its connection and API version. Uncertain operations require reconciliation, not another charge."), true)}`,
  );
}
async function svPanels() {
  const d = await svAPI("/panels");
  SV.cache.panels = d.rows;
  return vSection(
    L("پنل‌های سرویس و موقعیت‌ها", "Providers & locations"),
    d.rows.length
      ? d.rows
          .map(
            (p) =>
              `<div class="v-row"><span class="v-icon">${vIcon(p.type === "stock" ? "warehouse" : "server")}</span><div class="v-row-main"><p class="text-sm font-bold">${esc(p.title)} ${svBadge(p.enabled ? "active" : "disabled")} ${p.emergency ? '<span class="v-badge warn">' + L("اضطراری", "Emergency") + "</span>" : ""}</p><p class="v-meta">${esc(SV.meta.providers[p.type]?.label || p.type)} · ${esc(p.location)} · ${p.health ? (p.health.ok ? `<span class="sv-health-ok">${vIcon("check-circle-2")} ${p.health.ms} ms</span>` : `<span class="sv-health-warn">${vIcon("triangle-alert")} ${esc(vError(p.health.error))}</span>`) : L("اتصال آزمایش نشده", "Not tested")}</p></div><div class="v-actions">${svBtn(L("ویرایش", "Edit"), "svPanelEdit", `data-id="${p.id}"`)}${svBtn(L("آزمایش", "Test"), "svTestPanel", `data-id="${p.id}"`)}${p.capabilities.includes("inbounds") ? svBtn(L("منابع", "Resources"), "svResources", `data-id="${p.id}"`) : ""}${p.capabilities.includes("nodes") ? svBtn(L("نودها", "Nodes"), "svNodes", `data-id="${p.id}"`) : ""}</div></div>`,
          )
          .join("")
      : vEmpty(
          L(
            "اولین پنل یا انبار دستی را تعریف کنید.",
            "Add a provider or a manual stock location.",
          ),
          "server",
        ),
    svBtn(L("پنل جدید", "New provider"), "svPanelEdit", "", true),
  );
}
ACTIONS.svPanelEdit = async (d) => {
  const p = SV.cache.panels?.find((p) => p.id === d.id) || {
    type: "stock",
    enabled: true,
    capacity: 10000,
    options: {},
  };
  SV.edit = { kind: "panel", id: p.id || "", row: p };
  const shelves = (await svAPI("/shelves")).rows;
  vModal(
    L("اتصال پنل سرویس", "Service provider"),
    `<div class="grid sm:grid-cols-2 gap-4">${vField("sv-title", L("نام موقعیت", "Location title"), p.title, 'required maxlength="100"')}${vSelect(
      "sv-provider",
      L("نوع پنل / API", "Provider / API"),
      Object.entries(SV.meta.providers).map(([k, v]) => [k, v.label]),
      p.type,
    )}<div class="sm:col-span-2 -mt-1"><p id="sv-provider-hint" class="v-meta"></p></div>${vField("sv-location", L("موقعیت", "Location"), p.location)}${vField("sv-country", L("کد کشور (NL, DE, …)", "Country code (NL, DE, …)"), p.country, 'dir="ltr" maxlength="2"')}<div data-pf="pf-url">${vField("sv-url", L("نشانی HTTPS پنل (شامل مسیر مخفی در صورت نیاز)", "HTTPS URL (include the panel path)"), p.url, 'dir="ltr" placeholder="https://vpn.example.com/panel-path"')}</div>${vField("sv-capacity", L("سقف تعداد سرویس", "Service capacity"), p.capacity, 'type="number" min="1" max="100000" required')}</div><div data-pf="pf-api"><div class="v-divider"></div>${vNote(L("فیلدهای خالی ورود، رمز قبلی را حفظ می‌کنند. برای انبار دستی اطلاعات ورود لازم نیست. URL باید HTTPS با گواهی معتبر باشد؛ غیرفعال‌کردن اعتبارسنجی TLS پشتیبانی نمی‌شود.", "Leave credential fields blank to keep them. Manual stock requires no login. HTTPS with a valid certificate is mandatory."), !SV.meta.ready.vault)}<div class="grid sm:grid-cols-2 gap-4"><div data-pf="pf-login">${vField("sv-login", L("نام کاربری پنل", "Provider username"), "", 'autocomplete="off" dir="ltr"')}</div><div data-pf="pf-login">${vField("sv-password", L("رمز پنل", "Provider password"), "", 'type="password" autocomplete="new-password" dir="ltr"')}</div><div data-pf="pf-token">${vField("sv-api-token", L("توکن / API Key", "Token / API key"), "", 'type="password" autocomplete="new-password" dir="ltr"')}</div><div data-pf="pf-cf">${vField("sv-cf-id", "CF Access Client ID", "", 'dir="ltr"')}</div><div data-pf="pf-cf">${vField("sv-cf-secret", "CF Access Client Secret", "", 'type="password" dir="ltr"')}</div></div><div class="grid sm:grid-cols-2 gap-4"><div data-pf="pf-inbound">${vField("sv-inbound", L("شناسه inbound (x-ui)", "Inbound ID (x-ui)"), p.options.inboundId || 1, 'type="number" min="1"')}</div><div data-pf="pf-ids">${vField("sv-serviceids", L("Service / Group IDs (با کاما)", "Service / Group IDs (comma-separated)"), (p.options.serviceIds || []).join(","), 'dir="ltr"')}</div><div data-pf="pf-squads">${vField("sv-squads", L("Squad UUIDها (با کاما)", "Squad UUIDs (comma-separated)"), (p.options.squadIds || []).join(","), 'dir="ltr"')}${vField("sv-hwid", L("سقف دستگاه HWID؛ صفر نامحدود", "HWID device limit; 0 unlimited"), p.options.hwidDeviceLimit || 0, 'type="number" min="0" max="1000"')}</div><div data-pf="pf-rebecca">${vField("sv-rebecca-service", "Rebecca Service ID", p.options.serviceId || "", 'type="number" min="1"')}${vField("sv-ip-limit", L("سقف IP؛ صفر نامحدود", "IP limit; 0 unlimited"), p.options.ipLimit || 0, 'type="number" min="0" max="1000"')}</div><div data-pf="pf-interface">${vField("sv-interface", L("Interface وایرگارد", "WireGuard interface"), p.options.interface || "wg0", 'dir="ltr"')}</div><div data-pf="pf-subbase">${vField("sv-subbase", L("پایه لینک اشتراک؛ در صورت نیاز", "Subscription base URL, if required"), p.options.subscriptionBase, 'dir="ltr"')}</div></div></div><div data-pf="pf-shelf"><div class="grid sm:grid-cols-2 gap-4">${vSelect("sv-shelf", L("قفسه پیش‌فرض انبار", "Default stock shelf"), [["", L("انتخاب قفسه", "Select shelf")], ...shelves.map((s) => [s.id, s.title])], p.options.shelfId || "")}</div></div><div data-pf="pf-profile"><div class="grid sm:grid-cols-2 gap-4">${vField("sv-profile", L("گروه IBSng / Profile میکروتیک", "IBSng group / MikroTik profile"), p.options.profile, 'dir="ltr"')}</div></div><div data-pf="pf-api"><details class="v-media-details"> <summary>${L("تنظیمات پیشرفته پروتکل‌ها و inboundها", "Advanced protocol & inbound settings")}</summary><div class="pt-4">${vArea("sv-options", "JSON", JSON.stringify(p.options || {}, null, 2), 5, 'dir="ltr"')}</div></details></div>${vCheck("sv-enabled", L("فروش روی این پنل فعال باشد", "Enable sales on this provider"), p.enabled)}${vCheck("sv-emergency", L("هدایت فروش جدید به پنل جایگزین", "Route new purchases to an emergency provider"), p.emergency)}${vSelect("sv-fallback", L("پنل جایگزین", "Fallback provider"), [["", L("بدون جایگزین", "No fallback")], ...(SV.cache.panels || []).filter((x) => x.id !== p.id).map((x) => [x.id, x.title])], p.fallbackPanelId || "")}`,
    "svSavePanel",
  );
  svPfSync();
};
ACTIONS.svSavePanel = async () => {
  const options = {
    ...svJSON("sv-options"),
    inboundId: vNum("sv-inbound"),
    serviceIds: vList(vVal("sv-serviceids")).map(Number),
    interface: vVal("sv-interface"),
    subscriptionBase: vVal("sv-subbase"),
    shelfId: vVal("sv-shelf"),
    profile: vVal("sv-profile"),
  };
  if (vVal("sv-provider") === "remnawave") {
    options.squadIds = vList(vVal("sv-squads"));
    options.hwidDeviceLimit = vNum("sv-hwid");
  }
  if (vVal("sv-provider") === "rebecca") {
    if (vVal("sv-rebecca-service")) options.serviceId = vNum("sv-rebecca-service");
    else delete options.serviceId;
    options.ipLimit = vNum("sv-ip-limit");
  }
  if (options.serviceIds.some((n) => !Number.isInteger(n) || n < 1))
    throw new Error(
      L(
        "شناسه‌های سرویس باید عدد صحیح مثبت باشند.",
        "Service IDs must be positive integers.",
      ),
    );
  const data = {
    title: vVal("sv-title"),
    type: vVal("sv-provider"),
    url: vVal("sv-url"),
    location: vVal("sv-location"),
    country: vVal("sv-country"),
    capacity: vNum("sv-capacity"),
    options,
    enabled: vOn("sv-enabled"),
    emergency: vOn("sv-emergency"),
    fallbackPanelId: vVal("sv-fallback"),
    secret: {
      username: vVal("sv-login"),
      password: vVal("sv-password"),
      token: vVal("sv-api-token"),
      accessClientId: vVal("sv-cf-id"),
      accessClientSecret: vVal("sv-cf-secret"),
    },
  };
  await svAPI("/panels" + (SV.edit.id ? "/" + SV.edit.id : ""), {
    method: SV.edit.id ? "PUT" : "POST",
    body: data,
  });
  closeModal();
  toast(t("saved"), "success");
  svRefresh();
};
ACTIONS.svTestPanel = async (d, el) => {
  el.disabled = true;
  try {
    const r = await svAPI("/panels/" + d.id + "/test", { method: "POST" });
    toast(
      r.health.ok
        ? L("اتصال موفق", "Connection successful")
        : vError(r.health.error),
      r.health.ok ? "success" : "error",
    );
    await svRefresh();
  } finally {
    el.disabled = false;
  }
};
ACTIONS.svResources = async (d) => {
  const r = await svAPI("/panels/" + d.id + "/resources");
  openModal(
    `<div class="p-6"><h3 class="font-bold mb-4">${L("منابع واقعی پنل", "Provider resources")}</h3><p class="v-meta">${L("شناسه‌ها و tagها را در تنظیمات پنل/پلن وارد کنید.", "Use these IDs and tags in provider or plan settings.")}</p><pre class="sv-codeblock">${esc(JSON.stringify(r.resources, null, 2))}</pre>${svBtn(t("close"), "modalClose")}</div>`,
  );
};
ACTIONS.svNodes = async (d) => {
  const r = await svAPI("/panels/" + d.id + "/nodes");
  const rows = Array.isArray(r.nodes) ? r.nodes : r.nodes?.items || [];
  openModal(
    `<div class="p-6"><h3 class="font-bold mb-4">${L("نودهای پنل", "Provider nodes")}</h3>${rows.map((n) => `<div class="v-row"><div class="v-row-main"><b>${esc(n.name || n.id)}</b><p class="v-meta">${esc(n.status || "")}</p></div>${svBtn(L("اتصال مجدد", "Reconnect"), "svNodeReconnect", `data-id="${d.id}" data-node="${esc(n.id)}"`)}</div>`).join("") || vEmpty(L("نودی برنگشت.", "No nodes returned."))}</div>`,
  );
};
ACTIONS.svNodeReconnect = async (d) => {
  await svAPI("/panels/" + d.id + "/nodes/" + d.node + "/reconnect", {
    method: "POST",
  });
  toast(t("saved"), "success");
};
async function svPlans() {
  const [p, panels] = await Promise.all([svAPI("/plans"), svAPI("/panels")]);
  SV.cache.plans = p.rows;
  SV.cache.panels = panels.rows;
  return vSection(
    L("تعرفه‌ها و پلن‌های فروش", "Service plans & pricing"),
    p.rows.length
      ? p.rows
          .map(
            (p) =>
              `<div class="v-row"><div class="v-row-main"><p class="text-sm font-bold">${esc(p.title)} ${svBadge(p.enabled ? "active" : "disabled")}</p><p class="v-meta">${vMoney(p.price)} · ${svNum(p.volumeGB)} GB · ${fmtNum(p.days)} ${L("روز", "days")} · ${esc(p.category || "")} ${p.custom ? " · " + L("دلخواه", "Custom") : ""}</p></div><div class="v-actions">${svBtn(t("edit"), "svPlanEdit", `data-id="${p.id}"`)}${svBtn(L("غیرفعال", "Disable"), "svDisable", `data-kind="plans" data-id="${p.id}"`)}</div></div>`,
          )
          .join("")
      : vEmpty(
          L(
            "ابتدا یک پنل، سپس پلن بسازید.",
            "Add a provider first, then create a plan.",
          ),
          "layers",
        ),
    svBtn(L("پلن جدید", "New plan"), "svPlanEdit", "", true),
  );
}
ACTIONS.svPlanEdit = async (d) => {
  const p = SV.cache.plans?.find((p) => p.id === d.id) || {
    enabled: true,
    days: 30,
    volumeGB: 20,
    price: 0,
    prices: {},
    roles: ["customer", "agent", "credit_agent"],
    options: {},
    minGB: 1,
    maxGB: 1000,
    minDays: 1,
    maxDays: 365,
  };
  SV.edit = { kind: "plan", id: p.id || "", row: p };
  const shelves = (await svAPI("/shelves")).rows;
  vModal(
    L("پلن خدمات", "Service plan"),
    `<div class="grid sm:grid-cols-2 gap-4">${vField("sp-title", L("عنوان", "Title"), p.title, 'required maxlength="100"')}${vField("sp-title-en", "English title", p.titleEn, 'dir="ltr"')}${vSelect("sp-panel", L("پنل / موقعیت", "Provider / location"), [["", L("انتخاب پنل", "Choose provider")], ...(SV.cache.panels || []).map((p) => [p.id, p.title])], p.panelId || "")}${vField("sp-category", L("دسته‌بندی", "Category"), p.category)}${vField("sp-price", L("قیمت تومان", "Price (toman)"), p.price, 'type="number" min="0" required')}${vField("sp-gb", L("حجم GB؛ صفر نامحدود", "GB quota; 0 = unlimited"), p.volumeGB, 'type="number" min="0" max="100000" step="0.1" required')}${vField("sp-days", L("روز؛ صفر نامحدود", "Days; 0 = unlimited"), p.days, 'type="number" min="0" max="3650" required')}${vSelect("sp-shelf", L("قفسه برای فروش انباری", "Shelf for stock sales"), [["", L("قفسه پیش‌فرض پنل", "Provider default shelf")], ...shelves.map((s) => [s.id, s.title])], p.stockShelfId || "")}</div>${vArea("sp-description", L("توضیحات", "Description"), p.description, 3)}${vCheck("sp-enabled", L("نمایش و فروش فعال", "Visible & available"), p.enabled)}${vCheck("sp-first", L("شروع زمان با اولین اتصال (فقط پنل پشتیبان)", "Start expiry on first connection (supported providers only)"), p.firstUse)}<div class="v-divider"></div><h4 class="text-sm font-bold">${L("قیمت نمایندگی و دسترسی", "Reseller prices & access")}</h4><div class="grid sm:grid-cols-2 gap-4">${vField("sp-agent-price", L("قیمت نماینده؛ خالی = قیمت پایه", "Reseller price; empty = base"), p.prices.agent ?? "", 'type="number" min="0"')}${vField("sp-credit-price", L("قیمت نماینده اعتباری", "Credit reseller price"), p.prices.credit_agent ?? "", 'type="number" min="0"')}</div><div class="flex flex-wrap gap-4">${["customer", "agent", "credit_agent"].map((r) => vCheck("sp-role-" + r, svRole(r), p.roles.includes(r))).join("")}</div><div class="v-divider"></div>${vCheck("sp-custom", L("خرید حجم و زمان دلخواه", "Custom volume & duration pricing"), p.custom)}<div class="grid sm:grid-cols-2 gap-4">${[
      ["perGB", L("قیمت هر GB دلخواه", "Custom price per GB")],
      ["perDay", L("قیمت هر روز دلخواه", "Custom price per day")],
      ["extraGB", L("قیمت GB اضافه", "Extra GB price")],
      ["extraDay", L("قیمت روز اضافه", "Extra day price")],
      ["minGB", L("حداقل GB دلخواه", "Minimum custom GB")],
      ["maxGB", L("حداکثر GB دلخواه", "Maximum custom GB")],
      ["minDays", L("حداقل روز دلخواه", "Minimum custom days")],
      ["maxDays", L("حداکثر روز دلخواه", "Maximum custom days")],
    ]
      .map(([k, l]) => vField("sp-" + k, l, p[k] || 0, 'type="number" min="0"'))
      .join(
        "",
      )}</div><details class="v-media-details"><summary>${L("تنظیمات اختصاصی API برای این پلن", "Plan-specific API settings")}</summary><div class="pt-4">${vArea("sp-options", "JSON", JSON.stringify(p.options, null, 2), 4, 'dir="ltr"')}</div></details>`,
    "svSavePlan",
  );
};
ACTIONS.svSavePlan = async () => {
  const data = {
    title: vVal("sp-title"),
    titleEn: vVal("sp-title-en"),
    panelId: vVal("sp-panel"),
    category: vVal("sp-category"),
    description: vVal("sp-description"),
    price: vNum("sp-price"),
    volumeGB: vNum("sp-gb"),
    days: vNum("sp-days"),
    stockShelfId: vVal("sp-shelf"),
    enabled: vOn("sp-enabled"),
    firstUse: vOn("sp-first"),
    custom: vOn("sp-custom"),
    roles: ["customer", "agent", "credit_agent"].filter((r) =>
      vOn("sp-role-" + r),
    ),
    prices: {
      agent: vVal("sp-agent-price"),
      credit_agent: vVal("sp-credit-price"),
    },
    options: svJSON("sp-options"),
  };
  for (const k of [
    "perGB",
    "perDay",
    "extraGB",
    "extraDay",
    "minGB",
    "maxGB",
    "minDays",
    "maxDays",
  ])
    data[k] = vNum("sp-" + k);
  await svAPI("/plans" + (SV.edit.id ? "/" + SV.edit.id : ""), {
    method: SV.edit.id ? "PUT" : "POST",
    body: data,
  });
  closeModal();
  toast(t("saved"), "success");
  svRefresh();
};
ACTIONS.svDisable = async (d) => {
  if (
    !(await confirmDlg(
      L(
        "این مورد غیرفعال شود؟ سوابق حفظ می‌شوند.",
        "Disable this item? History is preserved.",
      ),
      t("save"),
    ))
  )
    return;
  await svAPI("/" + d.kind + "/" + d.id, { method: "DELETE" });
  svRefresh();
};
async function svStock() {
  const [shelves, stock, panels] = await Promise.all([
    svAPI("/shelves"),
    svAPI(
      "/stock?offset=" + SV.offset + (SV.shelf ? "&shelf=" + SV.shelf : ""),
    ),
    svAPI("/panels"),
  ]);
  SV.cache.shelves = shelves.rows;
  SV.cache.panels = panels.rows;
  SV.cache.stock = stock.rows;
  return svRows(
    `${vNote(L("هر کانفیگ یک موجودی مستقل است. رزرو و تحویل اتمی است و یک کانفیگ به دو خریدار داده نمی‌شود. انبار دستی مصرف آنلاین را اندازه‌گیری نمی‌کند.", "Each configuration is an individual stock item with atomic reservation and delivery. Manual stock does not provide live traffic metering."))}${vSection(L("قفسه‌ها و کانفیگ‌های آماده", "Shelves & ready configurations"), vSelect("ss-filter", L("فیلتر قفسه", "Filter shelf"), [["", L("همه قفسه‌ها", "All shelves")], ...shelves.rows.map((s) => [s.id, s.title])], SV.shelf || "") + (stock.rows.length ? stock.rows.map((r) => `<div class="v-row"><div class="v-row-main"><p class="text-xs font-semibold">${esc(r.label || r.id)} ${svBadge(r.status)}</p><p class="v-meta">${esc(shelves.rows.find((s) => s.id === r.shelfId)?.title || "")} · ${fmtDate(r.createdAt)}</p></div><div class="v-actions">${svBtn(L("نمایش", "View"), "svStockView", `data-id="${r.id}"`)}${["available", "disabled"].includes(r.status) ? svBtn(L("تغییر وضعیت", "Toggle"), "svStockToggle", `data-id="${r.id}"`) : ""}</div></div>`).join("") + svPaginator(stock) : vEmpty(L("کانفیگی در این قفسه نیست.", "No configurations in this shelf."))), svBtn(L("قفسه جدید", "New shelf"), "svShelfNew") + svBtn(L("افزودن گروهی کانفیگ", "Import configs"), "svStockImport", "", true) + svBtn(L("فروش دستی عمده", "Manual bulk sale"), "svManualSale"))}`,
  );
}
document.addEventListener("change", (e) => {
  if (e.target.id === "ss-filter") {
    SV.shelf = e.target.value;
    SV.offset = 0;
    svRefresh();
  }
});
ACTIONS.svShelfNew = () =>
  vModal(
    L("قفسه جدید", "New shelf"),
    vField("ss-title", L("نام قفسه", "Shelf title"), "", "required") +
      vSelect(
        "ss-panel",
        L("پنل مرتبط؛ اختیاری", "Related provider; optional"),
        [
          ["", L("بدون ارتباط", "None")],
          ...(SV.cache.panels || []).map((p) => [p.id, p.title]),
        ],
        "",
      ),
    "svSaveShelf",
  );
ACTIONS.svSaveShelf = async () => {
  await svAPI("/shelves", {
    method: "POST",
    body: { title: vVal("ss-title"), panelId: vVal("ss-panel") },
  });
  closeModal();
  svRefresh();
};
ACTIONS.svStockImport = () =>
  vModal(
    L("ورود کانفیگ‌های آماده", "Import ready configurations"),
    vSelect(
      "ss-shelf",
      L("قفسه", "Shelf"),
      [
        ["", L("انتخاب قفسه", "Choose shelf")],
        ...(SV.cache.shelves || []).map((s) => [s.id, s.title]),
      ],
      SV.shelf || "",
    ) +
      vArea(
        "ss-content",
        L(
          "هر خط یک کانفیگ؛ حداکثر ۲۰۰ مورد",
          "One configuration per line; up to 200",
        ),
        "",
        9,
        'required dir="ltr"',
      ) +
      vNote(
        L(
          "برای WireGuard چندخطی، گزینه زیر را فعال کنید. داده‌ها با VAULT_KEY رمزگذاری می‌شوند.",
          "For a multiline WireGuard file, enable the option below. Data is encrypted using VAULT_KEY.",
        ),
      ) +
      vCheck(
        "ss-multiline",
        L("تمام متن یک کانفیگ است", "All text is a single configuration"),
      ),
    "svImportStock",
  );
ACTIONS.svImportStock = async () => {
  const items = vOn("ss-multiline")
    ? [vVal("ss-content")]
    : vLines(vVal("ss-content"));
  const r = await svAPI("/stock/import", {
    method: "POST",
    body: { shelfId: vVal("ss-shelf"), items },
  });
  closeModal();
  toast(
    `${r.imported} ${L("وارد شد", "imported")} · ${r.duplicates} ${L("تکراری", "duplicates")}`,
    "success",
  );
  svRefresh();
};
ACTIONS.svStockView = async (d) => {
  const r = await svAPI("/stock/" + d.id + "/content");
  openModal(
    `<div class="p-6"><h3 class="font-bold mb-4">${L("کانفیگ خصوصی", "Private configuration")}</h3><textarea class="${CLS.input}" rows="10" dir="ltr" readonly>${esc([r.subscriptionUrl, ...r.configs].filter(Boolean).join("\n"))}</textarea><div class="mt-4">${svBtn(t("close"), "modalClose")}</div></div>`,
  );
};
ACTIONS.svStockToggle = async (d) => {
  await svAPI("/stock/" + d.id + "/disable", { method: "POST" });
  svRefresh();
};
ACTIONS.svManualSale = () =>
  vModal(
    L("ثبت فروش دستی عمده", "Record manual bulk sale"),
    vSelect(
      "sm-shelf",
      L("قفسه", "Shelf"),
      [
        ["", L("انتخاب قفسه", "Choose shelf")],
        ...(SV.cache.shelves || []).map((s) => [s.id, s.title]),
      ],
      "",
    ) +
      vField("sm-buyer", L("نام خریدار", "Buyer"), "", "required") +
      vField(
        "sm-count",
        L("تعداد", "Count"),
        1,
        'type="number" min="1" max="100" required',
      ) +
      vField(
        "sm-amount",
        L("کل مبلغ دریافتی تومان", "Total manually received (toman)"),
        0,
        'type="number" min="0" required',
      ) +
      vCheck(
        "sm-confirm",
        L(
          "دریافت مبلغ را شخصاً تأیید می‌کنم؛ ثبت خودکار بانکی نیست.",
          "I personally verified payment; this is not automatic bank verification.",
        ),
      ),
    "svRecordManualSale",
    L("ثبت و تحویل کانفیگ‌ها", "Record & deliver configurations"),
  );
ACTIONS.svRecordManualSale = async () => {
  const r = await svAPI("/stock/manual-sale", {
    method: "POST",
    body: {
      shelfId: vVal("sm-shelf"),
      buyer: vVal("sm-buyer"),
      count: vNum("sm-count"),
      amount: vNum("sm-amount"),
      confirmPaid: vOn("sm-confirm"),
    },
  });
  closeModal();
  const text = r.contents
    .flatMap((c) => [c.subscriptionUrl, ...c.configs].filter(Boolean))
    .join("\n\n");
  svDownload(
    new Blob([text], { type: "text/plain" }),
    "sale-" + r.sale.id + ".txt",
  );
  toast(t("saved"), "success");
  svRefresh();
};
async function svServices() {
  const d = await svAPI("/services?offset=" + SV.offset);
  SV.cache.services = d.rows;
  return vSection(
    L("سرویس‌های مشتریان", "Customer services"),
    d.rows.length
      ? d.rows
          .map(
            (s) =>
              `<div class="v-row"><span class="v-icon">${vIcon("network")}</span><div class="v-row-main"><p class="text-sm font-semibold">${esc(s.title)} ${svBadge(s.status)}</p><p class="v-meta"><span class="v-code">${esc(s.username)}</span> · ${esc(s.userId)}<br>${s.usageAvailable ? svNum(s.usedBytes / 1073741824) + " / " + (s.dataLimit ? svNum(s.dataLimit / 1073741824) : "∞") + " GB" : L("انبار؛ مصرف آنلاین موجود نیست", "Stock; no live metering")} · ${s.expiresAt ? fmtDate(s.expiresAt * 1000) : L("بدون تاریخ ثابت", "No fixed expiry")}</p>${s.lastSyncError ? `<p class="v-meta text-rose-400">${esc(vError(s.lastSyncError))}</p>` : ""}</div><div class="v-actions">${svBtn(L("کانفیگ", "Config"), "svServiceContent", `data-id="${s.id}"`)}${svBtn(L("بروزرسانی", "Sync"), "svSyncService", `data-id="${s.id}"`)}${s.capabilities.includes("reset") ? svBtn(L("ریست مصرف", "Reset usage"), "svResetService", `data-id="${s.id}"`) : ""}</div></div>`,
          )
          .join("") + svPaginator(d)
      : vEmpty(
          L(
            "سرویس‌ها پس از خرید و ساخت در اینجا ظاهر می‌شوند.",
            "Services appear after purchase and provisioning.",
          ),
          "network",
        ),
    svBtn(t("refresh"), "svRefresh"),
  );
}
ACTIONS.svServiceContent = async (d) => {
  const v = await svAPI("/services/" + d.id + "/content");
  openModal(
    `<div class="p-6"><h3 class="font-bold mb-4">${L("اطلاعات اتصال", "Connection details")}</h3><textarea readonly dir="ltr" rows="10" class="${CLS.input}">${esc([v.proxyUrl || v.subscriptionUrl, ...v.configs].filter(Boolean).join("\n\n"))}</textarea><div class="mt-4">${svBtn(t("close"), "modalClose")}</div></div>`,
  );
};
ACTIONS.svSyncService = async (d) => {
  await svAPI("/services/" + d.id + "/sync", { method: "POST" });
  toast(t("saved"), "success");
  svRefresh();
};
ACTIONS.svResetService = async (d) => {
  if (
    !(await confirmDlg(
      L(
        "مصرف سرویس در پنل مقصد صفر شود؟ این عمل برگشت‌پذیر نیست.",
        "Reset traffic at the provider? This action cannot be undone.",
      ),
      L("ریست", "Reset"),
    ))
  )
    return;
  await svAPI("/services/" + d.id + "/reset", { method: "POST" });
  svRefresh();
};
async function svOperations() {
  const d = await svAPI("/operations?offset=" + SV.offset);
  return vSection(
    L("صف عملیات و تطبیق نتایج", "Operations & reconciliation"),
    vNote(
      L(
        "در نتیجه نامشخص، اعتبار رزروشده باقی می‌ماند. «تطبیق با پنل» نتیجه واقعی را می‌خواند؛ «اجرای دوباره» بدون بررسی انجام نمی‌شود.",
        "Uncertain operations retain their wallet hold. Reconciliation reads the remote result; it does not blindly create another service.",
      ),
      true,
    ) +
      (d.rows.length
        ? d.rows
            .map(
              (o) =>
                `<div class="v-row"><div class="v-row-main"><p class="text-sm">${esc(o.planTitle)} · ${esc(o.kind)} ${svBadge(o.status)}</p><p class="v-meta">${esc(o.userId)} · ${vMoney(o.amount)} · ${fmtDate(o.createdAt)}<br><span class="v-code">${o.id}</span>${o.error ? "<br>" + esc(vError(o.error)) : ""}</p></div><div class="v-actions">${o.status === "queued" ? svBtn(L("اجرای نوبت", "Run now"), "svOperation", `data-id="${o.id}" data-action="run"`) + svBtn(L("لغو و آزادسازی", "Cancel & release"), "svOperation", `data-id="${o.id}" data-action="cancel"`) : ""}${["sending", "review"].includes(o.status) ? svBtn(L("تطبیق با پنل", "Reconcile"), "svOperation", `data-id="${o.id}" data-action="reconcile"`) + svBtn(L("لغو فقط اگر اجرا نشده", "Cancel if not applied"), "svOperation", `data-id="${o.id}" data-action="cancel"`) : ""}</div></div>`,
            )
            .join("") + svPaginator(d)
        : vEmpty(L("عملیات در صف نیست.", "No queued operations."))),
  );
}
ACTIONS.svOperation = async (d, el) => {
  el.disabled = true;
  try {
    await svAPI("/operations/" + d.id + "/" + d.action, { method: "POST" });
    toast(t("saved"), "success");
    svRefresh();
  } finally {
    el.disabled = false;
  }
};
async function svAccounts() {
  const d = await svAPI("/accounts?offset=" + SV.offset);
  SV.cache.accounts = d.rows;
  return vSection(
    L("کیف پول و اعتبار نمایندگان", "Wallets & reseller credit"),
    d.rows.length
      ? d.rows
          .map(
            (a) =>
              `<div class="v-row"><div class="v-row-main"><p class="text-sm font-bold">${esc(a.name)} <span class="v-badge">${svRole(a.role)}</span></p><p class="v-meta">${esc(a.userId)} · ${L("مانده", "Balance")}: ${vMoney(a.balance)} · ${L("رزرو", "Held")}: ${vMoney(a.held)}<br>${L("قابل استفاده", "Available")}: ${vMoney(a.available)}</p></div><div class="v-actions">${svBtn(L("موجودی", "Balance"), "svAdjust", `data-id="${a.userId}"`)}${svBtn(L("نمایندگی", "Permissions"), "svAccountEdit", `data-id="${a.userId}"`)}${svBtn(L("گردش حساب", "Ledger"), "svLedger", `data-id="${a.userId}"`)}</div></div>`,
          )
          .join("") + svPaginator(d)
      : vEmpty(
          L(
            "کیف پول با ورود مشتری به بخش خدمات ایجاد می‌شود.",
            "Wallets are created when customers enter the services area.",
          ),
          "wallet",
        ),
    svBtn(L("تغییر موجودی با آیدی", "Adjust by user ID"), "svAdjust"),
  );
}
ACTIONS.svAdjust = (d) => {
  SV.edit = { id: d.id || "", requestId: crypto.randomUUID() };
  vModal(
    L("تغییر موجودی با ثبت حسابداری", "Audited wallet adjustment"),
    vField(
      "sa-user",
      L("آیدی عددی مشتری", "Customer Telegram ID"),
      d.id || "",
      'required dir="ltr"',
    ) +
      vField(
        "sa-amount",
        L(
          "مبلغ تغییر؛ مثبت افزایش، منفی کسر",
          "Signed amount; positive credit / negative debit",
        ),
        0,
        'type="number" step="1" required',
      ) +
      vArea(
        "sa-reason",
        L("دلیل تغییر", "Reason"),
        "",
        3,
        'required minlength="3"',
      ) +
      vNote(
        L(
          "این عمل یک ثبت دستی با نام مدیر است و به عنوان پرداخت بانکی معرفی نمی‌شود.",
          "This is an administrator adjustment, not a verified bank payment.",
        ),
        true,
      ),
    "svAdjustSave",
  );
};
ACTIONS.svAdjustSave = async () => {
  await svAPI("/accounts/" + vVal("sa-user") + "/adjust", {
    method: "POST",
    body: {
      amount: vNum("sa-amount"),
      reason: vVal("sa-reason"),
      requestId: SV.edit.requestId,
    },
  });
  closeModal();
  toast(t("saved"), "success");
  svRefresh();
};
ACTIONS.svAccountEdit = (d) => {
  const a = SV.cache.accounts.find((a) => a.userId === d.id);
  SV.edit = { id: d.id };
  vModal(
    L("دسترسی و اعتبار نماینده", "Reseller permissions & credit"),
    vSelect(
      "sa-role",
      L("نوع حساب", "Role"),
      ["customer", "agent", "credit_agent"].map((r) => [r, svRole(r)]),
      a.role,
    ) +
      vField(
        "sa-credit",
        L(
          "سقف اعتبار بدهی تومان؛ فقط نماینده اعتباری",
          "Debt credit limit; credit resellers only",
        ),
        a.creditLimit,
        'type="number" min="0" required',
      ) +
      vField(
        "sa-discount",
        L("تخفیف اختصاصی درصدی", "Personal discount (%)"),
        a.discountPercent,
        'type="number" min="0" max="100"',
      ) +
      vField(
        "sa-expiry",
        L("پایان نمایندگی؛ اختیاری", "Reseller expiry; optional"),
        vLocalTime(a.agentExpiresAt),
        'type="datetime-local"',
      ),
    "svAccountSave",
  );
};
ACTIONS.svAccountSave = async () => {
  await svAPI("/accounts/" + SV.edit.id, {
    method: "PUT",
    body: {
      role: vVal("sa-role"),
      creditLimit: vNum("sa-credit"),
      discountPercent: vNum("sa-discount"),
      agentExpiresAt: vVal("sa-expiry")
        ? new Date(vVal("sa-expiry")).getTime()
        : 0,
    },
  });
  closeModal();
  svRefresh();
};
ACTIONS.svLedger = async (d) => {
  const r = await svAPI("/accounts/" + d.id);
  openModal(
    `<div class="p-6"><h3 class="font-bold mb-4">${L("گردش کیف پول", "Wallet ledger")} · ${esc(d.id)}</h3>${r.ledger.map((e) => `<div class="v-row"><div class="v-row-main text-xs">${esc(e.reason)}<p class="v-meta">${fmtDate(e.at)} · ${esc(e.actor)}</p></div><b class="text-sm ${e.delta < 0 ? "text-rose-400" : "text-emerald-400"}">${vMoney(e.delta)}</b></div>`).join("") || vEmpty(L("گردشی نیست.", "No entries."))}${svBtn(t("close"), "modalClose")}</div>`,
  );
};

async function svPayments() {
  const [payments, gateways] = await Promise.all([
    svAPI("/payments?offset=" + SV.offset),
    svAPI("/gateways"),
  ]);
  SV.cache.gateways = gateways.rows;
  SV.cache.payments = payments.rows;
  return svRows(
    `${vSection(L("روش‌های پرداخت", "Payment methods"), gateways.rows.length ? gateways.rows.map((g) => `<div class="v-row"><div class="v-row-main"><p class="text-sm font-semibold">${esc(g.title)} ${svBadge(g.enabled ? "active" : "disabled")}</p><p class="v-meta">${esc(g.type)} · ${L("کش‌بک", "Cashback")}: ${g.cashback}% ${g.sandbox ? " · SANDBOX" : ""}</p></div><div class="v-actions">${svBtn(t("edit"), "svGatewayEdit", `data-id="${g.id}"`)}${svBtn(L("غیرفعال", "Disable"), "svDisable", `data-kind="gateways" data-id="${g.id}"`)}</div></div>`).join("") : vEmpty(L("روش پرداخت را اضافه کنید. بدون تنظیم حساب واقعی، اتصال زنده تأیید نشده است.", "Add a payment method. Live operation requires your provider account."), "credit-card"), svBtn(L("درگاه جدید", "Add gateway"), "svGatewayEdit", "", true))}${vSection(L("فاکتورهای شارژ کیف پول", "Wallet funding invoices"), payments.rows.length ? payments.rows.map((p) => `<div class="v-row"><div class="v-row-main"><p class="text-sm font-semibold">${esc(p.userId)} · ${vMoney(p.amount)} ${svBadge(p.status)}</p><p class="v-meta">${esc(p.type)} · ${fmtDate(p.createdAt)}<br><span class="v-code">${p.id}</span>${p.lastError || p.error ? "<br>" + esc(vError(p.lastError || p.error)) : ""}</p></div><div class="v-actions">${p.hasReceipt ? svBtn(L("فیش", "Receipt"), "svReceipt", `data-id="${p.id}"`) : ""}${p.status === "receipt_review" ? svBtn(L("بررسی فیش", "Review"), "svPaymentReview", `data-id="${p.id}"`) : ""}${!["paid", "rejected"].includes(p.status) && !["manual", "stars"].includes(p.type) ? svBtn(L("استعلام", "Verify"), "svVerifyPayment", `data-id="${p.id}"`) : ""}</div></div>`).join("") + svPaginator(payments) : vEmpty(L("فاکتوری ثبت نشده است.", "No funding invoices yet.")))}${vNote(L("رسید کارت‌به‌کارت نیازمند بررسی واقعی مدیر است؛ تصویر یا Status=OK به‌تنهایی تأیید پرداخت نیست. درگاه‌های TetraPay و Factor نیز مانند سایر درگاه‌ها با استعلام سمت سرور بررسی می‌شوند. Stars فقط از successful_payment معتبر تلگرام پذیرفته می‌شود.", "Bank receipts need real administrator review. Images or Status=OK are not payment proof. Gateways/blockchains are checked server-side; Stars use verified Telegram successful_payment events."), true)}`,
  );
}
ACTIONS.svGatewayEdit = (d) => {
  const g = SV.cache.gateways?.find((g) => g.id === d.id) || {
    type: "manual",
    enabled: true,
    cashback: 0,
    currency: "USDT_TRC20",
    confirmations: 20,
  };
  SV.edit = { id: g.id || "" };
  vModal(
    L("روش پرداخت", "Payment method"),
    `${vField("sg-title", L("عنوان نمایشی", "Display title"), g.title, "required")}${vSelect("sg-type", L("نوع درگاه", "Gateway type"), Object.entries(SV.meta.gateways), g.type)}${vCheck("sg-enabled", L("فعال باشد", "Enabled"), g.enabled)}<div class="grid sm:grid-cols-2 gap-4">${vField("sg-cashback", L("کش‌بک درصدی", "Cashback (%)"), g.cashback, 'type="number" min="0" max="100"')}<div data-pf="gw-merchant">${vField("sg-merchant", L("مرچنت؛ خالی حفظ قبلی", "Merchant ID; blank keeps existing"), "", 'type="password" autocomplete="new-password" dir="ltr"')}</div><div data-pf="gw-apikey">${vField("sg-api", L("API Key؛ خالی حفظ قبلی", "API key; blank keeps existing"), "", 'type="password" autocomplete="new-password" dir="ltr"')}</div><div data-pf="gw-ipn">${vField("sg-ipn", "IPN Signing Secret (NOWPayments / Tronado)", "", 'type="password" autocomplete="new-password" dir="ltr"')}</div></div><div data-pf="gw-fee"><div class="grid sm:grid-cols-2 gap-4">${vField("sg-fee-percent", L("کارمزد افزوده به فاکتور (%)", "Invoice surcharge (%)"), g.feePercent || 0, 'type="number" min="0" max="100"')}${vField("sg-fee-toman", L("کارمزد ثابت افزوده (تومان)", "Fixed invoice surcharge (toman)"), g.feeToman || 0, 'type="number" min="0"')}</div>${vNote(L("کارمزد فقط مبلغ فاکتور را افزایش می‌دهد؛ اعتبار کیف پول همان مبلغ درخواستی است.", "Surcharges increase the invoice, not the wallet credit."))}</div><div data-pf="gw-wage">${vField("sg-wage", L("درصد کارمزد پرداختی کسب‌وکار", "Business share of gateway fee (%)"), g.wagePercent || 0, 'type="number" min="0" max="100"')}</div><div data-pf="gw-sandbox">${vCheck("sg-sandbox", L("زرین‌پال آزمایشی؛ در محیط واقعی خاموش باشد", "Zarinpal sandbox; disable for production"), g.sandbox)}</div><div data-pf="gw-card"><div class="v-divider"></div><h4 class="text-sm font-bold">${L("کارت‌به‌کارت", "Bank transfer")}</h4><div class="grid sm:grid-cols-2 gap-4">${vField("sg-card", L("شماره کارت", "Card number"), g.cardNumber, 'dir="ltr" inputmode="numeric"')}${vField("sg-holder", L("صاحب کارت", "Card holder"), g.cardHolder)}</div></div><div data-pf="gw-crypto-block"><div class="v-divider"></div><h4 class="text-sm font-bold">${L("رمزارز مستقیم / Factor API", "Direct cryptocurrency / Factor API")}</h4><div class="grid sm:grid-cols-2 gap-4"><div data-pf="gw-currency">${vSelect(
      "sg-currency",
      L("ارز / شبکه", "Currency / network"),
      [
        ["USDT_TRC20", "USDT · TRON"],
        ["TRX", "TRX · TRON"],
        ["TON", "TON"],
        ["USDT_TON", "USDT · TON"],
      ],
      g.currency,
    )}</div><div data-pf="gw-address">${vField("sg-address", L("آدرس کیف پول دریافت‌کننده (نه کلید خصوصی)", "Receiving wallet address (never a private key)"), g.address, 'dir="ltr"')}</div><div data-pf="gw-rate">${vField("sg-rate", L("قیمت یک واحد ارز به تومان", "Toman per one coin"), g.coinToman || 0, 'type="number" min="0"')}</div><div data-pf="gw-confirm">${vField("sg-confirmations", L("تعداد تأیید TRON", "TRON confirmations"), g.confirmations, 'type="number" min="1" max="1000"')}</div></div></div>${vNote(L("برای NOWPayments/Plisio نرخ دلار و برای Stars نرخ Star در تنظیمات خدمات لازم است. عبارت بازیابی یا کلید خصوصی کیف پول در این پنل وارد نکنید.", "Set USD/Star conversion rates in service settings. Never enter seed phrases or wallet private keys."), true)}`,
    "svGatewaySave",
  );
  svPfSync();
};
ACTIONS.svGatewaySave = async () => {
  await svAPI("/gateways" + (SV.edit.id ? "/" + SV.edit.id : ""), {
    method: SV.edit.id ? "PUT" : "POST",
    body: {
      title: vVal("sg-title"),
      type: vVal("sg-type"),
      enabled: vOn("sg-enabled"),
      cashback: vNum("sg-cashback"),
      feePercent: vNum("sg-fee-percent"),
      feeToman: vNum("sg-fee-toman"),
      wagePercent: vNum("sg-wage"),
      currency: vVal("sg-currency"),
      address: vVal("sg-address"),
      coinToman: vNum("sg-rate"),
      confirmations: vNum("sg-confirmations"),
      cardNumber: vVal("sg-card"),
      cardHolder: vVal("sg-holder"),
      sandbox: vOn("sg-sandbox"),
      secret: {
        merchant: vVal("sg-merchant"),
        apiKey: vVal("sg-api"),
        ipnSecret: vVal("sg-ipn"),
      },
    },
  });
  closeModal();
  toast(t("saved"), "success");
  svRefresh();
};
ACTIONS.svReceipt = async (d) => {
  const blob = await vAuthorizedFile("/services/payments/" + d.id + "/receipt");
  const url = vBlobUrl(blob);
  openModal(
    `<div class="p-6"><h3 class="font-bold mb-4">${L("فیش پرداخت", "Payment receipt")}</h3>${blob.type.startsWith("image/") ? `<img class="v-preview" style="max-height:65vh" alt="${L("رسید نیازمند بررسی", "Receipt awaiting review")}" src="${url}">` : ""}<div class="flex gap-3 mt-4"><a class="${CLS.btnP}" href="${url}" download="receipt">${L("دانلود", "Download")}</a>${svBtn(t("close"), "modalClose")}</div></div>`,
  );
};
ACTIONS.svPaymentReview = (d) => {
  SV.edit = { id: d.id };
  const p = SV.cache.payments.find((p) => p.id === d.id);
  vModal(
    L("بررسی دستی فیش", "Manual receipt review"),
    `<p class="text-lg font-bold">${vMoney(p.amount)}</p><p class="v-code">${p.id}</p>${vNote(L("تأیید فقط پس از مشاهده واریز واقعی به حساب شما. با تأیید، کیف پول مشتری شارژ می‌شود.", "Approve only after checking the actual bank transfer. Approval credits the customer wallet."), true)}${vSelect(
      "sg-decision",
      L("تصمیم", "Decision"),
      [
        ["approve", L("تأیید واریز واقعی", "Approve verified transfer")],
        ["reject", L("رد رسید", "Reject receipt")],
      ],
      "reject",
    )}${vArea("sg-reason", L("دلیل رد؛ در صورت رد اجباری", "Rejection reason; required when rejecting"))}`,
    "svPaymentDecide",
  );
};
ACTIONS.svPaymentDecide = async () => {
  await svAPI("/payments/" + SV.edit.id + "/" + vVal("sg-decision"), {
    method: "POST",
    body: { reason: vVal("sg-reason") },
  });
  closeModal();
  toast(t("saved"), "success");
  svRefresh();
};
ACTIONS.svVerifyPayment = async (d, el) => {
  el.disabled = true;
  try {
    await svAPI("/payments/" + d.id + "/verify", { method: "POST", body: {} });
    toast(t("saved"), "success");
    svRefresh();
  } finally {
    el.disabled = false;
  }
};
async function svRequests() {
  const [d, p] = await Promise.all([svAPI("/requests"), svAPI("/panels")]);
  SV.cache.requests = d.rows;
  SV.cache.agentRequests = d.agents;
  SV.cache.panels = p.rows;
  return svRows(
    `${vSection(L("درخواست‌های سرویس", "Service requests"), d.rows.length ? d.rows.map((r) => `<div class="v-row"><div class="v-row-main"><p class="text-sm font-semibold">${esc(r.kind)} · ${esc(r.userId)} ${svBadge(r.status)}</p><p class="v-meta">${esc(r.note || "")}<br>${fmtDate(r.createdAt)}${r.error ? "<br>" + esc(vError(r.error)) : ""}</p></div><div class="v-actions">${["pending", "review"].includes(r.status) ? svBtn(L("بررسی", "Review"), "svRequestEdit", `data-id="${r.id}"`) : ""}</div></div>`).join("") : vEmpty(L("درخواستی وجود ندارد.", "No service requests.")))}${vSection(L("درخواست نمایندگی", "Reseller requests"), d.agents.length ? d.agents.map((r) => `<div class="v-row"><div class="v-row-main"><b class="text-sm">${esc(r.userId)} ${svBadge(r.status)}</b><p class="v-meta">${esc(r.note || "")}</p></div>${r.status === "pending" ? svBtn(L("بررسی", "Review"), "svAgentRequest", `data-id="${r.id}"`) : ""}</div>`).join("") : vEmpty(L("درخواست نمایندگی ثبت نشده است.", "No reseller requests.")))}`,
  );
}
ACTIONS.svRequestEdit = (d) => {
  const r = SV.cache.requests.find((r) => r.id === d.id);
  SV.edit = { id: r.id, kind: r.kind, row: r };
  vModal(
    L("بررسی درخواست سرویس", "Review service request"),
    `<p class="text-sm font-bold">${esc(r.kind)} · ${esc(r.userId)}</p><p class="v-meta">${esc(r.note || "")}</p>${r.status === "review" ? vNote(L("نتیجه قبلی نامشخص است. فقط پس از بررسی وضعیت واقعی از تطبیق استفاده کنید؛ در صورت نیاز، اطلاعات زیر برای بررسی مدیر پنل مقصد است.", "Previous result is uncertain. Reconcile only against the actual provider state."), true) + `<details class="v-media-details"><summary>${L("اطلاعات رفع ابهام", "Reconciliation details")}</summary><pre class="sv-codeblock">${esc(JSON.stringify(r, null, 2))}</pre></details>` : ""}${vSelect(
      "sr-decision",
      L("تصمیم", "Decision"),
      [
        ["approve", L("تأیید / ادامه", "Approve / continue")],
        ["reject", L("رد درخواست", "Reject")],
      ],
      "reject",
    )}${vArea("sr-answer", L("پاسخ مدیر", "Administrator response"))}${r.kind === "refund" ? vField("sr-amount", L("مبلغ استرداد تومان؛ حداکثر مبلغ پرداخت‌شده", "Refund amount; up to amount paid"), r.amount || 0, 'type="number" min="0"') + vCheck("sr-manual", L("برای انبار دستی: غیرفعال‌سازی واقعی کانفیگ را خارج از پنل انجام داده‌ام.", "For manual stock: I have deactivated the actual configuration externally.")) : ""}${r.kind === "move" ? vSelect("sr-panel", L("پنل مقصد", "Destination provider"), [["", L("انتخاب مقصد", "Choose destination")], ...(SV.cache.panels || []).filter((p) => p.type !== "stock").map((p) => [p.id, p.title])], r.targetPanelId || "") : ""}${r.kind === "transfer" ? vNote(L("گیرنده: ", "Recipient: ") + esc(r.targetUserId) + L("؛ لینک قدیمی تغییر می‌کند و مالکیت پنل منتقل می‌شود.", "; the link is rotated and portal ownership is transferred."), true) : ""}`,
    "svRequestSave",
  );
};
ACTIONS.svRequestSave = async () => {
  await svAPI("/requests/" + SV.edit.id + "/decide", {
    method: "POST",
    body: {
      approve: vVal("sr-decision") === "approve",
      answer: vVal("sr-answer"),
      amount: vNum("sr-amount"),
      targetPanelId: vVal("sr-panel"),
      confirmManualDisable: vOn("sr-manual"),
      reconcile: SV.edit.row.status === "review",
    },
  });
  closeModal();
  toast(t("saved"), "success");
  svRefresh();
};
ACTIONS.svAgentRequest = (d) => {
  SV.edit = { id: d.id };
  vModal(
    L("درخواست نمایندگی", "Reseller request"),
    vSelect(
      "sar-decision",
      L("تصمیم", "Decision"),
      [
        ["approve", L("تأیید", "Approve")],
        ["reject", L("رد", "Reject")],
      ],
      "reject",
    ) +
      vSelect(
        "sar-role",
        L("نوع نماینده", "Reseller role"),
        [
          ["agent", svRole("agent")],
          ["credit_agent", svRole("credit_agent")],
        ],
        "agent",
      ) +
      vField(
        "sar-credit",
        L("سقف بدهی تومان", "Credit limit (toman)"),
        0,
        'type="number" min="0"',
      ) +
      vField(
        "sar-discount",
        L("درصد تخفیف", "Discount (%)"),
        0,
        'type="number" min="0" max="100"',
      ),
    "svAgentDecide",
  );
};
ACTIONS.svAgentDecide = async () => {
  await svAPI("/agents/" + SV.edit.id + "/decide", {
    method: "POST",
    body: {
      approve: vVal("sar-decision") === "approve",
      role: vVal("sar-role"),
      creditLimit: vNum("sar-credit"),
      discountPercent: vNum("sar-discount"),
    },
  });
  closeModal();
  svRefresh();
};
async function svPromotions() {
  const [c, g, p] = await Promise.all([
    svAPI("/coupons"),
    svAPI("/gifts"),
    svAPI("/plans"),
  ]);
  SV.cache.coupons = c.rows;
  SV.cache.gifts = g.rows;
  SV.cache.plans = p.rows;
  return svRows(
    `${vSection(L("تخفیف خرید / تمدید / حجم و زمان", "Purchase / renewal / extra quota discounts"), c.rows.length ? c.rows.map((c) => `<div class="v-row"><div class="v-row-main"><p class="v-code font-bold">${esc(c.code)} ${svBadge(c.enabled ? "active" : "disabled")}</p><p class="v-meta">${c.type === "percent" ? c.value + "%" : vMoney(c.value)} · ${esc(c.scope)} · ${L("مصرف / رزرو", "Used / held")}: ${c.used}/${c.reserved}</p></div><div class="v-actions">${svBtn(t("edit"), "svCouponEdit", `data-id="${c.id}"`)}${svBtn(L("غیرفعال", "Disable"), "svDisable", `data-kind="coupons" data-id="${c.id}"`)}</div></div>`).join("") : vEmpty(L("کد تخفیفی نیست.", "No discount codes.")), svBtn(L("کد جدید", "New code"), "svCouponEdit", "", true))}${vSection(L("کد هدیه کیف پول", "Wallet gift codes"), g.rows.length ? g.rows.map((g) => `<div class="v-row"><div class="v-row-main"><b class="v-code">${esc(g.code)}</b><p class="v-meta">${vMoney(g.amount)} · ${g.used}/${g.maxUses} · ${g.enabled ? L("فعال", "Enabled") : L("غیرفعال", "Disabled")}</p></div><div class="v-actions">${svBtn(t("edit"), "svGiftEdit", `data-id="${g.id}"`)}${svBtn(L("غیرفعال", "Disable"), "svDisable", `data-kind="gifts" data-id="${g.id}"`)}</div></div>`).join("") : vEmpty(L("هدیه‌ای نیست.", "No gift codes.")), svBtn(L("هدیه جدید", "New gift"), "svGiftEdit", "", true))}`,
  );
}
ACTIONS.svCouponEdit = (d) => {
  const c = SV.cache.coupons.find((c) => c.id === d.id) || {
    enabled: true,
    type: "percent",
    value: 10,
    scope: "all",
    perUser: 1,
    maxUses: 0,
  };
  SV.edit = { id: c.id || "" };
  vModal(
    L("تخفیف خدمات", "Service discount"),
    vField(
      "sc-code",
      L("کد لاتین", "Code"),
      c.code,
      'required dir="ltr" pattern="[A-Za-z0-9_-]{3,40}"',
    ) +
      `<div class="grid sm:grid-cols-2 gap-4">${vSelect(
        "sc-type",
        L("نوع", "Type"),
        [
          ["percent", L("درصدی", "Percent")],
          ["amount", L("مبلغی", "Fixed amount")],
        ],
        c.type,
      )}${vField("sc-value", L("مقدار", "Value"), c.value, 'type="number" min="0" required')}${vSelect(
        "sc-scope",
        L("کاربرد", "Scope"),
        [
          ["all", L("همه", "All")],
          ["buy", L("خرید", "Purchase")],
          ["renew", L("تمدید", "Renewal")],
          ["volume", L("حجم اضافه", "Extra GB")],
          ["time", L("زمان اضافه", "Extra days")],
        ],
        c.scope,
      )}${vSelect("sc-plan", L("پلن خاص؛ اختیاری", "Specific plan; optional"), [["", L("همه پلن‌ها", "All plans")], ...SV.cache.plans.map((p) => [p.id, p.title])], c.planId || "")}${vField("sc-max", L("کل استفاده؛ صفر نامحدود", "Total uses; 0 = unlimited"), c.maxUses, 'type="number" min="0"')}${vField("sc-user", L("سقف هر کاربر", "Per-user limit"), c.perUser, 'type="number" min="1"')}${vField("sc-expiry", L("پایان اعتبار", "Expiry"), vLocalTime(c.expiresAt), 'type="datetime-local"')}</div>${vCheck("sc-enabled", L("فعال", "Enabled"), c.enabled)}`,
    "svCouponSave",
  );
};
ACTIONS.svCouponSave = async () => {
  await svAPI("/coupons" + (SV.edit.id ? "/" + SV.edit.id : ""), {
    method: SV.edit.id ? "PUT" : "POST",
    body: {
      code: vVal("sc-code"),
      type: vVal("sc-type"),
      value: vNum("sc-value"),
      scope: vVal("sc-scope"),
      planId: vVal("sc-plan"),
      maxUses: vNum("sc-max"),
      perUser: vNum("sc-user"),
      expiresAt: vVal("sc-expiry") ? new Date(vVal("sc-expiry")).getTime() : 0,
      enabled: vOn("sc-enabled"),
    },
  });
  closeModal();
  svRefresh();
};
ACTIONS.svGiftEdit = (d) => {
  const g = SV.cache.gifts.find((g) => g.id === d.id) || {
    enabled: true,
    amount: 10000,
    maxUses: 1,
  };
  SV.edit = { id: g.id || "" };
  vModal(
    L("هدیه کیف پول", "Wallet gift"),
    vField("sgh-code", L("کد لاتین", "Code"), g.code, 'required dir="ltr"') +
      vField(
        "sgh-amount",
        L("مبلغ تومان", "Amount (toman)"),
        g.amount,
        'required type="number" min="1"',
      ) +
      vField(
        "sgh-max",
        L("تعداد کل استفاده", "Maximum uses"),
        g.maxUses,
        'type="number" min="1" required',
      ) +
      vField(
        "sgh-expiry",
        L("انقضا؛ اختیاری", "Expiry; optional"),
        vLocalTime(g.expiresAt),
        'type="datetime-local"',
      ) +
      vCheck("sgh-enabled", L("فعال", "Enabled"), g.enabled),
    "svGiftSave",
  );
};
ACTIONS.svGiftSave = async () => {
  await svAPI("/gifts" + (SV.edit.id ? "/" + SV.edit.id : ""), {
    method: SV.edit.id ? "PUT" : "POST",
    body: {
      code: vVal("sgh-code"),
      amount: vNum("sgh-amount"),
      maxUses: vNum("sgh-max"),
      expiresAt: vVal("sgh-expiry")
        ? new Date(vVal("sgh-expiry")).getTime()
        : 0,
      enabled: vOn("sgh-enabled"),
    },
  });
  closeModal();
  svRefresh();
};
async function svCampaigns() {
  const [cfg, r] = await Promise.all([svAPI("/settings"), svAPI("/raffles")]);
  SV.cache.settings = cfg.settings;
  const w = cfg.settings.wheel;
  return svRows(
    `${svDiceSettings(cfg.settings.dice)}${vSection(L("گردونه هدیه", "Reward wheel"), `${vCheck("sw-enabled", L("گردونه فعال", "Enable wheel"), w.enabled)}<div class="grid sm:grid-cols-2 gap-4">${vField("sw-daily", L("تعداد روزانه هر کاربر", "Daily spins per user"), w.dailySpins, 'type="number" min="1" max="10"')}${vField("sw-fee", L("هزینه چرخش تومان؛ صفر = رایگان", "Spin fee (toman); 0 = free"), w.fee, 'type="number" min="0"')}${vField("sw-budget", L("سقف کل هدیه روزانه تومان", "Daily total reward budget (toman)"), w.budget, 'type="number" min="0"')}</div>${vArea("sw-prizes", L("هر خط: عنوان | مبلغ هدیه | وزن احتمال", "One per line: Title | Reward amount | Weight"), w.prizes.map((p) => `${p.title} | ${p.amount} | ${p.weight}`).join("\n"), 5)}${vNote(L("وزن‌ها احتمال نسبی‌اند. موجودی، سهمیه و بودجه در یک تراکنش کنترل می‌شوند. در صورت تعیین هزینه، مسئولیت الزامات قانونی و شرایط درگاه با گرداننده است؛ پیش‌فرض توصیه‌شده رایگان است.", "Weights define relative probability. Balance, quota and budget are transactional. Paid chance promotions may require legal/provider approval; free mode is recommended."), true)}`, svBtn(t("save"), "svWheelSave", "", true))}${vSection(L("قرعه‌کشی رایگان زمان‌دار", "Scheduled free raffles"), r.rows.length ? r.rows.map((r) => `<div class="v-row"><div class="v-row-main"><p class="text-sm font-bold">${esc(r.title)} ${svBadge(r.status)}</p><p class="v-meta">${fmtNum(r.entries.length)} ${L("شرکت‌کننده", "entries")} · ${fmtDate(r.closesAt)}<br>${r.winners.map((w) => esc(w.userId) + " · " + vMoney(w.amount)).join(" / ")}</p></div></div>`).join("") : vEmpty(L("قرعه‌کشی‌ای تعریف نشده است.", "No raffles yet.")), svBtn(L("قرعه‌کشی جدید", "New raffle"), "svRaffleNew", "", true))}`,
  );
}
ACTIONS.svWheelSave = async () => {
  const prizes = vLines(vVal("sw-prizes")).map((l) => {
    const [title, amount, weight] = l.split("|").map((s) => s.trim());
    return { title, amount: Number(amount), weight: Number(weight) };
  });
  await svAPI("/settings", {
    method: "PUT",
    body: {
      wheel: {
        enabled: vOn("sw-enabled"),
        dailySpins: vNum("sw-daily"),
        fee: vNum("sw-fee"),
        budget: vNum("sw-budget"),
        prizes,
      },
    },
  });
  toast(t("saved"), "success");
};
ACTIONS.svRaffleNew = () =>
  vModal(
    L("قرعه‌کشی رایگان", "Free raffle"),
    vField("srf-title", L("عنوان", "Title"), "", "required") +
      vField(
        "srf-end",
        L("زمان قرعه‌کشی (زمان دستگاه شما)", "Draw time (device timezone)"),
        "",
        'required type="datetime-local"',
      ) +
      vField(
        "srf-count",
        L("سقف شرکت‌کنندگان", "Maximum entries"),
        1000,
        'required type="number" min="1" max="10000"',
      ) +
      vArea(
        "srf-prizes",
        L(
          "مبالغ جوایز تومان؛ هر خط یک برنده",
          "Prize amounts in toman; one winner per line",
        ),
        "10000\n5000",
        3,
        "required",
      ),
    "svRaffleSave",
  );
ACTIONS.svRaffleSave = async () => {
  await svAPI("/raffles", {
    method: "POST",
    body: {
      title: vVal("srf-title"),
      closesAt: new Date(vVal("srf-end")).getTime(),
      maxEntries: vNum("srf-count"),
      prizes: vLines(vVal("srf-prizes")).map(Number),
    },
  });
  closeModal();
  svRefresh();
};

async function svSettings() {
  const [d, p, rates] = await Promise.all([
    svAPI("/settings"),
    svAPI("/plans"),
    svAPI("/rates"),
  ]);
  SV.cache.settings = d.settings;
  SV.cache.plans = p.rows;
  const s = d.settings;
  SV.logo = s.brand.logo || "";
  // Long settings pages open collapsed so the tab paints instantly.
  vSectionDefault(false);
  const html = svRows(
    `${vSection(L("برند و مینی‌اپ مشتری", "Brand & customer Mini App"), `<div class="grid sm:grid-cols-2 gap-4">${vField("vs-name", L("نام فروشگاه", "Store name"), s.brand.name)}${vField("vs-name-en", "English name", s.brand.nameEn, 'dir="ltr"')}${vField("vs-mark", L("نشان کوتاه", "Short mark"), s.brand.mark, 'maxlength="3"')}${vField("vs-accent", L("رنگ اصلی HEX", "Accent HEX"), s.brand.accent, 'dir="ltr" placeholder="#38bdf8"')}${vField("vs-url", L("آدرس عمومی Worker بدون مسیر", "Public Worker URL without a path"), s.publicUrl, 'dir="ltr" placeholder="https://your-worker.workers.dev"')}${vField("vs-report", L("چت گزارش مدیر؛ اختیاری", "Administrator report chat; optional"), s.reportChat, 'dir="ltr"')}</div><div class="mt-4"><label class="v-field"><span>${L("لوگو؛ PNG/JPEG/WebP تا ۱۵۰ KB", "Logo; PNG/JPEG/WebP up to 150 KB")}</span><input id="vs-logo" type="file" accept="image/png,image/jpeg,image/webp"><span id="vs-logo-status" class="v-meta">${s.brand.logo ? L("لوگو ثبت شده است", "Logo saved") : ""}</span></label>${svBtn(L("حذف لوگو", "Remove logo"), "svRemoveLogo")}</div>${vCheck("vs-enabled", L("فروش خدمات فعال باشد", "Enable service sales"), s.enabled)}${vCheck("vs-maintenance", L("توقف موقت خرید جدید؛ سوابق و تعهدات باقی می‌مانند", "Pause new purchases; preserve records and existing obligations"), s.maintenance)}`, svBtn(L("ذخیره همه تنظیمات خدمات", "Save all service settings"), "svSettingsSave", "", true))}${vSection(L("قوانین، شماره و سفارش", "Rules, phone verification & orders"), vCheck("vs-phone", L("تأیید شماره با Contact تلگرام لازم باشد", "Require Telegram contact ownership verification"), s.phoneRequired) + vCheck("vs-iran", L("فقط شماره موبایل ایران", "Iranian mobile numbers only"), s.iranPhonesOnly) + vCheck("vs-customname", L("نام دلخواه سرویس مجاز باشد", "Allow custom service names"), s.customNames) + vArea("vs-rules", L("قوانین فارسی؛ خالی یعنی بدون مرحله پذیرش", "Rules in Persian; empty disables the acceptance step"), s.rules, 4) + vArea("vs-rules-en", "English rules", s.rulesEn, 3, 'dir="ltr"') + `<div class="grid sm:grid-cols-2 gap-4">${vSelect("vs-testplan", L("پلن تست", "Trial plan"), [["", L("بدون تست", "No trial")], ...p.rows.map((p) => [p.id, p.title])], s.testPlanId)}${vField("vs-testlimit", L("سهمیه تست هر کاربر", "Trials per customer"), s.testsPerUser, 'type="number" min="0" max="20"')}${vField("vs-open", L("حداکثر عملیات باز هر کاربر", "Max open operations per customer"), s.maxOpenOperations, 'type="number" min="1" max="10"')}${vField("vs-maxservices", L("حداکثر سرویس هر کاربر", "Max services per customer"), s.maxServices, 'type="number" min="1" max="10000"')}</div>`)}${vSection(
      L("مالی، معرفی و نمایندگی", "Finance, referrals & resellers"),
      `<div class="grid sm:grid-cols-2 gap-4">${[
        ["topupMin", L("حداقل شارژ تومان", "Minimum top-up (toman)")],
        ["topupMax", L("حداکثر شارژ تومان", "Maximum top-up (toman)")],
        ["topupMinutes", L("مهلت پرداخت دقیقه", "Payment timeout (minutes)")],
        ["usdToman", L("ارزش یک دلار به تومان", "Toman per USD")],
        ["starToman", L("ارزش یک Star به تومان", "Toman per Star")],
        ["giftSignup", L("هدیه ثبت‌نام تومان", "Signup credit (toman)")],
        ["purchaseCashback", L("کش‌بک خرید درصد", "Purchase cashback (%)")],
        ["referralPercent", L("پورسانت معرف درصد", "Referrer commission (%)")],
        [
          "agentMinPaid",
          L(
            "حداقل واریز برای درخواست نمایندگی",
            "Minimum paid top-ups for reseller request",
          ),
        ],
      ]
        .map(([k, l]) => vField("vs-" + k, l, s[k], 'type="number" min="0"'))
        .join(
          "",
        )}</div>${vCheck("vs-agentrequests", L("پذیرش درخواست نمایندگی", "Accept reseller requests"), s.agentRequests)}${vNote(L("نرخ‌ها از حالت دستی یا منبع خودکار انتخاب می‌شوند و در هر فاکتور ثابت می‌مانند؛ تغییر نرخ، فاکتور قبلی را تغییر نمی‌دهد. سیاست‌های Telegram Stars و درگاه‌ها را برای کالای دیجیتال رعایت کنید.", "Rates use manual settings or the configured automatic source, and are locked per invoice. Follow Telegram Stars and payment-provider rules for digital goods."), true)}`,
    )}${svRateSettings(s, rates)}${vSection(L("پایش سرویس‌ها و اعلان", "Service monitoring & alerts"), `<div class="grid sm:grid-cols-2 gap-4">${vField("vs-lowgb", L("هشدار مانده حجم کمتر از GB", "Alert below remaining GB"), s.lowVolumeGB, 'type="number" min="0" step="0.1"')}${vField("vs-lowdays", L("هشدار مانده روز کمتر از", "Alert below remaining days"), s.lowDays, 'type="number" min="0" max="365"')}${vField("vs-sync", L("بازه بروزرسانی دقیقه", "Sync interval (minutes)"), s.syncMinutes, 'type="number" min="1" max="1440"')}${vField("vs-delete", L("حذف سرویس چند روز پس از انقضا؛ صفر خاموش", "Delete days after expiry; 0 disables"), s.deleteExpiredDays, 'type="number" min="0" max="365"')}</div>${vNote(L("بروزرسانی‌ها در دسته‌های محدود و صف سرور انجام می‌شود، نه تضمین لحظه‌ای. برای WGDashboard زمان سرور را UTC قرار دهید. مصرف انبار دستی قابل اندازه‌گیری نیست.", "Synchronization uses bounded server batches, not a real-time guarantee. WGDashboard server time should be UTC. Manual-stock usage cannot be measured."))}`)}${vSection(
      L("کلاینت‌ها و دکمه‌های تلگرام", "Client apps & Telegram buttons"),
      vArea(
        "vs-apps",
        L(
          "هر خط: نام | سیستم‌عامل | لینک HTTPS | راهنما (اختیاری)",
          "One per line: Title | OS | HTTPS URL | Help (optional)",
        ),
        s.clientApps
          .map((a) => `${a.title} | ${a.os} | ${a.url} | ${a.help || ""}`)
          .join("\n"),
        5,
      ) +
        vSelect(
          "vs-button-style",
          L("رنگ دکمه‌های منوی خدمات", "Service-menu button style"),
          [
            ["", L("پیش‌فرض", "Default")],
            ["primary", L("اصلی", "Primary")],
            ["success", L("موفقیت", "Success")],
            ["danger", L("هشدار", "Danger")],
          ],
          s.buttonStyle,
        ) +
        vField(
          "vs-emoji",
          L(
            "شناسه ایموجی اختصاصی؛ وابسته به مجوز تلگرام",
            "Custom emoji ID; subject to Telegram eligibility",
          ),
          s.premiumEmojiId,
          'dir="ltr"',
        ) +
        vNote(
          L(
            "ظاهر دکمه‌های تلگرام به نسخه API و مجوز مالک ربات بستگی دارد. اگر تلگرام پارامتر را رد کند، منو با دکمه معمولی ارسال می‌شود.",
            "Telegram button appearance depends on API support and bot-owner eligibility. Rejected decoration falls back to ordinary buttons.",
          ),
        ),
    )}<div class="flex justify-end">${svBtn(L("ذخیره همه تنظیمات", "Save all settings"), "svSettingsSave", "", true)}</div>`,
  );
  vSectionDefault(false);
  return html;
}
document.addEventListener("change", (e) => {
  if (e.target.id === "vs-logo") {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 150000 || !/^image\/(png|jpeg|webp)$/.test(f.type))
      return toast(
        L(
          "لوگوی مجاز کوچک‌تر از ۱۵۰ KB انتخاب کنید.",
          "Choose a supported logo under 150 KB.",
        ),
        "error",
      );
    const r = new FileReader();
    r.onload = () => {
      SV.logo = r.result;
      $("vs-logo-status").innerHTML = `${vIcon("check")} <span></span>`; $("vs-logo-status").querySelector("span").textContent = f.name; refreshIcons();
    };
    r.readAsDataURL(f);
  }
});
ACTIONS.svRemoveLogo = () => {
  SV.logo = "";
  $("vs-logo-status").textContent = "";
};
ACTIONS.svSettingsSave = async () => {
  const data = {
    enabled: vOn("vs-enabled"),
    maintenance: vOn("vs-maintenance"),
    publicUrl: vVal("vs-url"),
    reportChat: vVal("vs-report"),
    brand: {
      name: vVal("vs-name"),
      nameEn: vVal("vs-name-en"),
      mark: vVal("vs-mark"),
      accent: vVal("vs-accent"),
      logo: SV.logo,
    },
    phoneRequired: vOn("vs-phone"),
    iranPhonesOnly: vOn("vs-iran"),
    customNames: vOn("vs-customname"),
    rules: vVal("vs-rules"),
    rulesEn: vVal("vs-rules-en"),
    testPlanId: vVal("vs-testplan"),
    testsPerUser: vNum("vs-testlimit"),
    maxOpenOperations: vNum("vs-open"),
    maxServices: vNum("vs-maxservices"),
    agentRequests: vOn("vs-agentrequests"),
    lowVolumeGB: vNum("vs-lowgb"),
    lowDays: vNum("vs-lowdays"),
    syncMinutes: vNum("vs-sync"),
    deleteExpiredDays: vNum("vs-delete"),
    rates: {
      mode: vVal("vs-rates-mode"),
      refreshMinutes: vNum("vs-rates-refresh"),
      maxAgeMinutes: vNum("vs-rates-age"),
    },
    dailyReport: {
      enabled: vOn("vs-daily-enabled"),
      hour: vNum("vs-daily-hour"),
    },
    buttonStyle: vVal("vs-button-style"),
    premiumEmojiId: vVal("vs-emoji"),
    clientApps: vLines(vVal("vs-apps")).map((l) => {
      const [title, os, url, ...help] = l.split("|").map((x) => x.trim());
      return { title, os, url, help: help.join("|") };
    }),
  };
  for (const k of [
    "topupMin",
    "topupMax",
    "topupMinutes",
    "usdToman",
    "starToman",
    "giftSignup",
    "purchaseCashback",
    "referralPercent",
    "agentMinPaid",
  ])
    data[k] = vNum("vs-" + k);
  await svAPI("/settings", { method: "PUT", body: data });
  toast(t("saved"), "success");
};
function svDownload(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
async function svBackup() {
  const cfg = (await svAPI("/settings")).settings;
  SV.cache.settings = cfg;
  vSectionDefault(false);
  const html = svRows(
    `${vSection(L("خروجی گزارش مالی", "Finance export"), `<div class="grid sm:grid-cols-2 gap-4">${vField("sb-from", L("از تاریخ؛ اختیاری", "From; optional"), "", 'type="datetime-local"')}${vField("sb-to", L("تا تاریخ؛ اختیاری", "To; optional"), "", 'type="datetime-local"')}</div><div class="v-actions !justify-start mt-4">${svBtn("Excel .xlsx", "svExport", 'data-format="xlsx"', true)}${svBtn("CSV", "svExport", 'data-format="csv"')}</div><p class="v-meta">${L("حداکثر ۱۰ هزار ردیف در هر فایل؛ برای داده بیشتر بازه تاریخ را محدود کنید. اطلاعات اتصال در گزارش نیست.", "Up to 10,000 rows per file; narrow the date range for larger datasets. Connection credentials are excluded.")}</p>`)}${vSection(L("پشتیبان رمزگذاری‌شده ماژول خدمات", "Encrypted services backup"), vField("sb-password", L("رمز فایل پشتیبان؛ حداقل ۱۲ کاراکتر", "Backup password; at least 12 characters"), "", 'type="password" autocomplete="new-password"') + `<div class="mt-4">${svBtn(L("دریافت پشتیبان", "Download backup"), "svBackupExport", "", true)}</div>` + vNote(L("پشتیبان شامل داده‌های ماژول خدمات است، نه همه تنظیمات قدیمی v2. رمز فایل و VAULT_KEY را جدا و امن نگه دارید. نشست‌های ورود صادر نمی‌شوند.", "Backups cover the services module, not every legacy v2 setting. Keep the archive password and VAULT_KEY separately. Login sessions are excluded.")))}${vSection(L("بازیابی در ماژول خدمات خالی", "Restore into an empty services module"), `<label class="v-field"><span>${L("فایل .bpbackup", "Backup file")}</span><input id="sb-file" type="file" accept=".bpbackup,.json"></label>${vField("sb-restore-password", L("رمز پشتیبان", "Archive password"), "", 'type="password"')}<div class="mt-4">${svBtn(L("بازیابی با تأیید", "Restore with confirmation"), "svBackupRestore")}</div>${vNote(L("داده مالی موجود بازنویسی نمی‌شود. بازیابی، فروش را در حالت نگهداری می‌گذارد؛ عملیات و پرداخت‌های باز نیازمند تطبیق خواهند بود. فایل از منابع نامطمئن وارد نکنید.", "Existing financial data is not overwritten. Restores enable maintenance mode and flag pending operations/payments for review. Do not import untrusted files."), true)}`)}${vSection(L("پشتیبان شبانه در R2", "Nightly R2 backups"), vCheck("sb-auto", L("پشتیبان زمان‌بندی‌شده فعال باشد", "Enable scheduled backups"), cfg.backup.enabled) + vField("sb-hour", L("ساعت تهران؛ ۰ تا ۲۳", "Tehran hour; 0–23"), cfg.backup.hour, 'type="number" min="0" max="23"') + `<div class="mt-4">${svBtn(t("save"), "svBackupSchedule")}</div>` + vNote(SV.meta.ready.backup ? L("binding و رمز پشتیبان در محیط تنظیم شده‌اند.", "Backup binding and password are configured.") : L("برای فعال‌شدن واقعی، binding با نام BACKUPS و secret با نام BACKUP_PASSWORD لازم است.", "For scheduled operation, configure the BACKUPS R2 binding and BACKUP_PASSWORD secret."), !SV.meta.ready.backup))}`,
  );
  vSectionDefault(false);
  return html;
}
ACTIONS.svExport = async (d) => {
  const q = new URLSearchParams({ format: d.format });
  if (vVal("sb-from")) q.set("from", new Date(vVal("sb-from")).getTime());
  if (vVal("sb-to")) q.set("to", new Date(vVal("sb-to")).getTime());
  const r = await fetch(apiURL("/services/export?" + q), {
    headers: { Authorization: "Bearer " + S.token },
  });
  if (!r.ok) {
    const e = await r.json();
    throw new Error(e.error);
  }
  svDownload(await r.blob(), "service-finance." + d.format);
};
ACTIONS.svBackupExport = async () => {
  const r = await svAPI("/backup/export", {
    method: "POST",
    body: { password: vVal("sb-password") },
  });
  svDownload(
    new Blob([JSON.stringify(r.backup)], { type: "application/json" }),
    "services-" + new Date().toISOString().slice(0, 10) + ".bpbackup",
  );
  toast(t("saved"), "success");
};
ACTIONS.svBackupRestore = async () => {
  const f = $("sb-file").files[0],
    password = vVal("sb-restore-password");
  if (!f)
    throw new Error(L("فایل پشتیبان را انتخاب کنید.", "Choose a backup file."));
  if (f.size > 20 * 1024 * 1024) throw new Error("request_too_large");
  const backup = JSON.parse(await f.text());
  if (
    !(await confirmDlg(
      L(
        "بازیابی در ماژول خدمات خالی انجام شود؟ فروش پس از بازیابی در حالت نگهداری خواهد بود.",
        "Restore into the empty services module? Sales will enter maintenance mode.",
      ),
      L("بازیابی", "Restore"),
    ))
  )
    return;
  const r = await svAPI("/backup/restore", {
    method: "POST",
    body: { password, backup, confirm: "RESTORE-EMPTY-SERVICES" },
  });
  toast(
    L(
      "بازیابی شد؛ قبل از فعال‌سازی، تطبیق مالی انجام دهید.",
      "Restored. Reconcile before enabling sales.",
    ),
    "success",
  );
  svRefresh();
};
ACTIONS.svBackupSchedule = async () => {
  await svAPI("/settings", {
    method: "PUT",
    body: { backup: { enabled: vOn("sb-auto"), hour: vNum("sb-hour") } },
  });
  toast(t("saved"), "success");
};

function vResetBotCaches() {
  try {
    if (typeof MU !== "undefined") { MU.menu = null; MU.sub = null; MU.bot = undefined; }
    if (typeof V2 !== "undefined") { V2.settings = null; V2.summary = null; V2.cache = {}; }
  } catch (e) {}
}

const svOriginalShell = renderShell;
renderShell = function () {
  svOriginalShell();
  const child = localStorage.getItem("bp_managed_bot") || "";
  const title =
    localStorage.getItem("bp_managed_bot_title") ||
    L("ربات فرزند", "Managed bot");
  const band = document.createElement("div");
  band.className = "sv-botbar";
  band.innerHTML = `<span>${L("در حال مدیریت:", "Managing:")} <b>${child ? esc(title) : L("ربات اصلی", "Primary bot")}</b></span><div>${child ? svBtn(L("بازگشت به ربات اصلی", "Back to primary"), "svPrimary") : ""}${svBtn(L("ربات‌های من", "My bots"), "svBots")}</div>`;
  $("view")?.before(band);
};
ACTIONS.svBots = async () => {
  const d = await api("/bots");
  SV.bots = d.bots;
  openModal(
    `<div class="p-6"><div class="flex items-center justify-between gap-3 mb-4"><h3 class="font-bold">${L("مدیریت چند ربات", "Manage multiple bots")}</h3>${svBtn(t("close"), "modalClose")}</div>${vNote(L("هر ربات یک فضای SQLite و کیف پول مستقل دارد. توکن‌ها رمزگذاری می‌شوند. ثبت ربات، وب‌هوک قبلی را خودکار عوض نمی‌کند.", "Each bot has isolated SQLite state and wallets. Tokens are encrypted. Registration does not automatically replace an existing webhook."))}<div class="v-row"><div class="v-row-main"><b>${L("ربات اصلی", "Primary bot")}</b></div>${svBtn(L("انتخاب", "Select"), "svPrimary")}</div>${d.bots.map((b) => `<div class="v-row"><div class="v-row-main"><b>${esc(b.title)}</b><p class="v-meta" dir="ltr">@${esc(b.username)}</p><span class="v-badge ${b.webhookSet ? "good" : "warn"}">${b.webhookSet ? L("وب‌هوک ثبت شده", "Webhook registered") : L("نیاز به ثبت وب‌هوک", "Webhook not registered")}</span></div><div class="v-actions">${svBtn(L("انتخاب", "Select"), "svSelectBot", `data-id="${b.id}"`)}${svBtn(L("وب‌هوک", "Webhook"), "svBotWebhook", `data-id="${b.id}"`)}${svBtn(L("توکن", "Rotate token"), "svBotToken", `data-id="${b.id}"`)}</div></div>`).join("")}<div class="mt-5">${svBtn(L("افزودن ربات مستقل", "Add independent bot"), "svBotNew", "", true)}</div></div>`,
  );
};
ACTIONS.svBotNew = () =>
  vModal(
    L("ربات مستقل جدید", "New independent bot"),
    vField("sbot-title", L("نام مدیریتی", "Management title"), "", "required") +
      vField(
        "sbot-token",
        L("توکن ربات از BotFather", "BotFather token"),
        "",
        'required type="password" autocomplete="new-password" dir="ltr"',
      ) +
      vField(
        "sbot-base",
        L(
          "نشانی HTTPS اصلی پنل؛ خالی = تشخیص سرور",
          "Primary HTTPS panel URL; blank = server default",
        ),
        "",
        'dir="ltr" placeholder="https://your-worker.workers.dev"',
      ) +
      vNote(
        L(
          "توکن باید متعلق به ربات متفاوت باشد. بعد از ساخت، ربات را انتخاب و پنل‌ها، قیمت‌ها و درگاه‌های همان ربات را تنظیم کنید؛ اطلاعات مالی والد کپی نمی‌شود.",
          "Use a different bot token. Select the bot afterwards and configure its own providers, plans and gateways. Parent finances are never copied.",
        ),
      ),
    "svBotCreate",
  );
ACTIONS.svBotCreate = async () => {
  await api("/bots", {
    method: "POST",
    body: {
      title: vVal("sbot-title"),
      token: vVal("sbot-token"),
      baseUrl: vVal("sbot-base"),
    },
  });
  toast(t("saved"), "success");
  await ACTIONS.svBots();
};
ACTIONS.svSelectBot = async (d) => {
  const b = SV.bots.find((b) => b.id === d.id);
  if (!b) return;
  localStorage.setItem("bp_managed_bot", b.id);
  localStorage.setItem("bp_managed_bot_title", b.title);
  // Drop per-bot caches so every editor (menu buttons included) reloads for the
  // bot that was just selected.
  vResetBotCaches();
  closeModal();
  SV.tab = "overview";
  V2.tab = "services";
  await initV2();
  go("studio");
  render();
};
ACTIONS.svPrimary = async () => {
  localStorage.removeItem("bp_managed_bot");
  localStorage.removeItem("bp_managed_bot_title");
  vResetBotCaches();
  closeModal();
  SV.tab = "overview";
  await initV2();
  render();
};
ACTIONS.svBotWebhook = async (d) => {
  const b = SV.bots.find((b) => b.id === d.id);
  if (
    !(await confirmDlg(
      L(
        "وب‌هوک این ربات به پنل فعلی منتقل شود؟ دریافت پیام در استقرار قبلی آن متوقف می‌شود.",
        "Move this bot’s webhook here? Its previous deployment will stop receiving updates.",
      ),
      L("ثبت وب‌هوک", "Register webhook"),
    ))
  )
    return;
  await api("/bots/" + d.id + "/webhook", { method: "POST" });
  toast(t("saved"), "success");
  ACTIONS.svBots();
};
ACTIONS.svBotToken = (d) => {
  SV.edit = { id: d.id };
  vModal(
    L("تعویض توکن همان ربات", "Rotate this bot’s token"),
    vField(
      "sbot-new-token",
      L("توکن جدید برای همان آیدی ربات", "New token for the same bot ID"),
      "",
      'required type="password" autocomplete="new-password" dir="ltr"',
    ),
    "svBotTokenSave",
  );
};
ACTIONS.svBotTokenSave = async () => {
  await api("/bots/" + SV.edit.id + "/token", {
    method: "PUT",
    body: { token: vVal("sbot-new-token") },
  });
  toast(t("saved"), "success");
  ACTIONS.svBots();
};

function svRateSettings(s, data) {
  const snapshot = data.snapshot;
  return vSection(
    L("نرخ ارز و گزارش روزانه", "Currency rates & daily reporting"),
    `<div class="grid sm:grid-cols-2 gap-4">${vSelect(
      "vs-rates-mode",
      L("روش نرخ‌گذاری", "Rate source"),
      [
        ["manual", L("دستی از تنظیمات مدیر", "Manual administrator rates")],
        [
          "swapwallet",
          L(
            "خودکار از API مرجع SwapWallet",
            "Automatic SwapWallet reference API",
          ),
        ],
      ],
      s.rates.mode,
    )}${vField("vs-rates-refresh", L("فاصله بررسی دقیقه", "Refresh interval (minutes)"), s.rates.refreshMinutes, 'type="number" min="1" max="60"')}${vField("vs-rates-age", L("بیشترین عمر نرخ معتبر دقیقه", "Maximum quote age (minutes)"), s.rates.maxAgeMinutes, 'type="number" min="1" max="1440"')}</div><div class="mt-4">${svBtn(L("بررسی منبع و دریافت نرخ", "Fetch reference rates"), "svRefreshRates")}</div><div id="sv-market-status" class="v-meta">${snapshot?.at ? esc(L("آخرین نرخ ذخیره‌شده: ", "Last stored quote: ")) + fmtDate(snapshot.at) + " · USD " + vMoney(snapshot.rates.USD) + " · TRX " + vMoney(snapshot.rates.TRX) + " · TON " + vMoney(snapshot.rates.TON) : L("نرخ خودکار هنوز دریافت نشده است.", "No automatic quote has been fetched.")}${snapshot?.error ? "<br>" + esc(vError(snapshot.error)) : ""}</div><div class="mt-4">${vNote(L("در حالت خودکار، نبود نرخ معتبر ساخت فاکتور جدید را متوقف می‌کند؛ مبلغ فاکتور قبلی بازنویسی نمی‌شود. نرخ مرجع به تومان است و به عدد صحیح پایین گرد می‌شود.", "In automatic mode, missing or stale rates block new invoices. Existing invoices keep their original quote. Reference rates are in toman and rounded down to an integer."))}</div><div class="v-divider"></div>${vCheck("vs-daily-enabled", L("ارسال خلاصه مالی ۲۴ ساعت اخیر به چت گزارش مدیر", "Send a daily 24-hour summary to the administrator report chat"), s.dailyReport.enabled)}${vField("vs-daily-hour", L("ساعت ارسال بر اساس تهران", "Report hour in Tehran"), s.dailyReport.hour, 'type="number" min="0" max="23"')}`,
  );
}
ACTIONS.svRefreshRates = async () => {
  const d = await svAPI("/rates/refresh", { method: "POST" });
  $("sv-market-status").textContent =
    fmtDate(d.snapshot.at) +
    " · USD " +
    vMoney(d.snapshot.rates.USD) +
    " · TRX " +
    vMoney(d.snapshot.rates.TRX) +
    " · TON " +
    vMoney(d.snapshot.rates.TON);
  toast(
    L(
      "نرخ مرجع دریافت شد؛ حالت فعال نرخ‌گذاری در تنظیمات ذخیره می‌شود.",
      "Reference rates fetched. Save settings to change the active mode.",
    ),
    "success",
  );
};
function svDiceSettings(d) {
  return vSection(
    L("تاس و اسلات رایگان تلگرام", "Free Telegram dice / slots"),
    `${vCheck("sd-enabled", L("فعال‌سازی تاس", "Enable dice"), d.enabled)}<div class="grid sm:grid-cols-2 gap-4">${vSelect(
      "sd-emoji",
      L("نوع بازی", "Game type"),
      [
        ["🎲", L("تاس؛ عدد ۶ برنده است", "Dice; 6 wins")],
        [
          "🎰",
          L(
            "اسلات؛ نتیجه‌های ۱، ۲۲، ۴۳، ۶۴",
            "Slots; results 1, 22, 43, 64 win",
          ),
        ],
      ],
      d.emoji,
    )}${vField("sd-prize", L("اعتبار جایزه به تومان", "Prize wallet credit (toman)"), d.prize, 'type="number" min="0" max="10000000"')}${vField("sd-hours", L("فاصله مجاز هر کاربر ساعت", "Customer cooldown (hours)"), d.intervalHours, 'type="number" min="1" max="168"')}${vField("sd-budget", L("سقف کل جایزه روزانه تومان", "Daily prize budget (toman)"), d.budget, 'type="number" min="0"')}</div>${vCheck("sd-new", L("فقط کاربرانی که خرید خدمات نداشته‌اند", "Only customers with no prior service purchases"), d.newUsersOnly)}${vCheck("sd-agents", L("نمایندگان هم مجاز باشند", "Allow resellers too"), d.agentsAllowed)}${vNote(L("بازی رایگان است و نتیجه فقط از sendDice تلگرام پذیرفته می‌شود. نتیجه ارسال‌شده توسط مرورگر یا تصویر تاس معتبر نیست. در خطای ارتباط، بدون نتیجه قابل‌اعتماد جایزه خودکار داده نمی‌شود.", "The game is free. Only the Telegram sendDice result is trusted, never browser values or screenshots. An uncertain response does not automatically award a prize."))}`,
    svBtn(t("save"), "svDiceSave", "", true),
  );
}
ACTIONS.svDiceSave = async () => {
  await svAPI("/settings", {
    method: "PUT",
    body: {
      dice: {
        enabled: vOn("sd-enabled"),
        emoji: vVal("sd-emoji"),
        prize: vNum("sd-prize"),
        intervalHours: vNum("sd-hours"),
        budget: vNum("sd-budget"),
        newUsersOnly: vOn("sd-new"),
        agentsAllowed: vOn("sd-agents"),
      },
    },
  });
  toast(t("saved"), "success");
};
