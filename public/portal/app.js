"use strict";
const TG = window.Telegram?.WebApp;
const managedPrefix =
  /^\/bots\/[a-f0-9]{16}(?=\/)/.exec(location.pathname)?.[0] || "";
const portalAPI = (path) => managedPrefix + "/api/portal" + path;
const P = {
  token: sessionStorage.getItem("svc_session") || "",
  lang: localStorage.getItem("svc_lang") || "fa",
  tab: "store",
  data: null,
  plans: [],
  services: [],
  payments: [],
  gateways: [],
  operations: [],
  modalGeneration: 0,
  authGeneration: 0,
  urls: new Set(),
  busy: false,
  support: null,
  filter: { category: "", location: "" },
};
const el = (id) => document.getElementById(id),
  esc = (v) =>
    String(v ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
const T = (fa, en) => (P.lang === "en" ? en : fa);
const num = (v, d = 2) =>
  Number(v || 0).toLocaleString(P.lang === "en" ? "en-US" : "fa-IR", {
    maximumFractionDigits: d,
  });
const money = (v) => num(v, 0) + " " + T("تومان", "toman");
const date = (v) =>
  v
    ? new Date(v).toLocaleString(P.lang === "en" ? "en-US" : "fa-IR", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "—";
const GB = 1073741824;
const button = (label, action, data = "", kind = "") =>
  `<button type="button" class="btn ${kind}" data-action="${action}" ${data}>${label}</button>`;
const field = (id, label, value = "", attrs = "") =>
  `<label for="${id}">${label}</label><input id="${id}" value="${esc(value)}" ${attrs}>`;
const select = (id, label, options, value = "") =>
  `<label for="${id}">${label}</label><select id="${id}">${options.map(([v, l]) => `<option value="${esc(v)}" ${String(v) === String(value) ? "selected" : ""}>${esc(l)}</option>`).join("")}</select>`;
const notice = (text, kind = "") => `<div class="notice ${kind}">${text}</div>`;
const empty = (text, symbol = "◌") =>
  `<div class="empty"><div class="symbol">${symbol}</div><p>${text}</p></div>`;
// Inline brand icons (the Mini App ships zero icon fonts, so the glyphs travel
// with the bundle instead of emojis).
const ICONS = {
  store:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8h15l-1.5 9h-12z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>',
  services:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
  wallet:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M16 13.5h.01"/></svg>',
  gift:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M5 12v8h14v-8M12 8v12M12 8s-4 0-5-1.5S8 4 9.5 4 12 8 12 8zm0 0s4 0 5-1.5S16 4 14.5 4 12 8 12 8z"/></svg>',
  help:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.6 2.2c-.8.4-1.1.8-1.1 1.8"/><path d="M12 17h.01"/></svg>',
  trial:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3h6M10 3v6l-5.5 9.5A2 2 0 0 0 6.2 21h11.6a2 2 0 0 0 1.7-2.5L14 9V3"/><path d="M7.5 15h9"/></svg>',
  card:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  mail:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
  chat:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a7.5 7.5 0 0 1-7.5 7.5H4l2.3-2.9A7.5 7.5 0 1 1 21 11.5z"/></svg>',
  agent:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
  spark:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 3l1.9 5.6 5.6 1.9-5.6 1.9L12 18l-1.9-5.6L4.5 10.5l5.6-1.9z"/><path d="M19 15l.9 2.6 2.6.9-2.6.9L19 22l-.9-2.6-2.6-.9 2.6-.9z"/></svg>',
  refresh:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-2.6-6.3"/><path d="M21 3v6h-6"/></svg>',
};
const icon = (name) =>
  `<span class="ic" aria-hidden="true">${ICONS[name] || ""}</span>`;
const val = (id) => el(id)?.value?.trim() || "";
const status = (s) =>
  ({
    active: T("فعال", "Active"),
    on_hold: T("شروع با اولین اتصال", "Starts on first use"),
    limited: T("حجم تمام شده", "Quota used"),
    expired: T("منقضی", "Expired"),
    disabled: T("متوقف", "Disabled"),
    deleted: T("حذف شده", "Deleted"),
    refunded: T("مسترد شده", "Refunded"),
    pending: T("در انتظار", "Pending"),
    queued: T("در صف ساخت", "Queued"),
    creating: T("در حال ایجاد", "Creating"),
    sending: T("در حال انجام", "Processing"),
    review: T("بررسی پشتیبانی", "Support review"),
    receipt_review: T("در انتظار تأیید فیش", "Receipt review"),
    paid: T("پرداخت تأیید شد", "Paid"),
    done: T("انجام شد", "Done"),
    failed: T("ناموفق", "Failed"),
    cancelled: T("لغو شده", "Cancelled"),
    rejected: T("رد شده", "Rejected"),
  })[s] || s;
const chip = (s) =>
  `<span class="chip ${["active", "paid", "done"].includes(s) ? "good" : ["pending", "review", "receipt_review", "queued", "on_hold", "sending"].includes(s) ? "warn" : ["failed", "rejected"].includes(s) ? "bad" : ""}">${status(s)}</span>`;
function errorText(code) {
  const dict = {
    support_disabled: T(
      "پشتیبانی در این ربات فعال نیست.",
      "Support is not enabled for this bot.",
    ),
    support_message_required: T(
      "متن پیام را بنویسید.",
      "Write your message first.",
    ),
    dice_disabled: T("تاس فعال نیست.", "Dice is disabled."),
    dice_cooldown: T(
      "هنوز زمان نوبت بعدی نرسیده است.",
      "Your next attempt is not available yet.",
    ),
    dice_new_users_only: T(
      "این هدیه فقط برای کاربران بدون خرید قبلی است.",
      "This promotion is only for customers with no prior purchases.",
    ),
    dice_budget_exhausted: T(
      "بودجه جایزه امروز تمام شده است.",
      "Today’s prize budget is exhausted.",
    ),
    dice_role_not_allowed: T(
      "این بازی برای نوع حساب شما فعال نیست.",
      "This promotion is unavailable for your account role.",
    ),
    market_rates_unavailable: T(
      "نرخ معتبر در دسترس نیست؛ بعداً دوباره تلاش کنید.",
      "A valid rate is unavailable. Try again later.",
    ),
    market_rates_stale: T(
      "نرخ قبلی منقضی است؛ فاکتور با نرخ قدیمی صادر نمی‌شود.",
      "The previous quote expired; no stale invoice will be issued.",
    ),
    customer_unauthorized: T(
      "ورود منقضی شده؛ مینی‌اپ را دوباره از ربات باز کنید.",
      "Session expired. Reopen the Mini App from the bot.",
    ),
    telegram_login_expired: T(
      "اطلاعات ورود قدیمی است؛ از ربات دوباره وارد شوید.",
      "Login expired. Reopen from the bot.",
    ),
    login_link_expired: T(
      "لینک یک‌بارمصرف منقضی شده یا قبلاً استفاده شده است.",
      "The single-use link expired or was already used.",
    ),
    insufficient_balance: T(
      "اعتبار قابل استفاده کافی نیست؛ کیف پول را شارژ کنید.",
      "Insufficient available balance. Top up first.",
    ),
    quote_expired: T(
      "پیش‌فاکتور منقضی شد؛ دوباره اقدام کنید.",
      "The quote expired. Request it again.",
    ),
    quote_changed: T(
      "قیمت یا دسترسی تغییر کرده؛ دوباره پیش‌فاکتور بگیرید.",
      "Price or access changed. Request a new quote.",
    ),
    stock_empty: T(
      "موجودی این پلن تمام شده است.",
      "This plan is out of stock.",
    ),
    membership_required: T(
      "ابتدا عضو کانال‌ها و گروه‌های الزامی شوید.",
      "Join the required chats first.",
    ),
    phone_verification_required: T(
      "شماره خود را در ربات تأیید کنید.",
      "Verify your contact in the bot.",
    ),
    rules_acceptance_required: T(
      "قوانین جدید را بخوانید و بپذیرید.",
      "Read and accept the rules.",
    ),
    trial_limit_reached: T(
      "سهمیه تست شما تمام شده است.",
      "Your trial allowance is used.",
    ),
    test_plan_unavailable: T(
      "سرویس تست تنظیم نشده است.",
      "No trial service is configured.",
    ),
    service_shop_unavailable: T(
      "خرید جدید موقتاً متوقف است.",
      "New purchases are temporarily paused.",
    ),
    provider_network_error: T(
      "پنل سرویس در دسترس نیست؛ وضعیت عملیات را بررسی کنید.",
      "The provider is unreachable; check the operation status.",
    ),
    panel_unavailable: T(
      "این موقعیت فعلاً در دسترس نیست.",
      "This location is unavailable.",
    ),
    rate_limited: T(
      "کمی صبر کنید و دوباره تلاش کنید.",
      "Please wait and try again.",
    ),
    invalid_transaction_hash: T(
      "هش تراکنش معتبر نیست.",
      "Invalid transaction hash.",
    ),
    payment_not_finished: T(
      "پرداخت هنوز نهایی نشده است.",
      "Payment is not finished yet.",
    ),
    signed_webhook_required: T(
      "تأیید ترونادو پس از دریافت وب‌هوک امضاشده خودکار انجام می‌شود. اگر پرداخت کرده‌اید کمی صبر کنید.",
      "Tronado is confirmed automatically by its signed webhook. Please wait after paying.",
    ),
    payment_amount_mismatch: T(
      "مبلغ تأییدشده با فاکتور مطابقت ندارد؛ با پشتیبانی تماس بگیرید.",
      "The confirmed amount does not match the invoice. Contact support.",
    ),
    payment_requires_review: T(
      "این پرداخت نیازمند بررسی پشتیبانی است؛ دوباره پرداخت نکنید.",
      "This payment requires support review. Do not pay again.",
    ),
    payment_not_verified: T(
      "پرداخت هنوز از درگاه تأیید نشده است.",
      "Payment has not been verified.",
    ),
    underpayment: T(
      "مبلغ واریز کمتر از فاکتور است.",
      "The transfer amount is insufficient.",
    ),
    wrong_crypto_recipient_or_token: T(
      "مقصد، شبکه یا توکن با فاکتور مطابقت ندارد.",
      "Recipient, network or token does not match.",
    ),
    crypto_memo_mismatch: T(
      "Memo تراکنش با فاکتور مطابقت ندارد.",
      "The transaction memo does not match.",
    ),
    transaction_outside_invoice_window: T(
      "زمان تراکنش خارج از مهلت این فاکتور است.",
      "Transaction time is outside the invoice window.",
    ),
    transaction_not_confirmed: T(
      "تراکنش هنوز تأیید نشده است.",
      "The transaction is not confirmed yet.",
    ),
    insufficient_confirmations: T(
      "تأییدهای شبکه هنوز کافی نیست.",
      "More network confirmations are required.",
    ),
    payment_reference_reused: T(
      "این تراکنش قبلاً استفاده شده است.",
      "This transaction was already used.",
    ),
    invalid_receipt_file: T(
      "عکس JPEG/PNG یا PDF تا ۱۰ مگابایت انتخاب کنید.",
      "Choose a JPEG/PNG photo or PDF up to 10 MB.",
    ),
    gift_unavailable: T(
      "کد هدیه معتبر نیست یا ظرفیت آن تمام شده است.",
      "Gift code is unavailable.",
    ),
    gift_already_used: T(
      "قبلاً از این هدیه استفاده کرده‌اید.",
      "You already used this gift.",
    ),
    coupon_unavailable: T(
      "کد تخفیف معتبر نیست.",
      "Discount code is unavailable.",
    ),
    coupon_already_used: T(
      "سهمیه استفاده از این کد تمام شده است.",
      "You have used this discount allowance.",
    ),
    daily_spin_limit: T(
      "سهمیه چرخش امروز تمام شده است.",
      "Daily spin allowance used.",
    ),
    wheel_budget_exhausted: T(
      "بودجه هدیه امروز تمام شده است.",
      "Today’s reward budget is exhausted.",
    ),
    wheel_disabled: T("گردونه فعال نیست.", "The wheel is disabled."),
    service_operation_pending: T(
      "عملیات دیگری برای این سرویس در حال انجام است.",
      "Another operation is pending.",
    ),
    panel_action_unsupported: T(
      "این قابلیت در نوع پنل این سرویس پشتیبانی نمی‌شود.",
      "This provider does not support that action.",
    ),
    agent_minimum_payment_required: T(
      "حداقل واریز لازم برای نمایندگی را ندارید.",
      "The minimum verified funding for reseller access is not met.",
    ),
    public_url_required: T(
      "نشانی مینی‌اپ هنوز توسط مدیر تنظیم نشده است.",
      "The administrator has not configured the portal URL.",
    ),
    gateway_unavailable: T(
      "این روش پرداخت فعال نیست.",
      "This payment method is unavailable.",
    ),
    invalid_service_name: T(
      "نام سرویس باید ۳ تا ۶۰ کاراکتر لاتین، عدد یا زیرخط باشد.",
      "Use 3–60 ASCII letters, numbers, hyphens or underscores.",
    ),
    target_must_start_bot: T(
      "گیرنده باید ابتدا ربات را شروع کند.",
      "The recipient must start the bot first.",
    ),
    service_unavailable: T(
      "سرویس فعلاً قابل استفاده نیست.",
      "The service is unavailable.",
    ),
    invalid_number: T("مقادیر فرم را بررسی کنید.", "Check the form values."),
    invalid_amount: T("مبلغ معتبر وارد کنید.", "Enter a valid amount."),
    fee_changed: T(
      "هزینه تغییر کرده است؛ دوباره تأیید کنید.",
      "The fee changed; confirm again.",
    ),
  };
  return (
    dict[code] || T("عملیات انجام نشد. کد: ", "Operation failed. Code: ") + code
  );
}
async function api(path, opts = {}) {
  const generation = P.authGeneration;
  const headers = {};
  if (P.token) headers.authorization = "Bearer " + P.token;
  let body = opts.body;
  if (body && !(body instanceof FormData)) {
    headers["content-type"] = "application/json";
    body = JSON.stringify(body);
  }
  const r = await fetch(portalAPI(path), {
    method: opts.method || "GET",
    headers,
    body,
  });
  const data = await r
    .json()
    .catch(() => ({ ok: false, error: "invalid_response" }));
  if (generation !== P.authGeneration) throw new Error("session_changed");
  if (!r.ok || !data.ok) throw new Error(data.error || "http_" + r.status);
  return data.data;
}
function toast(text, error = false) {
  const host = el("portal-toast");
  const item = document.createElement("div");
  item.textContent = text;
  if (error) item.style.color = "var(--danger)";
  host.replaceChildren(item);
  setTimeout(() => item.remove(), 4200);
}
function closeModal() {
  el("portal-modal").hidden = true;
  el("portal-modal-body").innerHTML = "";
  P.modalGeneration++;
  for (const url of P.urls) URL.revokeObjectURL(url);
  P.urls.clear();
}
function modal(title, body) {
  P.modalGeneration++;
  el("portal-modal-body").innerHTML =
    `<div class="modal-head"><h2 id="modal-title">${title}</h2>${button("×", "closeModal", "", "icon-button")}</div>${body}`;
  el("portal-modal").hidden = false;
  return P.modalGeneration;
}
async function loadingModal(title, fn) {
  const gen = modal(title, '<div class="loading"></div>');
  try {
    const body = await fn();
    if (gen === P.modalGeneration)
      el("portal-modal-body").innerHTML =
        `<div class="modal-head"><h2 id="modal-title">${title}</h2>${button("×", "closeModal", "", "icon-button")}</div>${body}`;
  } catch (e) {
    if (gen === P.modalGeneration)
      el("portal-modal-body").innerHTML =
        `<div class="modal-head"><h2 id="modal-title">${title}</h2>${button("×", "closeModal", "", "icon-button")}</div>${notice(esc(errorText(e.message)), "error")}`;
  }
}
function brandHTML() {
  const b = P.data?.settings.brand;
  return `<div class="brand-symbol">${b?.logo ? `<img alt="" src="${esc(b.logo)}">` : esc(b?.mark || "S")}</div>`;
}
function shell(content) {
  const name = P.data?.settings.brand;
  document.documentElement.lang = P.lang;
  document.documentElement.dir = P.lang === "en" ? "ltr" : "rtl";
  if (name?.accent)
    document.documentElement.style.setProperty("--accent", name.accent);
  const title = P.lang === "en" ? name?.nameEn : name?.name;
  el("portal-app").innerHTML =
    `<div class="shell"><header>${brandHTML()}<div class="header-info"><h1>${esc(title || T("پنل خدمات مشتری", "Customer portal"))}</h1><div class="subtitle">CUSTOMER PORTAL · CLOUDFLARE</div></div>${button(P.lang === "fa" ? "EN" : "فا", "language", "", "icon-button")}${P.token ? button(icon("refresh"), "refresh", "", "icon-button") : ""}</header><main id="portal-view" class="page">${content}</main></div>${
      P.data?.gate.ok
        ? `<nav class="bottom-nav" aria-label="${T("ناوبری", "Navigation")}"><div>${[
            ["store", icon("store"), T("خرید", "Shop")],
            ["services", icon("services"), T("سرویس‌ها", "Services")],
            ["wallet", icon("wallet"), T("کیف پول", "Wallet")],
            ["rewards", icon("gift"), T("هدیه‌ها", "Rewards")],
            ["help", icon("help"), T("راهنما", "Help")],
          ]
            .map(
              ([id, icon, label]) =>
                `<button type="button" data-action="nav" data-tab="${id}" class="${P.tab === id || (id === "help" && P.tab === "support") ? "active" : ""}" aria-current="${P.tab === id ? "page" : "false"}"><span>${icon}</span><span>${label}${id === "help" && P.data?.support?.unread ? `<span class="nav-badge">${num(P.data.support.unread, 0)}</span>` : ""}</span></button>`,
            )
            .join("")}</div></nav>`
        : ""
    }`;
}
function loggedOut(message) {
  P.data = null;
  shell(
    `<section class="hero"><div class="eyebrow">SECURE TELEGRAM SIGN IN</div><h2>${T("از ربات وارد شوید", "Open from the bot")}</h2><p>${esc(message || T("این پنل فقط با ورود معتبر تلگرام یا لینک یک‌بارمصرف ربات باز می‌شود.", "Open this portal through Telegram or your single-use bot login link."))}</p></section>`,
  );
}
async function bootstrap() {
  P.data = await api("/bootstrap");
  if (!P.data.gate.ok) return showGates();
  await renderPage();
}
function showGates() {
  const g = P.data.gate,
    s = P.data.settings;
  let html = `<section class="hero"><div class="eyebrow">WELCOME / SECURE ACCESS</div><h2>${T("پیش از شروع", "Before you begin")}</h2><p>${T("برای دسترسی به خدمات، مراحل زیر را کامل کنید.", "Complete the required steps to access services.")}</p></section><div class="divider"></div>`;
  if (!g.membership)
    html +=
      notice(
        T(
          "عضویت در همه مقصدهای زیر لازم است.",
          "Join every required chat below.",
        ),
        g.unavailable ? "warn" : "",
      ) +
      (g.unavailable
        ? '<p class="hint">' +
          T(
            "تلگرام فعلاً عضویت را تأیید نکرد؛ دسترسی باز نشده است.",
            "Telegram could not verify membership; access stays locked.",
          ) +
          "</p>"
        : "") +
      `<div class="gate-list">${g.requiredChats
        .filter((c) => /^https:\/\//.test(c.url))
        .map(
          (c) =>
            `<a class="btn" href="${esc(c.url)}" target="_blank" rel="noopener noreferrer">↗ ${esc(c.title)}</a>`,
        )
        .join(
          "",
        )}${button(T("عضو شدم؛ بررسی دوباره", "I joined; check again"), "refresh", "", "primary")}</div>`;
  if (g.rulesRequired)
    html += `<section class="card"><h3>${T("قوانین استفاده", "Terms of use")}</h3><div class="rules">${esc(P.lang === "en" ? s.rulesEn || s.rules : s.rules)}</div><div class="actions">${button(T("می‌پذیرم", "I agree"), "acceptRules", "", "primary")}</div></section>`;
  if (g.phoneRequired)
    html += `<section class="card"><h3>${T("تأیید شماره", "Verify your phone")}</h3><p class="hint">${T("در ربات دکمه ارسال شماره خودتان را بزنید؛ شماره تایپ‌شده یا تماس شخص دیگر معتبر نیست.", "Share your own contact in the bot. Typed numbers or another person’s contact are not accepted.")}</p><div class="actions">${button(T("باز کردن ربات", "Open bot"), "phone", "", "primary")}${button(T("شماره تأیید شد؛ بررسی", "I verified; check"), "refresh")}</div></section>`;
  shell(html);
}
async function renderPage() {
  if (!P.data?.gate.ok) return showGates();
  shell('<div class="loading"></div>');
  const tab = P.tab;
  try {
    const body = await {
      store: storePage,
      services: servicesPage,
      wallet: walletPage,
      rewards: rewardsPage,
      help: helpPage,
      support: supportPage,
    }[tab]();
    if (P.tab === tab && el("portal-view")) el("portal-view").innerHTML = body;
  } catch (e) {
    if (el("portal-view"))
      el("portal-view").innerHTML =
        notice(esc(errorText(e.message)), "error") +
        `<div class="actions">${button(T("دوباره تلاش کن", "Retry"), "refresh")}</div>`;
  }
}
async function storePage() {
  const data = await api("/catalog");
  P.plans = data.plans;
  const categories = [
      ...new Set(P.plans.map((p) => p.category).filter(Boolean)),
    ],
    locations = [...new Set(P.plans.map((p) => p.location).filter(Boolean))];
  const plans = P.plans.filter(
    (p) =>
      (!P.filter.category || p.category === P.filter.category) &&
      (!P.filter.location || p.location === P.filter.location),
  );
  const s = P.data.settings;
  return `<section class="hero"><div class="eyebrow">FIND YOUR NEXT CONNECTION</div><h2>${T("یک اتصال، به انتخاب شما", "Your next connection")}</h2><p>${T("پلن مورد نظر را انتخاب کنید؛ مبلغ نهایی قبل از خرید تأیید می‌شود.", "Choose a plan. Review the final price before confirming your purchase.")}</p><div class="actions" style="margin-top:18px">${s.testPlanId ? button(icon("trial") + T("دریافت تست", "Try a service"), "trial") : ""}${button(icon("card") + T("شارژ کیف پول", "Top up wallet"), "nav", 'data-tab="wallet"')}</div></section>${s.maintenance || !s.enabled ? '<div style="margin-top:16px">' + notice(T("خرید جدید موقتاً متوقف است؛ سرویس‌ها و سوابق شما حفظ شده‌اند.", "New sales are paused. Your services and records are preserved."), "warn") + "</div>" : ""}<div class="toolbar"><select id="filter-category" aria-label="${T("دسته‌بندی", "Category")}"><option value="">${T("همه دسته‌ها", "All categories")}</option>${categories.map((c) => `<option ${P.filter.category === c ? "selected" : ""}>${esc(c)}</option>`).join("")}</select><select id="filter-location" aria-label="${T("موقعیت", "Location")}"><option value="">${T("همه موقعیت‌ها", "All locations")}</option>${locations.map((l) => `<option ${P.filter.location === l ? "selected" : ""}>${esc(l)}</option>`).join("")}</select></div><div class="grid">${plans.map((p) => `<article class="card plan"><div class="between"><span class="chip">${esc(p.location)}</span>${p.custom ? '<span class="chip">' + T("دلخواه", "Custom") + "</span>" : ""}</div><h3>${esc((P.lang === "en" && p.titleEn) || p.title)}</h3><p class="muted small">${esc(p.description || "")}</p><div class="specs"><span class="chip">${p.volumeGB ? num(p.volumeGB) + " GB" : T("حجم نامحدود", "Unlimited data")}</span><span class="chip">${p.days ? num(p.days) + " " + T("روز", "days") : T("زمان نامحدود", "No expiry")}</span>${p.firstUse ? '<span class="chip">' + T("از اولین اتصال", "From first use") + "</span>" : ""}</div><div class="price">${num(p.price, 0)} <small>${T("تومان", "toman")}</small></div><div class="actions">${button(T("انتخاب و خرید", "Choose plan"), "buy", `data-id="${p.id}"`, "primary")}</div></article>`).join("") || empty(T("فعلاً پلنی برای شما موجود نیست.", "No available plans for your account."))}</div>`;
}
function planForm(p, kind = "buy", serviceId = "") {
  return `<form data-form="quote"><input type="hidden" id="buy-plan" value="${p.id}"><input type="hidden" id="buy-kind" value="${kind}"><input type="hidden" id="buy-service" value="${serviceId}"><p class="price">${money(p.price)}</p><p class="muted small">${esc(p.description || "")}</p>${p.custom ? `<div class="grid">${field("buy-gb", T("حجم دلخواه GB", "Custom GB"), p.volumeGB, `type="number" min="${p.minGB}" max="${p.maxGB}" step="0.1" required`)}${field("buy-days", T("روز دلخواه", "Custom days"), p.days, `type="number" min="${p.minDays}" max="${p.maxDays}" required`)}</div>` : ""}${kind === "buy" ? field("buy-quantity", T("تعداد", "Quantity"), 1, 'type="number" min="1" max="10" required') : ""}${kind === "buy" && P.data.settings.customNames ? field("buy-name", T("نام لاتین دلخواه؛ اختیاری، فقط خرید تکی", "Custom ASCII name; optional, single purchase only"), "", 'pattern="[A-Za-z][A-Za-z0-9_-]{2,59}" maxlength="60" dir="ltr"') : ""}${field("buy-coupon", T("کد تخفیف؛ اختیاری", "Discount code; optional"), "", 'dir="ltr" maxlength="40"')}<p class="hint">${T("این مرحله پرداخت نیست؛ ابتدا پیش‌فاکتور دقیق را می‌بینید.", "This step does not charge you. You will review a server-calculated quote.")}</p><div class="actions"><button type="submit" class="btn primary">${T("مشاهده پیش‌فاکتور", "Review quote")}</button></div></form>`;
}
async function servicesPage() {
  const [s, o] = await Promise.all([api("/services"), api("/operations")]);
  P.services = s.rows;
  P.operations = o.rows;
  const pending = o.rows.filter((o) =>
    ["queued", "sending", "review"].includes(o.status),
  );
  return `${pending.length ? `<div class="section-head"><h2>${T("سفارش‌های در حال انجام", "Pending orders")}</h2></div>${pending.map((o) => `<section class="card"><div class="between"><b>${esc(o.planTitle)}</b>${chip(o.status)}</div><p class="hint">${money(o.amount)} · ${date(o.createdAt)}</p>${o.error ? notice(esc(errorText(o.error)), "warn") : ""}${o.status === "queued" ? `<div class="actions">${button(T("لغو و آزادسازی رزرو", "Cancel & release hold"), "cancelOperation", `data-id="${o.id}"`)}</div>` : ""}</section>`).join("")}` : ""}<div class="actions" style="margin-top:20px">${button(T("لینک تجمیعی سرویس‌ها", "Combined subscription"), "combined")}</div><div class="section-head"><h2>${T("سرویس‌های من", "My services")}</h2><span class="chip">${num(s.rows.length)}</span></div>${s.rows.map((s) => `<article class="card"><div class="service-head"><div><h3>${esc(s.title)}</h3><p class="service-name">${esc(s.username)}</p></div>${chip(s.status)}</div>${s.usageAvailable ? `<div class="meter"><span style="width:${s.dataLimit ? Math.min(100, (s.usedBytes / s.dataLimit) * 100) : 0}%"></span></div><div class="between small muted"><span>${T("مصرف", "Used")}: ${num(s.usedBytes / GB)} GB</span><span>${s.dataLimit ? num(s.dataLimit / GB) + " GB" : "∞"}</span></div>` : '<p class="hint">' + T("مصرف آنلاین برای این نوع سرویس در دسترس نیست.", "Live traffic metering is unavailable for this service type.") + "</p>"}<p class="hint">${esc(s.location || s.panelTitle || "")} · ${T("انقضا", "Expiry")}: ${s.expiresAt ? date(s.expiresAt * 1000) : s.status === "on_hold" ? T("پس از اولین اتصال", "After first connection") : T("تاریخ ثابت ندارد", "No fixed expiry")}</p>${s.lastSyncError ? notice(T("اطلاعات ممکن است قدیمی باشد؛ بروزرسانی پنل ناموفق بوده است.", "Provider synchronization failed; displayed information may be stale."), "warn") : ""}<div class="actions" style="margin-top:18px">${button(T("کانفیگ و QR", "Configs & QR"), "content", `data-id="${s.id}"`, "primary")}${button(T("مدیریت سرویس", "Manage service"), "manage", `data-id="${s.id}"`)}</div></article>`).join("") || empty(T("هنوز سرویسی ندارید؛ از فروشگاه پلن انتخاب کنید.", "No services yet. Choose a plan in the store."), icon("services"))}`;
}
async function walletPage() {
  const [w, p, g] = await Promise.all([
    api("/wallet"),
    api("/payments"),
    api("/gateways"),
  ]);
  P.data.account = w.account;
  P.payments = p.rows;
  P.gateways = g.rows;
  return `<section class="hero"><div class="eyebrow">YOUR WALLET</div><p>${T("اعتبار قابل استفاده", "Available credit")}</p><div class="wallet-number">${num(w.account.available, 0)} <small>${T("تومان", "toman")}</small></div><div class="between small muted"><span>${T("مانده", "Balance")}: ${money(w.account.balance)}</span><span>${T("رزرو", "Held")}: ${money(w.account.held)}</span></div><div class="actions" style="margin-top:20px">${button(icon("plus") + T("شارژ کیف پول", "Top up"), "topup", "", "primary")}${button(icon("gift") + T("کد هدیه", "Gift code"), "gift")}</div></section><div class="section-head"><h2>${T("فاکتورهای پرداخت", "Payment invoices")}</h2></div>${
    p.rows
      .slice(0, 20)
      .map(
        (p) =>
          `<div class="card"><div class="between"><b>${money(p.amount)}</b>${chip(p.status)}</div><p class="hint">${esc(p.type)} · ${date(p.createdAt)}</p><div class="actions">${button(T("مشاهده و پیگیری", "Details & status"), "payment", `data-id="${p.id}"`)}</div></div>`,
      )
      .join("") || empty(T("فاکتوری ندارید.", "No payment invoices."))
  }<div class="section-head"><h2>${T("گردش حساب", "Wallet activity")}</h2></div><div class="card">${w.entries.map((e) => `<div class="line"><div class="line-main"><p class="small">${esc(reasonName(e.reason))}</p><small>${date(e.at)}</small>${e.holdDelta ? '<p class="small muted">' + T("تغییر رزرو", "Reservation change") + ": " + money(e.holdDelta) + "</p>" : ""}</div><span class="amount ${e.delta >= 0 ? "positive" : "negative"}">${e.delta > 0 ? "+" : ""}${money(e.delta)}</span></div>`).join("") || '<p class="muted small">' + T("هنوز گردشی ثبت نشده است.", "No activity yet.") + "</p>"}</div>`;
}
function reasonName(s) {
  return (
    {
      verified_topup: T("واریز تأییدشده", "Verified payment"),
      admin_adjustment: T("اصلاح موجودی توسط مدیر", "Admin adjustment"),
      service_reservation: T("رزرو خرید سرویس", "Service purchase hold"),
      service_failed: T("آزادسازی رزرو", "Reservation released"),
      service_buy: T("خرید سرویس", "Service purchase"),
      service_trial: T("سرویس تست", "Trial service"),
      service_renew: T("تمدید سرویس", "Service renewal"),
      service_volume: T("حجم اضافه", "Extra traffic"),
      service_time: T("روز اضافه", "Extra days"),
      service_refund: T("استرداد سرویس", "Service refund"),
      signup_gift: T("هدیه عضویت", "Signup gift"),
      gift_code: T("کد هدیه", "Gift code"),
      referral_commission: T("پورسانت معرفی", "Referral commission"),
      wheel: T("گردونه", "Reward wheel"),
      raffle_prize: T("جایزه قرعه‌کشی", "Raffle prize"),
    }[s] || s
  );
}
async function paymentHTML(id) {
  const list = await api("/payments");
  P.payments = list.rows;
  const p = P.payments.find((p) => p.id === id);
  if (!p) throw new Error("payment_not_found");
  P.currentPayment = p;
  const open = p.status === "pending";
  return `<div class="between"><div class="price">${money(p.amount)}</div>${chip(p.status)}</div><p class="service-name">#${p.id}</p><p class="hint">${T("مهلت پرداخت", "Pay before")}: ${date(p.expiresAt)}</p>${p.url && open ? `<div class="actions"><button class="btn primary wide" data-action="openPayment" data-id="${p.id}">${T("باز کردن پرداخت امن", "Open secure payment")}</button></div>` : ""}${p.type === "manual" && open ? `<div class="divider"></div><p class="muted small">${T("کارت مقصد", "Recipient card")}</p><div class="codebox">${esc(p.cardNumber)}\n${esc(p.cardHolder)}</div>${notice(T("پس از واریز واقعی، عکس یا PDF فیش را ارسال کنید. تأیید فیش توسط مدیر انجام می‌شود.", "After transferring funds, upload a receipt photo or PDF for manual administrator review."), "warn")}<form data-form="receipt"><label for="payment-receipt">${T("عکس یا PDF تا ۱۰ مگابایت", "Photo or PDF up to 10 MB")}</label><input type="file" id="payment-receipt" accept="image/png,image/jpeg,application/pdf" required><div class="actions"><button type="submit" class="btn primary">${T("ارسال فیش برای بررسی", "Submit for review")}</button></div></form>` : ""}${p.type === "crypto" && ["pending", "review", "expired"].includes(p.status) ? `<div class="divider"></div>${p.status === "expired" ? notice(T("مهلت واریز تمام شده؛ پرداخت جدید انجام ندهید. اگر قبلاً پرداخت کرده‌اید، فقط هش همان تراکنش را بفرستید.", "Payment window expired. Do not make a new transfer. If you already paid, submit the existing transaction hash."), "warn") : ""}<p>${T("فقط این ارز و شبکه", "Only this currency / network")}: <b>${esc(p.currency)}</b></p><div class="codebox">${esc(p.address)}</div><p class="price">${esc(p.cryptoAmount)} <small>${esc(p.currency)}</small></p>${p.memo ? '<p class="hint">' + T("Memo الزامی", "Required memo") + '</p><div class="codebox">' + esc(p.memo) + "</div>" : ""}${notice(T("مقصد، شبکه، مبلغ و Memo باید دقیق باشد. بدون Memo قابل تأیید خودکار نیست؛ از کیف پول پشتیبان Memo یا درگاه استفاده کنید.", "Use the exact recipient, network, amount and memo. Automatic verification requires the invoice memo; use a compatible wallet or a hosted gateway."), "warn")}<form data-form="crypto"><label for="crypto-hash">${T("هش تراکنش", "Transaction hash")}</label><input id="crypto-hash" dir="ltr" required><div class="actions"><button type="submit" class="btn primary">${T("ثبت هش و استعلام", "Submit hash & verify")}</button></div></form>` : ""}${p.lastError ? '<div style="margin-top:16px">' + notice(esc(errorText(p.lastError)), "warn") + "</div>" : ""}<div class="actions">${button(T("بررسی وضعیت", "Check status"), "checkPayment", `data-id="${p.id}"`)}${open ? button(T("لغو فاکتور", "Cancel invoice"), "cancelPayment", `data-id="${p.id}"`, "danger") : ""}</div>`;
}
async function rewardsPage() {
  const r = await api("/raffles");
  return `<section class="hero"><div class="eyebrow">MEMBER REWARDS</div><h2>${T("هدیه برای همراهی شما", "Rewards for being here")}</h2><p>${T("هدیه‌ها به اعتبار قابل استفاده در فروشگاه اضافه می‌شوند.", "Rewards add credit usable in this service store.")}</p></section><div class="section-head"><h2>${T("کد هدیه", "Gift code")}</h2></div><section class="card"><p class="muted small">${T("کد هدیه دارید؟ آن را در کیف پول فعال کنید.", "Have a gift code? Redeem it for wallet credit.")}</p><div class="actions">${button(T("ثبت کد هدیه", "Redeem code"), "gift", "", "primary")}</div></section>${portalDiceCard()}${P.data.settings.wheel.enabled ? `<div class="section-head"><h2>${T("گردونه", "Reward wheel")}</h2></div><section class="card"><div class="prize-ring" id="prize-ring">${icon("spark")}</div><p class="between small"><span>${T("هزینه هر چرخش", "Cost per spin")}: ${money(P.data.settings.wheel.fee)}</span><span>${P.data.settings.wheel.dailySpins} ${T("بار در روز", "per day")}</span></p><div class="actions">${button(T("مشاهده و تأیید چرخش", "Review & confirm spin"), "wheelConfirm", "", "primary")}</div></section>` : ""}<div class="section-head"><h2>${T("قرعه‌کشی‌های رایگان", "Free raffles")}</h2></div>${r.rows.map((r) => `<section class="card"><div class="between"><b>${esc(r.title)}</b><span class="chip">${r.status === "drawn" ? T("انجام شده", "Drawn") : T("باز", "Open")}</span></div><p class="hint">${date(r.closesAt)} · ${num(r.entriesCount)} ${T("شرکت‌کننده", "entries")}</p><p class="small">${T("جوایز", "Prizes")}: ${r.prizes.map(money).join(" / ")}</p>${r.status === "open" ? `<div class="actions">${r.joined ? '<span class="chip good">' + T("شما ثبت‌نام کرده‌اید", "You joined") + "</span>" : button(T("شرکت رایگان", "Join for free"), "raffle", `data-id="${r.id}"`, "primary")}</div>` : `<p class="hint">${r.winners.some((w) => w.userId === String(P.data.user.id)) ? icon("spark") + T("شما برنده شده‌اید؛ اعتبار در کیف پول ثبت شد.", "You won! Credit was added to your wallet.") : T("نتیجه ثبت شد و اعتبار برندگان واریز شده است.", "Results recorded; winners received wallet credit.")}</p>`}</section>`).join("") || empty(T("قرعه‌کشی فعالی وجود ندارد.", "No raffles are available."))}`;
}
// Live support desk: the message is filed as a panel ticket and the administrator
// reply arrives here and in the Telegram chat.
function supportBubbles(thread) {
  if (!thread.messages.length)
    return empty(
      T(
        "هنوز پیامی رد و بدل نشده است. اولین پیام خود را بفرستید.",
        "No messages yet. Send your first message.",
      ),
      icon("mail"),
    );
  return `<div class="support-thread">${thread.messages
    .map(
      (m) =>
        `<div class="support-bubble ${m.from === "support" ? "from-support" : "from-me"}"><span class="support-who">${m.from === "support" ? T("پشتیبانی", "Support") : T("شما", "You")}</span><p>${esc(m.text)}</p><time>${date(m.at)}</time></div>`,
    )
    .join("")}</div>`;
}
function supportHTML(thread, enabled) {
  const composer = enabled
    ? `<form data-form="support" class="support-form"><label for="support-text">${T("پیام شما", "Your message")}</label><textarea id="support-text" rows="3" maxlength="2000" required placeholder="${T("مشکل یا سؤال خود را بنویسید…", "Describe your question or issue…")}"></textarea><div class="actions"><button type="submit" class="btn primary">${T("ارسال پیام", "Send message")}</button>${button(T("بروزرسانی گفتگو", "Refresh chat"), "supportReload")}</div></form>`
    : notice(
        T(
          "پشتیبانی در این ربات غیرفعال است؛ با مدیر تماس بگیرید.",
          "Support is disabled for this bot; contact the administrator.",
        ),
        "warn",
      );
  return `<section class="hero"><div class="eyebrow">SUPPORT DESK</div><h2>${T("گفتگو با پشتیبانی", "Chat with support")}</h2><p>${T("پیام شما در پنل مدیریت ثبت می‌شود و پاسخ، هم اینجا و هم در ربات تلگرام به شما می‌رسد.", "Your message is filed in the admin panel. The reply appears here and in the Telegram bot.")}</p></section>${thread.open ? "" : '<div style="margin-top:14px">' + notice(T("این گفتگو بسته شده است؛ با ارسال پیام جدید دوباره باز می‌شود.", "This conversation was closed; a new message reopens it."), "warn") + "</div>"}<div class="section-head"><h2>${T("پیام‌ها", "Messages")}</h2>${button(icon("refresh"), "supportReload", "", "icon-button")}</div><section class="card">${supportBubbles(thread)}</section><section class="card" style="margin-top:14px">${composer}</section><div class="actions" style="margin-top:14px">${button(T("بازگشت به راهنما", "Back to help"), "nav", 'data-tab="help"')}${P.data.botUsername ? button(T("باز کردن ربات", "Open the bot"), "openBotChat") : ""}</div>`;
}
async function supportPage() {
  const d = await api("/support");
  P.support = d.support;
  if (P.data?.support) P.data.support.unread = 0;
  return supportHTML(d.support, d.enabled !== false);
}
async function helpPage() {
  return `<section class="hero"><div class="eyebrow">HELP & SUPPORT</div><h2>${T("کنار شما هستیم", "We are here to help")}</h2><p>${T("راهنما، کلاینت‌ها و پشتیبانی خدمات", "Guides, client apps and service support")}</p><div class="actions" style="margin-top:18px">${button(icon("chat") + T("گفتگو با پشتیبانی", "Chat with support"), "support", "", "primary")}${button(icon("agent") + T("درخواست نمایندگی", "Reseller request"), "agent")}</div></section><div class="section-head"><h2>${T("کلاینت‌ها و راهنما", "Client apps & guides")}</h2></div>${P.data.settings.clientApps.map((a) => `<section class="card"><div class="between"><b>${esc(a.title)}</b><span class="chip">${esc(a.os)}</span></div><p class="hint">${esc(a.help)}</p><div class="actions"><a class="btn" href="${esc(a.url)}" target="_blank" rel="noopener noreferrer">${T("دریافت برنامه", "Get app")} ↗</a></div></section>`).join("") || empty(T("مدیر هنوز راهنمای کلاینت اضافه نکرده است.", "No client guides have been added."))}<div class="divider"></div><section class="card"><h3>${T("حساب شما", "Your account")}</h3><p class="hint">${esc(P.data.user.name)} · ${esc(P.data.user.id)}</p><div class="actions">${button(T("خروج از نشست", "Sign out"), "logout", "", "danger")}</div></section>`;
}
const actions = {
  closeModal,
  nav: async (d) => {
    P.tab = d.tab;
    closeModal();
    await renderPage();
    window.scrollTo({ top: 0, behavior: "auto" });
  },
  language: async () => {
    P.lang = P.lang === "fa" ? "en" : "fa";
    localStorage.setItem("svc_lang", P.lang);
    closeModal();
    if (P.data) await bootstrap();
    else loggedOut();
  },
  refresh: () => bootstrap(),
  acceptRules: async () => {
    await api("/rules", {
      method: "POST",
      body: { version: P.data.settings.rulesVersion },
    });
    await bootstrap();
  },
  phone: () => openBot("svc_phone"),
  support: async () => {
    P.tab = "support";
    closeModal();
    await renderPage();
    window.scrollTo({ top: 0, behavior: "auto" });
  },
  supportReload: async () => {
    if (P.tab !== "support") return;
    const host = el("portal-view");
    const d = await api("/support");
    P.support = d.support;
    if (host) host.innerHTML = supportHTML(d.support, d.enabled !== false);
  },
  openBotChat: () => {
    if (P.data?.botUsername)
      openTelegram("https://t.me/" + P.data.botUsername);
  },
  buy: (d) => {
    const p = P.plans.find((p) => p.id === d.id);
    if (p) modal((P.lang === "en" && p.titleEn) || p.title, planForm(p));
  },
  trial: async () => {
    const s = P.data.settings;
    const data = await api("/quote", {
      method: "POST",
      body: { kind: "trial", planId: s.testPlanId },
    });
    showQuote(data.quote);
  },
  confirmQuote: async () => {
    const q = P.quote;
    const d = await api("/purchase", {
      method: "POST",
      body: { quoteId: q.id },
    });
    closeModal();
    toast(T("سفارش در صف ساخت قرار گرفت.", "Order queued for provisioning."));
    P.tab = "services";
    await bootstrap();
  },
  topup: () => {
    const rows = P.gateways;
    modal(
      T("شارژ کیف پول", "Top up wallet"),
      rows.length
        ? `<form data-form="topup">${field("topup-amount", T("مبلغ تومان", "Amount (toman)"), P.shortfall || P.data.settings.topupMin, `type="number" min="${P.data.settings.topupMin}" max="${P.data.settings.topupMax}" step="1" required`)}${select(
            "topup-gateway",
            T("روش پرداخت", "Payment method"),
            rows.map((g) => [g.id, g.title]),
          )}<p class="hint">${T("پرداخت پس از تأیید معتبر به کیف پول اضافه می‌شود.", "Wallet credit is added after verified payment.")}</p><div class="actions"><button type="submit" class="btn primary">${T("ساخت فاکتور", "Create invoice")}</button></div></form>`
        : notice(
            T(
              "روش پرداختی فعال نیست؛ با پشتیبانی تماس بگیرید.",
              "No payment method is enabled; contact support.",
            ),
            "warn",
          ),
    );
    P.topupRequest = crypto.randomUUID();
  },
  payment: (d) =>
    loadingModal(T("فاکتور پرداخت", "Payment invoice"), () =>
      paymentHTML(d.id),
    ),
  openPayment: (d) => {
    const p = P.payments.find((p) => p.id === d.id) || P.currentPayment;
    if (!p?.url?.startsWith("https://")) return;
    if (p.type === "stars" && TG?.openInvoice)
      TG.openInvoice(p.url, () => actions.checkPayment({ id: p.id }));
    else if (TG?.openLink) TG.openLink(p.url);
    else window.open(p.url, "_blank", "noopener,noreferrer");
  },
  checkPayment: async (d) => {
    await api("/payments/" + d.id + "/check", { method: "POST", body: {} });
    await loadingModal(T("وضعیت پرداخت", "Payment status"), () =>
      paymentHTML(d.id),
    );
  },
  cancelPayment: async (d) => {
    if (
      !confirm(
        T(
          "این فاکتور لغو شود؟ بعد از لغو به آن واریز نکنید.",
          "Cancel this invoice? Do not send payment afterwards.",
        ),
      )
    )
      return;
    await api("/payments/" + d.id + "/cancel", { method: "POST" });
    closeModal();
    await bootstrap();
  },
  cancelOperation: async (d) => {
    await api("/operations/" + d.id + "/cancel", { method: "POST" });
    toast(T("رزرو آزاد شد.", "Reservation released."));
    await bootstrap();
  },
  content: (d) =>
    loadingModal(T("کانفیگ و لینک اتصال", "Connection details"), async () => {
      const v = await api("/services/" + d.id + "/content");
      P.content = v;
      P.currentService = d.id;
      return `${notice(T("لینک‌ها و کانفیگ‌ها شخصی هستند؛ آنها را به دیگران ندهید.", "Connection details are private; do not share them."), "warn")}${
        [v.proxyUrl || v.subscriptionUrl, ...v.configs]
          .filter(Boolean)
          .map(
            (s, i) =>
              `<div class="codebox" style="margin-top:15px">${esc(s)}</div><div class="actions">${button(T("کپی", "Copy"), "copyConfig", `data-index="${i}"`)}</div>`,
          )
          .join("") ||
        notice(
          T(
            "اطلاعات اتصال هنوز آماده نیست.",
            "Connection details are not available yet.",
          ),
          "warn",
        )
      }<div class="divider"></div><div class="actions">${button("QR Code", "showQR", `data-id="${d.id}"`)}${button(T("کارت مصرف", "Usage card"), "showCard", `data-id="${d.id}"`)}</div><div id="asset-image"></div>`;
    }),
  copyConfig: async (d) => {
    const content = [
      P.content.proxyUrl || P.content.subscriptionUrl,
      ...P.content.configs,
    ].filter(Boolean)[Number(d.index)];
    await copy(content);
  },
  showQR: (d) => showImage("/services/" + d.id + "/qr", "qr"),
  showCard: (d) => showImage("/services/" + d.id + "/card", "infocard"),
  manage: (d) => {
    const s = P.services.find((s) => s.id === d.id);
    if (!s) return;
    P.currentService = s.id;
    const caps = s.capabilities;
    modal(
      T("مدیریت سرویس", "Manage service"),
      `<b>${esc(s.title)}</b><p class="service-name">${esc(s.username)}</p><div class="divider"></div><div class="actions">${caps.includes("renew") ? button(T("تمدید", "Renew"), "renew", `data-id="${s.id}"`) : ""}${caps.includes("volume") ? button(T("حجم اضافه", "Extra GB"), "extra", `data-id="${s.id}" data-kind="volume"`) : ""}${caps.includes("time") ? button(T("زمان اضافه", "Extra days"), "extra", `data-id="${s.id}" data-kind="time"`) : ""}</div><div class="actions">${caps.includes("toggle") ? button(s.status === "disabled" ? T("فعال‌سازی", "Enable") : T("توقف موقت", "Pause"), "simple", `data-id="${s.id}" data-kind="${s.status === "disabled" ? "enable" : "disable"}"`) : ""}${caps.includes("revoke") ? button(T("تغییر لینک و کلید", "Rotate connection"), "simple", `data-id="${s.id}" data-kind="revoke"`) : ""}${button(T("بروزرسانی", "Sync"), "simple", `data-id="${s.id}" data-kind="sync"`)}</div><div class="actions">${button(T("یادداشت", "Note"), "request", `data-id="${s.id}" data-kind="note"`)}${button(T("گزارش مشکل", "Report issue"), "request", `data-id="${s.id}" data-kind="report"`)}</div><div class="actions">${caps.includes("revoke") ? button(T("انتقال به کاربر", "Transfer"), "request", `data-id="${s.id}" data-kind="transfer"`) : ""}${caps.includes("toggle") ? button(T("تغییر موقعیت", "Change location"), "request", `data-id="${s.id}" data-kind="move"`) : ""}${button(T("درخواست استرداد", "Request refund"), "request", `data-id="${s.id}" data-kind="refund"`, "danger")}</div><p class="hint">${T("انتقال، جابه‌جایی و استرداد پس از بررسی مدیر انجام می‌شوند.", "Transfers, migration and refunds require administrator review.")}</p>`,
    );
  },
  renew: (d) =>
    loadingModal(T("تمدید سرویس", "Renew service"), async () => {
      const c = await api("/catalog");
      P.plans = c.plans;
      const s = P.services.find((s) => s.id === d.id),
        p = c.plans.find((p) => p.id === s.planId);
      if (!p) throw new Error("plan_unavailable");
      return planForm(p, "renew", s.id);
    }),
  extra: (d) => {
    P.extra = { id: d.id, kind: d.kind };
    modal(
      T("خرید حجم / زمان اضافه", "Buy extra quota"),
      `<form data-form="extra">${field("extra-units", d.kind === "volume" ? T("تعداد گیگابایت", "Gigabytes") : T("تعداد روز", "Days"), 1, 'type="number" min="1" required')}${field("extra-coupon", T("کد تخفیف؛ اختیاری", "Discount code; optional"), "", 'dir="ltr"')}<div class="actions"><button type="submit" class="btn primary">${T("دریافت پیش‌فاکتور", "Get quote")}</button></div></form>`,
    );
  },
  simple: async (d) => {
    if (
      ["revoke", "disable"].includes(d.kind) &&
      !confirm(
        T(
          "این تغییر اعمال شود؟ اتصال فعلی ممکن است قطع شود.",
          "Apply this change? Existing connections may disconnect.",
        ),
      )
    )
      return;
    await api("/services/" + d.id + "/action", {
      method: "POST",
      body: { action: d.kind },
    });
    closeModal();
    toast(T("انجام شد.", "Done."));
    await bootstrap();
  },
  request: (d) => {
    P.request = { id: d.id, kind: d.kind };
    modal(
      T("درخواست خدمات", "Service request"),
      `<form data-form="request">${d.kind === "transfer" ? field("request-user", T("آیدی عددی گیرنده؛ باید ربات را شروع کرده باشد", "Recipient Telegram ID; must have started the bot"), "", 'inputmode="numeric" required dir="ltr"') : ""}${d.kind === "move" ? notice(T("موقعیت دلخواه را در توضیحات بنویسید؛ مدیر مقصد و ظرفیت را بررسی می‌کند.", "Describe the desired location; an administrator will check the destination and capacity.")) : ""}<label for="request-note">${T("توضیحات", "Details")}</label><textarea id="request-note" rows="5" maxlength="1000" required></textarea><div class="actions"><button type="submit" class="btn primary">${T("ثبت درخواست", "Submit request")}</button></div></form>`,
    );
  },
  gift: () =>
    modal(
      T("کد هدیه کیف پول", "Wallet gift code"),
      `<form data-form="gift">${field("gift-code", T("کد هدیه", "Gift code"), "", 'required maxlength="48" dir="ltr"')}<div class="actions"><button type="submit" class="btn primary">${T("استفاده از هدیه", "Redeem")}</button></div></form>`,
    ),
  agent: () =>
    modal(
      T("درخواست نمایندگی", "Reseller request"),
      `<form data-form="agent"><label for="agent-note">${T("درباره فعالیت خود بنویسید", "Tell us about your reseller activity")}</label><textarea id="agent-note" rows="4" maxlength="1000" required></textarea><div class="actions"><button type="submit" class="btn primary">${T("ثبت درخواست", "Submit request")}</button></div></form>`,
    ),
  wheelConfirm: () => {
    P.spinId = crypto.randomUUID();
    modal(
      T("تأیید چرخش", "Confirm spin"),
      notice(
        T(
          "با تأیید، هزینه زیر از اعتبار شما کسر می‌شود. نتیجه تصادفی است و جایزه تضمین‌شده نیست.",
          "Confirmation deducts the stated fee. Results are random and a prize is not guaranteed.",
        ),
        "warn",
      ) +
        `<p class="price" style="margin-top:16px">${money(P.data.settings.wheel.fee)}</p><div class="actions">${button(T("تأیید و چرخش", "Confirm & spin"), "spin", "", "primary")}${button(T("انصراف", "Cancel"), "closeModal")}</div>`,
    );
  },
  spin: async () => {
    const r = await api("/wheel", {
      method: "POST",
      body: { requestId: P.spinId, expectedFee: P.data.settings.wheel.fee },
    });
    modal(
      T("نتیجه گردونه", "Wheel result"),
      `<div class="prize-ring">${icon("spark")}</div><h2 style="text-align:center">${esc(r.spin.prize)}</h2><p class="price" style="text-align:center;margin-top:10px">${money(r.spin.amount)}</p><div class="actions">${button(T("بستن", "Close"), "closeModal", "", "primary")}</div>`,
    );
  },
  raffle: async (d) => {
    await api("/raffles/" + d.id + "/enter", { method: "POST" });
    toast(T("رایگان ثبت‌نام شدید.", "You joined for free."));
    await renderPage();
  },
  logout: async () => {
    await api("/logout", { method: "POST" }).catch(() => {});
    P.token = "";
    P.authGeneration++;
    sessionStorage.removeItem("svc_session");
    P.plans = [];
    P.services = [];
    P.payments = [];
    closeModal();
    loggedOut();
  },
};
function showQuote(q) {
  P.quote = q;
  P.shortfall = q.shortfall;
  modal(
    T("پیش‌فاکتور نهایی", "Final quote"),
    `<h3>${esc(q.planTitle)}</h3><p class="hint">${num(q.quantity)} × ${num(q.volumeGB)} GB · ${num(q.days)} ${T("روز", "days")}</p><div class="divider"></div><div class="between"><span>${T("مبلغ", "Subtotal")}</span><b>${money(q.basePrice)}</b></div><div class="between"><span>${T("تخفیف", "Discount")}</span><b class="positive">${money(q.discount)}</b></div><div class="price" style="margin-top:15px">${money(q.amount)}</div><p class="hint">${T("قابل استفاده", "Available")}: ${money(q.available)} · ${T("اعتبار پیش‌فاکتور تا", "Quote valid until")}: ${date(q.expiresAt)}</p>${q.shortfall ? notice(T("کیف پول را به اندازه کسری شارژ کنید، سپس دوباره پیش‌فاکتور بگیرید.", "Top up the shortfall, then request a new quote.") + "<br>" + money(q.shortfall), "warn") : notice(T("با تأیید، این مبلغ رزرو می‌شود؛ پس از ساخت موفق کسر می‌گردد.", "Confirmation reserves the amount; it is charged only after successful provisioning."))}<div class="actions">${q.shortfall ? button(T("رفتن به کیف پول", "Open wallet"), "nav", 'data-tab="wallet"', "primary") : button(T("تأیید خرید", "Confirm purchase"), "confirmQuote", "", "primary")}${button(T("انصراف", "Cancel"), "closeModal")}</div>`,
  );
}
async function copy(value) {
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    const t = document.createElement("textarea");
    t.value = value;
    document.body.appendChild(t);
    t.select();
    document.execCommand("copy");
    t.remove();
  }
  toast(T("کپی شد.", "Copied."));
}
async function showImage(path, cls) {
  const generation = P.modalGeneration;
  const r = await fetch(portalAPI(path), {
    headers: { authorization: "Bearer " + P.token },
  });
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw new Error(j.error || "image_failed");
  }
  const blob = await r.blob();
  if (generation !== P.modalGeneration) return;
  const url = URL.createObjectURL(blob);
  P.urls.add(url);
  const box = el("asset-image");
  if (!box) return;
  box.innerHTML = `<img src="${url}" alt="${cls === "qr" ? "QR code" : T("کارت مصرف", "Usage card")}" class="${cls}"><div class="actions"><a class="btn" href="${url}" download="${cls}.svg">${T("دانلود SVG", "Download SVG")}</a>${button(T("ذخیره PNG", "Save PNG"), "savePNG", `data-url="${url}" data-name="${cls}"`)}</div>`;
}
actions.savePNG = async (d) => {
  const image = new Image();
  image.src = d.url;
  await image.decode();
  const c = document.createElement("canvas");
  c.width = image.naturalWidth || 720;
  c.height = image.naturalHeight || 400;
  c.getContext("2d").drawImage(image, 0, 0, c.width, c.height);
  const blob = await new Promise((r) => c.toBlob(r, "image/png"));
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = d.name + ".png";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
function openTelegram(url) {
  if (TG?.openTelegramLink) TG.openTelegramLink(url);
  else window.open(url, "_blank", "noopener,noreferrer");
}
function openBot(payload) {
  if (!P.data?.botUsername)
    return toast(
      T("یوزرنیم ربات تنظیم نشده است.", "Bot username is not configured."),
      true,
    );
  openTelegram(
    "https://t.me/" +
      P.data.botUsername +
      "?start=" +
      encodeURIComponent(payload),
  );
}
const forms = {
  support: async () => {
    const text = val("support-text");
    if (!text) return;
    const d = await api("/support", { method: "POST", body: { text } });
    P.support = d.support;
    const host = el("portal-view");
    if (host) host.innerHTML = supportHTML(d.support, true);
    toast(
      T(
        "پیام شما برای پشتیبانی ثبت شد.",
        "Your message was filed for the support team.",
      ),
    );
  },
  quote: async () => {
    const body = {
      kind: val("buy-kind"),
      planId: val("buy-plan"),
      serviceId: val("buy-service") || undefined,
      quantity: Number(val("buy-quantity") || 1),
      coupon: val("buy-coupon"),
      name: val("buy-name"),
    };
    if (el("buy-gb")) body.volumeGB = Number(val("buy-gb"));
    if (el("buy-days")) body.days = Number(val("buy-days"));
    showQuote((await api("/quote", { method: "POST", body })).quote);
  },
  extra: async () => {
    showQuote(
      (
        await api("/quote", {
          method: "POST",
          body: {
            kind: P.extra.kind,
            serviceId: P.extra.id,
            units: Number(val("extra-units")),
            coupon: val("extra-coupon"),
          },
        })
      ).quote,
    );
  },
  topup: async () => {
    const r = await api("/payments", {
      method: "POST",
      body: {
        amount: Number(val("topup-amount")),
        gatewayId: val("topup-gateway"),
        requestId: P.topupRequest,
      },
    });
    P.currentPayment = r.payment;
    await loadingModal(T("فاکتور پرداخت", "Payment invoice"), () =>
      paymentHTML(r.payment.id),
    );
  },
  receipt: async () => {
    const file = el("payment-receipt").files[0];
    if (!file || file.size > 10 * 1024 * 1024)
      throw new Error("invalid_receipt_file");
    const data = new FormData();
    data.set("file", file);
    await api("/payments/" + P.currentPayment.id + "/receipt", {
      method: "POST",
      body: data,
    });
    await loadingModal(
      T("رسید ثبت شد؛ در انتظار بررسی", "Receipt submitted; awaiting review"),
      () => paymentHTML(P.currentPayment.id),
    );
  },
  crypto: async () => {
    await api("/payments/" + P.currentPayment.id + "/hash", {
      method: "POST",
      body: { hash: val("crypto-hash") },
    });
    await loadingModal(T("استعلام پرداخت", "Payment verification"), () =>
      paymentHTML(P.currentPayment.id),
    );
  },
  request: async () => {
    await api("/services/" + P.request.id + "/action", {
      method: "POST",
      body: {
        action: P.request.kind,
        note: val("request-note"),
        targetUserId: val("request-user"),
      },
    });
    closeModal();
    toast(T("درخواست ثبت شد.", "Request submitted."));
    await bootstrap();
  },
  gift: async () => {
    await api("/gift", { method: "POST", body: { code: val("gift-code") } });
    closeModal();
    toast(T("اعتبار هدیه اضافه شد.", "Gift credit added."));
    await bootstrap();
  },
  agent: async () => {
    await api("/agent", { method: "POST", body: { note: val("agent-note") } });
    closeModal();
    toast(
      T("درخواست برای مدیر ثبت شد.", "Request submitted to the administrator."),
    );
  },
};
document.addEventListener("click", async (e) => {
  const target = e.target.closest("[data-action]");
  if (!target || target.disabled) return;
  const action = actions[target.dataset.action];
  if (!action) return;
  e.preventDefault();
  target.disabled = true;
  try {
    await action(target.dataset);
  } catch (err) {
    toast(errorText(err.message), true);
  } finally {
    target.disabled = false;
  }
});
document.addEventListener("submit", async (e) => {
  const form = e.target;
  if (!form.matches("[data-form]")) return;
  e.preventDefault();
  if (!form.reportValidity()) return;
  const submit = form.querySelector("[type=submit]");
  submit.disabled = true;
  try {
    await forms[form.dataset.form]();
  } catch (err) {
    toast(errorText(err.message), true);
  } finally {
    submit.disabled = false;
  }
});
document.addEventListener("change", (e) => {
  if (e.target.id === "filter-category") {
    P.filter.category = e.target.value;
    renderPage();
  }
  if (e.target.id === "filter-location") {
    P.filter.location = e.target.value;
    renderPage();
  }
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
});
document.addEventListener("visibilitychange", () => {
  document.documentElement.classList.toggle("page-hidden", document.hidden);
  if (!document.hidden && P.token) bootstrap().catch(() => {});
});
setInterval(async () => {
  if (
    document.hidden ||
    !P.token ||
    !P.data?.gate.ok ||
    !el("portal-modal").hidden ||
    !["services", "wallet", "support"].includes(P.tab)
  )
    return;
  if (P.tab === "support") {
    try {
      const d = await api("/support");
      if (
        JSON.stringify(d.support.messages) !==
        JSON.stringify(P.support?.messages || [])
      ) {
        P.support = d.support;
        const host = el("portal-view");
        if (host) host.innerHTML = supportHTML(d.support, d.enabled !== false);
      }
    } catch {}
    return;
  }
  try {
    const data = await api("/operations");
    if (
      JSON.stringify(data.rows.map((o) => [o.id, o.status])) !==
      JSON.stringify(P.operations.map((o) => [o.id, o.status]))
    ) {
      P.operations = data.rows;
      await bootstrap();
    }
  } catch {}
}, 12000);
(async () => {
  try {
    TG?.ready();
    TG?.expand();
  } catch {}
  const fragment = new URLSearchParams(location.hash.slice(1));
  const initData = TG?.initData || fragment.get("tgWebAppData") || "",
    ticket = fragment.get("ticket") || "";
  try {
    const freshInit =
      initData &&
      Date.now() / 1000 -
        Number(new URLSearchParams(initData).get("auth_date")) <
        300;
    if (ticket || freshInit || !P.token) {
      if (!initData && !ticket) return loggedOut();
      const d = await api("/login", {
        method: "POST",
        body: initData ? { initData } : { ticket },
      });
      P.token = d.token;
      sessionStorage.setItem("svc_session", P.token);
      history.replaceState(null, "", location.pathname);
    }
    await bootstrap();
  } catch (e) {
    P.token = "";
    sessionStorage.removeItem("svc_session");
    loggedOut(errorText(e.message));
  }
})();

actions.combined = async () =>
  loadingModal(T("لینک تجمیعی", "Combined subscription"), async () => {
    const d = await api("/combined-subscription", { method: "POST", body: {} });
    P.combinedURL = d.url;
    return (
      notice(
        T(
          "این لینک کانفیگ‌های URI فعال شما را یکجا ارائه می‌کند؛ پروفایل WireGuard جدا دریافت می‌شود.",
          "This link combines your active URI-based configurations. Download WireGuard profiles separately.",
        ),
      ) +
      '<div class="codebox">' +
      esc(d.url) +
      '</div><div class="actions">' +
      button(T("کپی لینک", "Copy link"), "copyCombined") +
      button(
        T("تعویض لینک تجمیعی", "Rotate combined link"),
        "rotateCombined",
        "",
        "danger",
      ) +
      "</div>"
    );
  });
actions.copyCombined = () => copy(P.combinedURL);
actions.rotateCombined = async () => {
  if (
    !confirm(
      T(
        "لینک تجمیعی قبلی باطل شود؟ این کار کلیدهای واقعی سرویس‌ها را عوض نمی‌کند.",
        "Invalidate the previous combined link? This does not rotate the underlying service credentials.",
      ),
    )
  )
    return;
  await api("/combined-subscription", {
    method: "POST",
    body: { rotate: true },
  });
  await actions.combined();
};

function portalDiceCard() {
  const d = P.data?.settings.dice;
  if (!d?.enabled) return "";
  return (
    '<div class="section-head"><h2>' +
    T("تاس رایگان تلگرام", "Free Telegram dice") +
    '</h2></div><section class="card"><div class="prize-ring">' +
    d.emoji +
    '</div><p class="small">' +
    T("اعتبار جایزه: ", "Prize credit: ") +
    money(d.prize) +
    '</p><p class="hint">' +
    T(
      "هر " +
        d.intervalHours +
        " ساعت یک نوبت. نتیجه فقط از تلگرام دریافت می‌شود.",
      "One attempt every " +
        d.intervalHours +
        " hours. Results come from Telegram.",
    ) +
    '</p><div class="actions">' +
    button(
      T("دریافت نتیجه در ربات", "Roll in Telegram"),
      "playDice",
      "",
      "primary",
    ) +
    "</div></section>"
  );
}
actions.playDice = async () => {
  const d = await api("/dice", {
    method: "POST",
    body: { requestId: crypto.randomUUID() },
  });
  if (d.game.status === "done")
    toast(
      d.game.won
        ? T(
            "برنده شدید؛ اعتبار به کیف پول اضافه شد.",
            "You won; wallet credited.",
          )
        : T("این نوبت برنده نشدید.", "No prize this time."),
    );
  else
    toast(
      T(
        "نتیجه تأیید نشد؛ ربات را شروع کنید و وضعیت را بررسی کنید.",
        "Result unconfirmed. Start the bot and check its status.",
      ),
      true,
    );
};
