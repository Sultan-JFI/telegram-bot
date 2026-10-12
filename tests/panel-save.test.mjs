import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { bootPanel } from "./panel-dom.mjs";

let panel;
afterEach(() => {
  panel?.close();
  panel = null;
});

const tick = (ms = 30) => new Promise((r) => setTimeout(r, ms));

const SETTINGS = {
  hasToken: true, tokenMasked: "••••••••TEST", source: "env", defaultLang: "fa",
  botLangMode: "both", supportButton: { enabled: true, fa: "پشتیبانی", en: "Support" },
  broadcast: { batchSize: 25, delayMs: 40 }, requiredChannel: { enabled: false, chatId: "", url: "" },
  botPurpose: "custom", customModules: ["menu"], modules: ["menu"],
  purposes: {
    custom: { fa: "پیش‌فرض / سفارشی", en: "Custom workspace", icon: "sliders-horizontal", modules: ["menu"] },
    vpn: { fa: "فروش سرویس VPN", en: "VPN services", icon: "network", modules: ["services"] },
  },
  botUsername: "demo_bot", requiredChats: { enabled: false, targets: [] },
  uploads: { chatId: "", watermark: { enabled: false, text: "", logo: "", opacity: 0.65 } },
  shop: { cardNumber: "", cardHolder: "", notifyChatId: "", payment: "manual", requireAddress: false, deliverySlots: [], reservationMinutes: 30, currency: "IRT", protectContent: true },
  relay: { enabled: false, approval: true, destinations: [], echoToUser: false },
  loyalty: { enabled: true, referralPoints: 10, signupPoints: 0, purchaseUnit: 100000, pointValue: 100, maxDiscountPercent: 20 },
  integrations: { zarinpal: false, sandbox: false, mediaProcessor: false, durableStorage: false, publicBaseUrl: "" },
};

function injectSettingsFetch({ inject }) {
  inject(`
    if (!window.structuredClone) window.structuredClone = (o) => JSON.parse(JSON.stringify(o));
    window.fetch = async (url, opts) => {
      const u = String(url);
      const ok = (o) => ({ ok: true, status: 200, json: async () => o });
      if (u.includes('/api/settings')) return ok({ ok: true, data: { settings: ${JSON.stringify(SETTINGS)} } });
      if (u.includes('/api/dashboard/stats')) return ok({ ok: true, data: { stats: {}, recentUsers: [], webhook: { configured: false } } });
      if (u.includes('/api/studio/summary')) return ok({ ok: true, data: { counts: {} } });
      if (u.includes('/api/creator/state')) return ok({ ok: true, data: { repo: '', unread: 0, thread: [], update: null, notice: null, dismiss: {}, link: null } });
      if (u.includes('/api/creator/read') || u.includes('/api/creator/support') || u.includes('/api/creator/dismiss')) return ok({ ok: true, data: { unread: 0 } });
      if (u.includes('/api/support/tickets/unread')) return ok({ ok: true, data: { count: 0 } });
      return ok({ ok: true, data: {} });
    };
  `);
}

test("save-all shows a single message and suppresses per-section success toasts", async () => {
  panel = bootPanel();
  const { doc, win, inject, tap } = panel;
  injectSettingsFetch(panel);
  inject(`render();`);
  await tick();
  inject(`
    document.getElementById('view').innerHTML =
      '<button data-act="saveGeneral">a</button>' +
      '<button data-act="saveChannel">b</button>' +
      '<button data-act="saveTuning">c</button>';
    document.getElementById('toasts').innerHTML = '';
    window.__ran = [];
    ACTIONS.saveGeneral = async () => { window.__ran.push('saveGeneral'); toast('ذخیره شد', 'success'); };
    ACTIONS.saveChannel = async () => { window.__ran.push('saveChannel'); toast('ذخیره شد', 'success'); };
    ACTIONS.saveTuning = async () => { window.__ran.push('saveTuning'); toast('ذخیره شد', 'success'); };
    updateSaveBar();
  `);
  assert.equal(doc.getElementById("save-bar").classList.contains("hidden"), false);
  // The status text and the "save all changes" button share one box: the message
  // is reported next to the button, not as a floating toast over it.
  const box = doc.getElementById("save-bar-box");
  assert.equal(box.contains(doc.getElementById("save-bar-msg")), true);
  assert.equal(box.contains(doc.getElementById("save-bar-btn")), true);
  assert.equal(doc.getElementById("save-bar-msg").getAttribute("aria-live"), "polite");
  tap(doc.getElementById("save-bar-btn"), { pointer: false });
  await tick(40);
  assert.deepEqual(Array.from(win.__ran || []), ["saveGeneral", "saveChannel", "saveTuning"]);
  assert.equal(doc.querySelectorAll("#toasts > div").length, 0, "no per-section toasts during save-all");
  assert.equal(doc.getElementById("save-bar-msg").textContent, "تمامی تغییرات ذخیره شدند");
});

test("a single-section save reports green “saved” inside the bar instead of a toast", async () => {
  panel = bootPanel();
  const { doc, win, inject, tap } = panel;
  injectSettingsFetch(panel);
  inject(`render();`);
  await tick();
  inject(`
    document.getElementById('view').innerHTML = '<button data-act="saveGeneral">a</button>';
    document.getElementById('toasts').innerHTML = '';
    ACTIONS.saveGeneral = async () => { toast('ذخیره شد', 'success'); };
    updateSaveBar();
  `);
  const btn = doc.querySelector('[data-act="saveGeneral"]');
  tap(btn);
  await tick(40);
  const msg = doc.getElementById("save-bar-msg");
  assert.equal(msg.textContent, "ذخیره شد", "the bar itself reports the saved state");
  assert.match(msg.className, /text-emerald-600/, "the saved message is green");
  assert.equal(doc.getElementById("save-bar").classList.contains("bp-ok"), true, "the bar turns green");
  assert.equal(doc.querySelectorAll("#toasts > div").length, 0, "no duplicate floating toast for a save");
  assert.equal(btn.disabled, false, "the button releases after the async action");
  assert.equal(win.document.body.classList.contains("bp-savebar-open"), true, "the bar reserves layout space");
  // A later edit flips the bar back to the unsaved hint.
  inject(`
    const editable = document.createElement('input');
    document.getElementById('view').appendChild(editable);
    editable.dispatchEvent(new Event('input', { bubbles: true }));
  `);
  await tick(30);
  assert.equal(msg.textContent, "تغییرات ذخیره‌نشده دارید", "editing marks the bar dirty again");
});

test("a failed save paints the bar message red and still toasts the reason", async () => {
  panel = bootPanel();
  const { doc, inject, tap } = panel;
  injectSettingsFetch(panel);
  inject(`render();`);
  await tick();
  inject(`
    document.getElementById('view').innerHTML = '<button data-act="saveGeneral">a</button>';
    document.getElementById('toasts').innerHTML = '';
    ACTIONS.saveGeneral = async () => { throw new Error('token_invalid'); };
    updateSaveBar();
  `);
  tap(doc.querySelector('[data-act="saveGeneral"]'));
  await tick(40);
  const msg = doc.getElementById("save-bar-msg");
  assert.equal(msg.textContent, "token_invalid", "the failure reason is shown in the bar");
  assert.match(msg.className, /text-rose-600/, "the failure message is red");
  assert.equal(doc.getElementById("save-bar").classList.contains("bp-err"), true, "the bar turns red");
  assert.equal(doc.querySelectorAll("#toasts > div").length, 1, "the failure is also toasted");
});

test("save-all reports green “all changes saved” and red when a section fails", async () => {
  panel = bootPanel();
  const { doc, win, inject, tap } = panel;
  injectSettingsFetch(panel);
  inject(`render();`);
  await tick();
  inject(`
    document.getElementById('view').innerHTML =
      '<button data-act="saveGeneral">a</button><button data-act="saveTuning">c</button>';
    ACTIONS.saveGeneral = async () => {};
    ACTIONS.saveTuning = async () => {};
    updateSaveBar();
  `);
  tap(doc.getElementById("save-bar-btn"), { pointer: false });
  await tick(40);
  const msg = doc.getElementById("save-bar-msg");
  assert.equal(msg.textContent, "تمامی تغییرات ذخیره شدند");
  assert.match(msg.className, /text-emerald-600/, "the all-saved message is green");
  assert.equal(doc.getElementById("save-bar").classList.contains("bp-ok"), true);

  inject(`
    ACTIONS.saveTuning = async () => { throw new Error('invalid_body'); };
    window.confirm = () => true;
  `);
  tap(doc.getElementById("save-bar-btn"), { pointer: false });
  await tick(40);
  assert.equal(msg.textContent, "درخواست به‌درستی به سرور نرسید؛ صفحه را تازه کنید و دوباره ذخیره را بزنید.");
  assert.match(msg.className, /text-rose-600/, "a failed save-all is red");
  assert.equal(doc.getElementById("save-bar").classList.contains("bp-err"), true);
  assert.equal(win.document.getElementById("save-bar").classList.contains("bp-ok"), false);
});

test("a double tap on an async action runs it once; sync actions release immediately", async () => {
  panel = bootPanel();
  const { doc, win, inject } = panel;
  injectSettingsFetch(panel);
  inject(`render();`);
  await tick();
  inject(`
    document.body.insertAdjacentHTML('beforeend', '<button id="dbt" data-act="dbtAction">go</button>');
    window.__dbt = 0;
    ACTIONS.dbtAction = async () => { window.__dbt++; await new Promise((r) => setTimeout(r, 30)); };
  `);
  const btn = doc.getElementById("dbt");
  btn.dispatchEvent(new win.MouseEvent("click", { bubbles: true }));
  btn.dispatchEvent(new win.MouseEvent("click", { bubbles: true }));
  await tick(70);
  assert.equal(win.__dbt, 1, "the second tap is blocked by the busy lock");

  inject(`
    window.__dbtSync = 0;
    ACTIONS.dbtSync = () => { window.__dbtSync++; };
    document.getElementById('dbt').setAttribute('data-act', 'dbtSync');
  `);
  btn.dispatchEvent(new win.MouseEvent("click", { bubbles: true }));
  btn.dispatchEvent(new win.MouseEvent("click", { bubbles: true }));
  assert.equal(win.__dbtSync, 2, "sync actions are released immediately and run on each tap");
  assert.equal(btn.disabled, false);
});

test("identical back-to-back toasts collapse into one within a short window", () => {
  panel = bootPanel();
  const { doc, inject } = panel;
  inject(`document.getElementById('toasts').innerHTML = ''; toast('تکراری', 'success'); toast('تکراری', 'success');`);
  assert.equal(doc.querySelectorAll("#toasts > div").length, 1, "duplicate toast suppressed");
  inject(`toast('متفاوت', 'info');`);
  assert.equal(doc.querySelectorAll("#toasts > div").length, 2, "a different toast still shows");
});

test("the bot-type chooser is an accordion, open by default, with the apply button in its body", async () => {
  panel = bootPanel();
  const { doc, win, inject, tap } = panel;
  injectSettingsFetch(panel);
  win.location.hash = "#/settings";
  inject(`render();`);
  await tick(60);
  const sec = doc.querySelector('section[data-acc="v:purpose"]');
  assert.notEqual(sec, null, "bot-type section is an accordion");
  assert.equal(sec.classList.contains("open"), true, "open by default");
  assert.notEqual(sec.querySelector('[data-act="accToggle"]'), null, "header has an expand/collapse toggle");
  const apply = sec.querySelector('[data-act="vSavePurpose"]');
  assert.notEqual(apply, null, "apply-bot-type button exists");
  assert.ok(apply.closest(".sec-actions"), "the apply button lives inside the accordion body");
  assert.equal(sec.querySelector(':scope > div > [data-act="vSavePurpose"]'), null, "the header row holds no action button");
  tap(sec.querySelector('[data-act="accToggle"]'));
  assert.equal(sec.classList.contains("open"), false, "the section collapses");
  assert.ok(win.localStorage.getItem("bp_acc_v").includes("purpose"), "the open/closed state is remembered");
});
