import test, { beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { setup, telegramMock } from './helpers.mjs';
import { putJson, getJson, getMenu, getSettings, saveSettings } from '../src/kv.js';
import { WORLD_NEWS_SOURCES, fetchLiveNews, translateToFa } from '../src/news.js';
import { ratesTick, RATES_CATEGORIES } from '../src/rates.js';

let h, tg;
const originalFetch = globalThis.fetch;
const KB = (c) => (c.payload.reply_markup?.inline_keyboard || []).flat().map(b => b.callback_data || b.web_app || b.url || b.text);
// A screen can arrive either as a new message or — by design — as an in-place
// edit of the open one, so both count as "delivered to the chat".
const SENT_TO = (chatId) => tg.delivered().filter(c => String(c.payload.chat_id) === String(chatId));

beforeEach(async () => {
  tg = telegramMock();
  globalThis.fetch = tg.fetcher;
  h = await setup();
});
afterEach(() => { globalThis.fetch = originalFetch; });

/* ---------- News purpose: start → خبر → Iran/World → categories ---------- */
test('news-purpose bot: start shows one «خبر» button; home offers Iran and World', async () => {
  await h.settings({ botPurpose: 'news' });
  await h.msg(201, '/start');
  const start = SENT_TO(201).filter(c => c.payload.text?.includes('خبر کل کشور')).pop();
  assert(start, 'welcome must present the nation-wide news purpose');
  const buttons = KB(start);
  assert.deepEqual(buttons, ['news:home'], 'news bot home must contain exactly one news button');

  await h.cb(201, 'news:home');
  const home = SENT_TO(201).filter(c => c.payload.text?.includes('منبع خبر را انتخاب کنید')).pop();
  assert(home, 'region picker must be shown');
  assert(KB(home).includes('news:iran') && KB(home).includes('news:world'), 'region picker must offer Iran and World');

  // Iran category picker
  await h.cb(201, 'news:iran');
  const iran = SENT_TO(201).filter(c => c.payload.text?.includes('خبرهای ایران')).pop();
  assert(iran);
  const iranCats = KB(iran);
  for (const c of ['news:cat:breaking', 'news:cat:politics', 'news:cat:economy', 'news:cat:sports', 'news:cat:tech']) assert(iranCats.includes(c), 'iran picker must offer ' + c);

  // World category picker
  await h.cb(201, 'news:world');
  const world = SENT_TO(201).filter(c => c.payload.text?.includes('خبرهای جهان')).pop();
  assert(world);
  const worldCats = KB(world);
  for (const c of ['news:wcat:all', 'news:wcat:politics', 'news:wcat:economy', 'news:wcat:sports', 'news:wcat:tech']) assert(worldCats.includes(c), 'world picker must offer ' + c);
});

test('world news is categorized by English keywords and translated to Persian', async () => {
  await h.settings({ botPurpose: 'news' });
  const seed = (src, i, title, summary) => ({ id: `world:${src.id}:s${i}`, title, summary, url: `https://example-news.world/${src.id}/${i}`, source: src.name, publishedAt: Date.now() - i * 60000, region: 'world' });
  for (const src of WORLD_NEWS_SOURCES) {
    const items = [
      seed(src, 1, 'Government announces sanctions response and new policy', 'The government held a cabinet meeting on trade policy.'),
      seed(src, 2, 'Oil prices fall as markets weigh trade deal', 'Economists said inflation remains a concern for central banks.'),
      seed(src, 3, 'National team wins friendly ahead of tournament', 'The coach praised the players after the match.'),
      seed(src, 4, 'New AI chip unveiled by technology startup', 'The company announced a data center expansion.'),
    ];
    await putJson(h.env, `v2:news:world:${src.id}`, { at: Date.now(), items }, { ttl: 300 });
  }
  // Mock the translation endpoint (Google gtx shape) with a Persian result.
  tg.setOverride(async (url) => {
    if (url.includes('translate.googleapis.com')) {
      const q = new URL(url).searchParams.get('q');
      return Response.json([[['ترجمه فارسی: ' + q]]]);
    }
    return undefined;
  });
  const politics = await fetchLiveNews(h.env, 'politics', 'world');
  assert(politics.length, 'politics items expected');
  assert(politics.every(i => i.category === 'politics'), 'only politics items in politics category');
  const translated = await translateToFa(h.env, 'Government announces sanctions response and new policy');
  assert.equal(translated, 'ترجمه فارسی: Government announces sanctions response and new policy', 'translation must be applied');
  // The cached translation must be reused without another network hit.
  tg.clear();
  const cached = await translateToFa(h.env, 'Government announces sanctions response and new policy');
  assert.equal(cached, translated);
  assert(tg.calls.filter(c => c.url.includes('translate.googleapis.com')).length === 0, 'second call must hit the cache');

  // Fallback: provider down → original title is kept, no crash.
  tg.setOverride(async (url) => {
    if (url.includes('translate.googleapis.com') || url.includes('mymemory')) throw new Error('offline');
    return undefined;
  });
  const kept = await translateToFa(h.env, 'A brand new headline nobody translated');
  assert.equal(kept, 'A brand new headline nobody translated');
});

/* ---------- Custom (default) purpose: no buttons until the admin adds some ---------- */
test('default-purpose bot starts with no buttons and shows only panel-added buttons', async () => {
  await h.settings({ botPurpose: 'custom' });
  await h.msg(202, '/start');
  let msg = SENT_TO(202).filter(c => c.payload.text?.includes('سلام')).pop();
  assert(msg, 'welcome sent');
  assert.deepEqual(KB(msg), [], 'a fresh default bot must show no buttons');

  // Administrator adds a custom button through the web panel.
  const saved = await h.api('PUT', '/menu', {
    welcome: { fa: 'خوش آمدید {name}', en: 'Welcome {name}' },
    inlineButtons: [
      [{ text: '📢 کانال خبری', type: 'url', value: 'https://t.me/newschannel' }],
      [{ text: '💬 پشتیبانی', type: 'callback', value: 'support:open' }],
    ],
    submenus: {},
  });
  assert.equal(saved.status, 200);

  tg.clear();
  await h.msg(202, '/start');
  msg = SENT_TO(202).filter(c => c.payload.text?.includes('خوش آمدید')).pop();
  assert(msg);
  const buttons = KB(msg);
  assert(buttons.some(b => b === 'https://t.me/newschannel'), 'custom url button must be shown');
  assert(buttons.includes('support:open'), 'custom callback button must be shown');
  assert(!buttons.some(b => b === 'cart:show' || b === 'cat:all:0' || b === 'rates:home' || b === 'news:home'), 'no system buttons may leak into the default bot');

  // Clearing all buttons keeps the home empty again (explicit empty list is honored).
  await h.api('PUT', '/menu', { welcome: { fa: 'خوش آمدید', en: 'Welcome' }, inlineButtons: [], submenus: {} });
  tg.clear();
  await h.msg(202, '/start');
  msg = SENT_TO(202).filter(c => c.payload.text?.includes('خوش آمدید')).pop();
  assert.deepEqual(KB(msg), [], 'an explicitly empty button list must render no buttons');
});

/* ---------- Rates purpose: one button → categories ---------- */
test('rates-purpose bot: start shows one price button; home offers the categories', async () => {
  await h.settings({ botPurpose: 'rates' });
  await h.msg(203, '/start');
  const start = SENT_TO(203).filter(c => c.payload.text).pop();
  assert(start);
  assert.deepEqual(KB(start), ['rates:home'], 'rates bot home must contain exactly one price button');

  await h.cb(203, 'rates:home');
  const home = SENT_TO(203).filter(c => c.payload.text?.includes('قیمت لحظه‌ای طلا، ارز و رمزارزها')).pop();
  assert(home);
  const buttons = KB(home);
  assert(buttons.includes('rates:gold') && buttons.includes('rates:fiat') && buttons.includes('rates:crypto'), 'rate categories must be offered');
});

/* ---------- /admin: every tap edits the open message, no new screens ---------- */
test('admin panel: navigation taps edit the current message instead of stacking new ones', async () => {
  await h.settings({ adminId: '9000', botPurpose: 'custom' });
  await h.msg(9000, '/admin');
  const home = SENT_TO(9000).filter(c => c.payload.text?.includes('مدیریت ربات از تلگرام')).pop();
  assert(home, 'admin home must be sent');
  const homeButtons = KB(home);
  for (const expected of ['adm:stats', 'adm:users', 'adm:settings', 'adm:broadcast', 'adm:news', 'adm:rates', 'adm:relay', 'adm:orders', 'adm:products', 'adm:coupons', 'adm:menu', 'adm:support', 'adm:engagement', 'adm:groups', 'adm:feeds', 'adm:faq', 'adm:crm', 'adm:media', 'adm:lock', 'adm:webhook', 'adm:tuning', 'adm:shop', 'adm:token', 'adm:sb', 'adm:services']) {
    assert(homeButtons.includes(expected), 'admin home must expose ' + expected);
  }

  const editsOf = (chatId) => tg.calls.filter(c => c.method === 'editMessageText' && String(c.payload.chat_id) === String(chatId));
  // Tap a few screens: each one must refresh the open message.
  for (const data of ['adm:stats', 'adm:news', 'adm:rates', 'adm:menu', 'adm:shop']) {
    tg.clear();
    await h.cb(9000, data);
    assert(editsOf(9000).length >= 1, 'tap on ' + data + ' must edit the open message');
    const newScreens = tg.sent().filter(c => String(c.payload.chat_id) === '9000' && c.payload.reply_markup?.inline_keyboard?.length);
    assert.equal(newScreens.length, 0, 'tap on ' + data + ' must not stack a new keyboard message');
  }
});

test('admin rates manager: toggle, category, daily time and destinations from Telegram', async () => {
  await h.settings({ adminId: '9000', rates: { autoSend: { enabled: false, category: 'all', time: '', destinations: [] } } });
  await h.msg(9000, '/admin');
  tg.clear();
  await h.cb(9000, 'adm:rates');
  await h.cb(9000, 'adm:rt:09:00');
  let s = await getSettings(h.env);
  assert.equal(s.rates.autoSend.time, '09:00');
  assert.equal(s.rates.autoSend.enabled, true);
  await h.cb(9000, 'adm:rcat:gold');
  s = await getSettings(h.env);
  assert.equal(s.rates.autoSend.category, 'gold');
  // Destinations through the guided text flow.
  await h.cb(9000, 'adm:rddest');
  await h.msg(9000, 'کانال قیمت | @rateschannel\nگروه اقتصادی | -100999');
  s = await getSettings(h.env);
  assert.equal(s.rates.autoSend.destinations.length, 2);
  assert.equal(s.rates.autoSend.destinations[0].chatId, '@rateschannel');
});

test('admin rates screen can report which feeds answered', async () => {
  await h.settings({ adminId: '9000', botPurpose: 'custom' });
  await h.msg(9000, '/admin');
  tg.clear();
  await h.cb(9000, 'adm:rates');
  const screen = SENT_TO(9000).pop();
  assert(KB(screen).includes('adm:rsrc'), 'the rates screen must offer a source check');

  // Every market host is unreachable here, so the report must name the failures
  // instead of only saying the market could not be reached.
  await h.cb(9000, 'adm:rsrc');
  const report = SENT_TO(9000).filter(c => c.payload.text?.includes('وضعیت منابع نرخ')).pop();
  assert(report, 'the source report must be delivered');
  assert(report.payload.text.includes('منبع پاسخ داد'), 'it counts the answering feeds');
  assert(/❌/.test(report.payload.text), 'a blocked feed is marked as failed');
  assert(report.payload.text.includes('آخرین نرخ ذخیره‌شده'), 'and the snapshot warning stays visible');
});

test('rates daily tick publishes the table once per day at the scheduled time', async () => {
  await h.settings({ botPurpose: 'rates', rates: { autoSend: { enabled: true, category: 'all', time: '09:00', destinations: [{ chatId: '-100111', title: 'کانال قیمت' }] } } });
  // Not yet 09:00 Tehran time? Force the due branch by backdating state.
  await ratesTick(h.env);
  let sends = SENT_TO('-100111');
  if (sends.length) {
    // It was past 09:00: one send today, and nothing more on the second run.
    assert.equal(sends.length, 1);
    assert(sends[0].payload.text.includes('📈'));
    await ratesTick(h.env);
    assert.equal(SENT_TO('-100111').length, 1, 'daily rate digest must not repeat the same day');
  } else {
    // Before 09:00: force the deadline to a time that has always passed today.
    const s = await getSettings(h.env);
    s.rates.autoSend.time = '00:00';
    await saveSettings(h.env, s);
    await ratesTick(h.env);
    sends = SENT_TO('-100111');
    assert.equal(sends.length, 1, 'rate digest must be delivered at the scheduled time');
    assert(sends[0].payload.text.includes('📈'));
    await ratesTick(h.env);
    assert.equal(SENT_TO('-100111').length, 1, 'daily rate digest must not repeat the same day');
  }
});

test('news daily time mode: one digest per day', async () => {
  await h.settings({ botPurpose: 'news', news: { autoSend: { enabled: true, category: 'sports', intervalMinutes: 60, time: '00:00', destinations: [{ chatId: '-100222', title: 'گروه ورزش' }] } } });
  const { newsTick } = await import('../src/news.js');
  await newsTick(h.env);
  assert.equal(SENT_TO('-100222').length, 1, 'first due run sends the daily digest');
  await newsTick(h.env);
  assert.equal(SENT_TO('-100222').length, 1, 'second run the same day must not send again');
});

test('rates settings API validates and persists scheduling config', async () => {
  await h.settings({ botPurpose: 'rates' });
  const bad = await h.api('PUT', '/rates/settings', { autoSend: { enabled: true, category: 'gold', time: '25:00', destinations: [{ chatId: '-100111' }] } });
  assert.equal(bad.status, 400);
  assert.equal(bad.error, 'invalid_rates_time');
  const ok = await h.api('PUT', '/rates/settings', { autoSend: { enabled: true, category: 'gold', time: '18:30', destinations: [{ chatId: '-100111', title: 'کانال' }] } });
  assert.equal(ok.status, 200);
  assert.equal(ok.data.rates.autoSend.time, '18:30');
  const state = await h.api('GET', '/rates');
  assert.equal(state.status, 200);
  assert.equal(state.data.rates.autoSend.category, 'gold');
  assert(state.data.categories.gold);
  const preview = await h.api('GET', '/rates/preview?category=fiat');
  assert.equal(preview.status, 200);
  assert(preview.data.text.includes('دلار'));
  const sent = await h.api('POST', '/rates/send', { category: 'gold' });
  assert.equal(sent.status, 200);
  assert.equal(sent.data.sent, 1);
});

test('news daily time can be set through the settings API', async () => {
  await h.settings({ botPurpose: 'news' });
  const ok = await h.api('PUT', '/news/settings', { autoSend: { enabled: true, category: 'all', intervalMinutes: 60, time: '20:15', destinations: [{ chatId: '-100222', title: 'گروه' }] } });
  assert.equal(ok.status, 200);
  assert.equal(ok.data.news.autoSend.time, '20:15');
  const bad = await h.api('PUT', '/news/settings', { autoSend: { enabled: true, category: 'all', intervalMinutes: 60, time: '99:99', destinations: [{ chatId: '-100222' }] } });
  assert.equal(bad.status, 400);
});
