import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { bootPanel } from "./panel-dom.mjs";

let panel;
afterEach(() => {
  panel?.close();
  panel = null;
});

function openSelect(extraHtml = "") {
  panel = bootPanel();
  const { doc, inject } = panel;
  inject(`
    openModal('<form id="v-form">' + vSelect('sv-provider', 'Provider', [['stock','Stock'],['marzban','Marzban'],['3xui','3x-ui']], 'stock') + '</form>');
  `);
  if (extraHtml) inject(extraHtml);
  const box = doc.querySelector(".bp-dd");
  return {
    box,
    input: doc.getElementById("sv-provider"),
    label: box.querySelector(".dd-label"),
    toggle: box.querySelector('[data-act="ddToggle"]'),
    ddPanel: doc.getElementById("dd-panel"),
  };
}

test("choosing an option updates the value, the label and the tick", () => {
  const { input, label, toggle, ddPanel, box } = openSelect();
  const { win, tap } = panel;
  let changes = 0;
  input.addEventListener("change", () => changes++);

  tap(toggle);
  assert.equal(ddPanel.classList.contains("hidden"), false, "the list should open");
  assert.equal(ddPanel.querySelectorAll(".dd-opt").length, 3);

  const marzban = [...ddPanel.querySelectorAll(".dd-opt")].find(
    (o) => o.dataset.v === "marzban",
  );
  marzban.dispatchEvent(new win.MouseEvent("click", { bubbles: true }));

  assert.equal(input.value, "marzban");
  assert.equal(label.textContent, "Marzban", "the closed control must show the pick");
  assert.equal(changes, 1, "a change event must fire so forms can react");
  assert.equal(ddPanel.classList.contains("hidden"), true, "the list closes after a pick");

  const src = [...box.querySelectorAll(".dd-src .dd-opt")];
  assert.deepEqual(
    src.filter((o) => o.classList.contains("sel")).map((o) => o.dataset.v),
    ["marzban"],
    "the tick must move to the chosen option",
  );

  // Re-opening shows the tick on the current value.
  tap(toggle);
  assert.equal(
    ddPanel.querySelector(".dd-opt.sel").dataset.v,
    "marzban",
  );
});

test("a touch pick survives the retargeted click that follows it", () => {
  const { input, label, toggle, ddPanel, box } = openSelect();
  const { win, doc } = panel;

  toggle.dispatchEvent(new win.MouseEvent("click", { bubbles: true }));
  const option = [...ddPanel.querySelectorAll(".dd-opt")].find(
    (o) => o.dataset.v === "3xui",
  );
  // A tap is a pointerdown followed by a pointerup on the same option; the pick
  // commits on pointerup so the list keeps native touch scrolling.
  option.dispatchEvent(new win.Event("pointerdown", { bubbles: true }));
  option.dispatchEvent(new win.Event("pointerup", { bubbles: true }));
  assert.equal(input.value, "3xui");
  assert.equal(label.textContent, "3x-ui");

  const backdrop = doc.querySelector('#modal-wrap [data-act="modalClose"]');
  backdrop.dispatchEvent(new win.MouseEvent("click", { bubbles: true }));
  assert.equal(
    doc.getElementById("modal-wrap").classList.contains("hidden"),
    false,
    "the ghost click must not close the dialog",
  );
  assert.equal(box.isConnected, true);

  // A deliberate later click on the backdrop still closes the dialog.
  backdrop.dispatchEvent(new win.MouseEvent("click", { bubbles: true }));
  assert.equal(doc.getElementById("modal-wrap").classList.contains("hidden"), true);
});

test("dragging the open list (scroll gesture) does not pick an option", () => {
  const { input, toggle, ddPanel } = openSelect();
  const { win } = panel;

  toggle.dispatchEvent(new win.MouseEvent("click", { bubbles: true }));
  const option = [...ddPanel.querySelectorAll(".dd-opt")].find(
    (o) => o.dataset.v === "marzban",
  );
  const pe = (type, x, y) =>
    Object.assign(new win.Event(type, { bubbles: true }), {
      pointerId: 1,
      clientX: x,
      clientY: y,
    });
  // The finger moves far more than the 12px threshold: a scroll, not a tap.
  option.dispatchEvent(pe("pointerdown", 0, 0));
  option.dispatchEvent(pe("pointermove", 0, -40));
  option.dispatchEvent(pe("pointerup", 0, -40));
  assert.equal(input.value, "stock", "a scroll gesture must not select");
  assert.equal(
    ddPanel.classList.contains("hidden"),
    false,
    "the list stays open after scrolling",
  );

  // A small (≤12px) drift is still a tap and selects.
  option.dispatchEvent(pe("pointerdown", 0, 0));
  option.dispatchEvent(pe("pointermove", 3, -8));
  option.dispatchEvent(pe("pointerup", 3, -8));
  assert.equal(input.value, "marzban", "a tap with ≤12px drift selects");
});

test("dropdowns outside dialogs (service tabs) select too, and repainting a single box works", () => {
  panel = bootPanel();
  const { doc, win, inject, tap } = panel;
  inject(`
    document.body.insertAdjacentHTML('beforeend', '<div id="test-host"></div>');
    document.getElementById('test-host').innerHTML =
      '<div class="card">' + vSelect('sv-dice-kind', 'Game', [['dice','Dice'],['slot','Slot']], 'dice') + '</div>';
    paintDropdowns();
  `);
  const box = doc.querySelector(".bp-dd");
  const input = doc.getElementById("sv-dice-kind");
  tap(box.querySelector('[data-act="ddToggle"]'));
  const slot = [...doc.getElementById("dd-panel").querySelectorAll(".dd-opt")].find(
    (o) => o.dataset.v === "slot",
  );
  slot.dispatchEvent(new win.MouseEvent("click", { bubbles: true }));
  assert.equal(input.value, "slot");
  assert.equal(box.querySelector(".dd-label").textContent, "Slot");

  // Values set programmatically are shown once the box itself is repainted.
  input.value = "dice";
  inject(`paintDropdowns(document.querySelector('.bp-dd'));`);
  assert.equal(box.querySelector(".dd-label").textContent, "Dice");
});

test("panel sections open and close as accordions and remember their state", () => {
  panel = bootPanel();
  const { doc, inject, tap, win } = panel;
  inject(`
    document.body.insertAdjacentHTML('beforeend', '<div id="test-host"></div>');
    document.getElementById('test-host').innerHTML =
      vSection('Providers', '<p id="sec-content">body</p>', '', { group: 'sv', id: 'panels', open: false });
  `);
  const section = doc.querySelector("section.bp-sec");
  const head = section.querySelector('[data-act="accToggle"]');
  assert.equal(section.classList.contains("open"), false);

  tap(head);
  assert.equal(section.classList.contains("open"), true, "the arrow must expand the section");
  assert.equal(head.getAttribute("aria-expanded"), "true");
  assert.equal(win.localStorage.getItem("bp_acc_sv").includes("panels"), true);

  tap(head);
  assert.equal(section.classList.contains("open"), false, "clicking again collapses it");
});

test("section action buttons render inside the accordion body, not the header", () => {
  panel = bootPanel();
  const { doc, inject } = panel;
  inject(`
    document.body.insertAdjacentHTML('beforeend', '<div id="test-host"></div>');
    document.getElementById('test-host').innerHTML =
      vSection('Providers', '<p id="sec-content">body</p>', vButton('ذخیره', 'vSaveMotion', '', true), { group: 'v', id: 'panels', open: true });
  `);
  const section = doc.querySelector("section.bp-sec");
  const head = section.querySelector("div.flex.items-center");
  const body = section.querySelector(".bp-sec-inner");
  assert.equal(head.querySelector("[data-act='vSaveMotion']"), null, "the header must stay a plain toggle");
  const btn = body.querySelector("[data-act='vSaveMotion']");
  assert.notEqual(btn, null, "action buttons live in the body");
  assert.ok(
    btn.closest(".sec-actions"),
    "buttons sit in a dedicated action row",
  );
  assert.ok(
    btn.className.includes("bg-brand-500"),
    "a primary (blue) button class is applied",
  );
});

test("the save-bar appears on routes with saveable sections and saves them all", async () => {
  panel = bootPanel();
  const { doc, win, inject, tap } = panel;
  inject(`render();`);
  await new Promise((r) => setTimeout(r, 10));
  const bar = doc.getElementById("save-bar");
  assert.notEqual(bar, null, "the save-bar element exists");

  inject(`renderSettings(); updateSaveBar();`);
  const label = doc.getElementById("save-bar-btn-label");
  assert.equal(bar.classList.contains("hidden"), false, "visible on the settings route");
  assert.equal(label.textContent, "ذخیره همه تغییرات");
  assert.equal(
    doc.querySelectorAll('#view [data-act="saveGeneral"], #view [data-act="saveChannel"], #view [data-act="saveTuning"]').length >= 3,
    true,
    "settings route exposes its section save buttons",
  );

  // An edit inside the view marks the bar as dirty.
  doc.getElementById("st-sb-fa").dispatchEvent(new win.Event("input", { bubbles: true }));
  assert.equal(
    doc.getElementById("save-bar-msg").textContent,
    "تغییرات ذخیره‌نشده دارید",
  );

  // Save-all runs every section action and reports success.
  let puts = 0;
  inject(`
    window.__savedActions = [];
    ACTIONS.saveGeneral = async () => { window.__savedActions.push('saveGeneral'); };
    ACTIONS.saveChannel = async () => { window.__savedActions.push('saveChannel'); };
    ACTIONS.saveTuning = async () => { window.__savedActions.push('saveTuning'); };
  `);
  tap(doc.getElementById("save-bar-btn"), { pointer: false });
  await new Promise((r) => setTimeout(r, 20));
  const saved = Array.from(win.__savedActions || []);
  assert.deepEqual(saved, ["saveGeneral", "saveChannel", "saveTuning"]);
  assert.equal(
    doc.getElementById("save-bar-msg").textContent,
    "تمامی تغییرات ذخیره شدند",
  );
});

test("the save-bar stays hidden when the route has no save buttons", async () => {
  panel = bootPanel();
  const { doc, inject } = panel;
  inject(`render();`);
  await new Promise((r) => setTimeout(r, 10));
  const bar = doc.getElementById("save-bar");
  // Dashboard route has no data-act save buttons in #view.
  assert.equal(bar.classList.contains("hidden"), true);
});

test("data-pf shows only the fields relevant to the chosen panel type", () => {
  panel = bootPanel();
  const { doc, inject } = panel;
  inject(`
    document.body.insertAdjacentHTML('beforeend', '<div id="pf-host"></div>');
    const host = document.getElementById('pf-host');
    host.innerHTML =
      '<div data-pf="pf-url" id="f-url"></div>' +
      '<div data-pf="pf-login" id="f-login"></div>' +
      '<div data-pf="pf-token" id="f-token"></div>' +
      '<div data-pf="pf-inbound" id="f-inbound"></div>' +
      '<div data-pf="pf-shelf" id="f-shelf"></div>' +
      '<div data-pf="pf-profile" id="f-profile"></div>';
    svApplyPf(host, 'stock');
  `);
  const vis = (id) => !doc.getElementById(id).classList.contains("hidden");
  assert.equal(vis("f-shelf"), true, "stock shows the shelf picker");
  assert.equal(vis("f-url"), false, "stock hides the panel URL");
  assert.equal(vis("f-login"), false);
  assert.equal(vis("f-token"), false);

  inject(`svApplyPf(document.getElementById('pf-host'), 'sui');`);
  assert.equal(vis("f-url"), true, "S-UI shows the URL");
  assert.equal(vis("f-token"), true, "S-UI uses an API token");
  assert.equal(vis("f-login"), false, "S-UI has no username/password");
  assert.equal(vis("f-inbound"), false);
  assert.equal(vis("f-shelf"), false);
  assert.equal(vis("f-profile"), false);

  inject(`svApplyPf(document.getElementById('pf-host'), 'xui');`);
  assert.equal(vis("f-login"), true, "x-ui logs in with username/password");
  assert.equal(vis("f-inbound"), true, "x-ui needs the inbound id");
  assert.equal(vis("f-token"), false);

  inject(`svApplyPf(document.getElementById('pf-host'), 'wgdashboard');`);
  assert.equal(vis("f-token"), true);
  assert.equal(vis("f-inbound"), false);
  assert.equal(vis("f-profile"), false);
});

test("data-pf filters gateway fields by gateway type", () => {
  panel = bootPanel();
  const { doc, inject } = panel;
  inject(`
    document.body.insertAdjacentHTML('beforeend', '<div id="gw-host"></div>');
    const host = document.getElementById('gw-host');
    host.innerHTML =
      '<div data-pf="gw-merchant" id="g-merchant"></div>' +
      '<div data-pf="gw-apikey" id="g-api"></div>' +
      '<div data-pf="gw-ipn" id="g-ipn"></div>' +
      '<div data-pf="gw-card" id="g-card"></div>' +
      '<div data-pf="gw-sandbox" id="g-sandbox"></div>' +
      '<div data-pf="gw-address" id="g-address"></div>' +
      '<div data-pf="gw-confirm" id="g-confirm"></div>' +
      '<div data-pf="gw-crypto-block" id="g-block"></div>';
    svApplyPf(host, 'manual');
  `);
  const vis = (id) => !doc.getElementById(id).classList.contains("hidden");
  assert.equal(vis("g-card"), true, "bank transfer shows card fields");
  assert.equal(vis("g-merchant"), false);
  assert.equal(vis("g-api"), false);

  inject(`svApplyPf(document.getElementById('gw-host'), 'zarinpal');`);
  assert.equal(vis("g-merchant"), true);
  assert.equal(vis("g-sandbox"), true);
  assert.equal(vis("g-card"), false);

  inject(`svApplyPf(document.getElementById('gw-host'), 'nowpayments');`);
  assert.equal(vis("g-api"), true);
  assert.equal(vis("g-ipn"), true);
  assert.equal(vis("g-merchant"), false);

  inject(`svApplyPf(document.getElementById('gw-host'), 'crypto');`);
  assert.equal(vis("g-block"), true);
  assert.equal(vis("g-address"), true);
  assert.equal(vis("g-confirm"), true);
  assert.equal(vis("g-api"), false);

  inject(`svApplyPf(document.getElementById('gw-host'), 'stars');`);
  for (const id of ["g-merchant", "g-api", "g-ipn", "g-card", "g-address", "g-block"])
    assert.equal(vis(id), false, "stars needs no credentials: " + id);
});

test("bot purpose cards can switch repeatedly away from VPN", async () => {
  const { PURPOSES, V2_DEFAULTS } = await import('../src/config.js');
  panel = bootPanel();
  const { inject, doc, tap, win } = panel;
  win.structuredClone = structuredClone;
  inject(`V2.settings = ${JSON.stringify({ ...V2_DEFAULTS, purposes: PURPOSES, botPurpose: 'vpn', integrations: {}  })};
    document.body.insertAdjacentHTML('beforeend', '<div id="v-profile-settings"></div><div id="v-extra-settings"></div>');
    paintV2Settings(); ACTIONS.vSavePurpose = async () => { V2.settings.botPurpose = V2.purposeDraft; };`);
  for (const key of ['shop', 'support', 'custom', 'vpn', 'channel']) {
    tap(doc.querySelector(`[data-act="vChoosePurpose"][data-id="${key}"] strong`));
    assert.equal(doc.querySelector('.v-profile.selected').dataset.id, key);
    inject('window.draft = V2.purposeDraft');
    assert.equal(win.draft, key);
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.ok(doc.querySelector('#v-purpose-preview').textContent.includes(PURPOSES[key].fa));
  }
  inject('ACTIONS.vSavePurpose = async () => {};'); // cancelled confirmation
  tap(doc.querySelector('[data-act="vChoosePurpose"][data-id="shop"]'));
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(doc.querySelector('.v-profile.selected').dataset.id, 'channel');
});

/* ---------- Rates: source status instead of a bare «connection failed» ---------- */
const ratesPayload = {
  source: 'coingecko+gold-api+rate-json+derived',
  stale: false,
  derived: 4,
  updatedAt: Date.now(),
  labels: { tgju: { fa: 'TGJU — طلا، سکه و ارز', en: 'TGJU — gold, coins & FX' }, coingecko: { fa: 'کوین‌گکو', en: 'CoinGecko' } },
  diagnostics: [
    { name: 'tgju', ok: false, hits: 0, ms: 120, error: 'provider_network_error' },
    { name: 'coingecko', ok: true, hits: 7, ms: 84 },
    { name: 'nobitex', ok: true, hits: 3, ms: 320, via: 'jina' },
  ],
  gold: { gold18: { fa: 'طلای ۱۸ عیار', en: '18K Gold', unit: 'گرم', price: 23884373, change: 1.39 } },
  fiat: { usd: { fa: 'دلار آمریکا', en: 'US Dollar', price: 233200, change: 0.65 } },
  crypto: { usdt: { fa: 'تتر (USDT)', en: 'Tether', priceToman: 233200, priceUsd: 1, change: 0.2 } },
};

test('the live rates block names every source and flags calculated rows', () => {
  panel = bootPanel();
  const { doc, inject } = panel;
  inject(`document.body.innerHTML = vRatesLiveHtml(${JSON.stringify(ratesPayload)});`);
  const text = doc.body.textContent;
  assert(text.includes('نرخ زنده بازار ایران'), 'the live badge stays');
  assert(text.includes('محاسبه شده است'), 'calculated rows are explained');
  assert(text.includes('TGJU — طلا، سکه و ارز'), 'the source label is shown');
  assert(text.includes('از طریق رله'), 'a relayed feed says which transport delivered it');
  assert(text.includes('provider_network_error'), 'the failure reason is visible');
  assert.equal(text.includes('اتصال ناموفق'), false, 'a working table must not claim the market is unreachable');
  // The status list is collapsed by default so the table stays readable.
  const details = doc.querySelector('#v-rates-live details, details.v-media-details');
  assert(details, 'source status is rendered as a details block');
  assert.equal(details.open, false);
});

test('a blocked market shows which sources failed, not just a generic warning', () => {
  panel = bootPanel();
  const { doc, inject } = panel;
  const offline = {
    source: 'fallback', stale: true, derived: 0, updatedAt: Date.now(), labels: ratesPayload.labels,
    diagnostics: [{ name: 'tgju', ok: false, hits: 0, ms: 90, error: 'provider_network_error' }],
    gold: ratesPayload.gold, fiat: ratesPayload.fiat, crypto: ratesPayload.crypto,
  };
  inject(`document.body.innerHTML = vRatesLiveHtml(${JSON.stringify(offline)});`);
  const text = doc.body.textContent;
  assert(text.includes('اتصال ناموفق'), 'the saved-rate warning is kept for a real blackout');
  assert(text.includes('tgju: provider_network_error'), 'the failing feed is named next to the warning');
});

test('the settings section offers a forced source check wired to its handler', () => {
  panel = bootPanel();
  const { doc, inject } = panel;
  inject(`document.body.innerHTML = vRatesSettingsSection({ rates: { autoSend: { enabled: false, category: 'all', time: '09:00', destinations: [] } } });`);
  const button = doc.querySelector('[data-act="vRatesSources"]');
  assert(button, 'the «بررسی منابع نرخ» button exists');
  inject('window.__sourcesAction = typeof ACTIONS.vRatesSources === "function";');
  assert.equal(panel.win.__sourcesAction, true, 'its action is registered');
  assert(doc.getElementById('v-rates-sources'), 'its result container exists');
});

test("modern provider and gateway fields only show relevant credentials and options", () => {
  panel = bootPanel();
  const { doc, inject } = panel;
  const groups = ["pf-token", "pf-login", "pf-squads", "pf-rebecca", "pf-cf", "gw-apikey", "gw-ipn", "gw-wage", "gw-fee", "gw-address"];
  inject(`document.body.insertAdjacentHTML('beforeend', '<div id="modern-fields">' + ${JSON.stringify(groups)}.map(g => '<div id="m-' + g + '" data-pf="' + g + '"></div>').join('') + '</div>');`);
  const check = (type, visible) => {
    inject(`svApplyPf('modern-fields', ${JSON.stringify(type)});`);
    for (const group of groups)
      assert.equal(!doc.getElementById("m-" + group).classList.contains("hidden"), visible.includes(group), type + ": " + group);
  };
  check("remnawave", ["pf-token", "pf-squads", "pf-cf"]);
  check("rebecca", ["pf-token", "pf-rebecca", "pf-cf"]);
  check("tronado", ["gw-apikey", "gw-ipn", "gw-wage", "gw-address"]);
  check("cubepay", ["gw-apikey", "gw-fee"]);
  check("tonpay", ["gw-apikey"]);
  check("blupal", ["gw-apikey"]);
});
