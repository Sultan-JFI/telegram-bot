import test, { beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { setup, telegramMock, MemoryKV } from './helpers.mjs';
import { getLiveRates, parseMarketNumber, parseIranSiteHtml, IRAN_MARKET_SOURCES } from '../src/rates.js';

let tg;
const originalFetch = globalThis.fetch;

beforeEach(() => {
  tg = telegramMock();
  globalThis.fetch = tg.fetcher;
});
afterEach(() => {
  globalThis.fetch = originalFetch;
});

const tgjuPayload = () => ({
  current: {
    // Rial-denominated quotes must be normalized to Toman automatically.
    gold_18: { p: '45,000,000', h: '45,200,000', l: '44,800,000', dp: '1.5' },
    sekee: { p: '520,000,000', h: '525,000,000', l: '518,000,000', dp: '0.8' },
    price_dollar_rl: { p: '900,000', h: '905,000', l: '895,000', dp: '0.4' },
    price_eur: { p: '980,000', dp: '0.3' },
    ons: { p: '2735.40', h: '2748.20', l: '2728.10', dp: '-0.35' },
  },
});

const nobitexPayload = () => ({
  status: 'ok',
  stats: {
    'usdt-rls': { latest: '9010000', dayLow: '8950000', dayHigh: '9050000', dayChange: '0.42' },
    'btc-rls': { latest: '62500000000', dayLow: '61000000000', dayHigh: '63000000000', dayChange: '2.1' },
    'trx-rls': { latest: '145000', dayLow: '140000', dayHigh: '147000', dayChange: '0.9' },
  },
});

function marketEnv() {
  return { BOT_KV: new MemoryKV(), TEST_MODE: true };
}

test('live rates merge TGJU gold/fiat with Nobitex crypto and normalize Rial to Toman', async () => {
  tg.setOverride((u) => {
    if (u.includes('tgju.org')) return tgjuPayload();
    if (u.includes('nobitex.ir')) return nobitexPayload();
    if (u.includes('coingecko.com')) return {};
    if (u.includes('bonbast')) throw new Error('offline');
    if (u.includes('swapwallet')) throw new Error('offline');
    return undefined;
  });
  const rates = await getLiveRates(marketEnv());
  assert.equal(rates.stale, false);
  assert.match(rates.source, /tgju/);
  assert.match(rates.source, /nobitex/);
  // Rial → Toman normalization
  assert.equal(rates.gold.gold18.price, 4500000);
  assert.equal(rates.gold.emami.price, 52000000);
  assert.equal(rates.fiat.usd.price, 90000);
  assert.equal(rates.fiat.eur.price, 98000);
  // Ounce stays in USD
  assert.equal(rates.gold.ounce.price, 2735.4);
  // Nobitex Rial → Toman
  assert.equal(rates.crypto.usdt.priceToman, 901000);
  assert.equal(rates.crypto.btc.priceToman, 6250000000);
  // USD leg anchored to the live USDT rate
  assert(rates.crypto.btc.priceUsd > 6000 && rates.crypto.btc.priceUsd < 8000);
  assert.equal(rates.crypto.usdt.priceUsd, 1);
  assert(!('offline' in rates));
});

test('every source failing serves the last good snapshot marked stale', async () => {
  const env = marketEnv();
  tg.setOverride((u) => {
    if (u.includes('tgju.org')) return tgjuPayload();
    if (u.includes('nobitex.ir')) return nobitexPayload();
    throw new Error('offline');
  });
  const fresh = await getLiveRates(env);
  assert.equal(fresh.stale, false);
  assert.equal(fresh.gold.gold18.price, 4500000);
  // Expire the 60s cache, then fail every source.
  tg.setOverride(() => { throw new Error('offline'); });
  await env.BOT_KV.delete('v2:rates:cache');
  const stale = await getLiveRates(env);
  assert.equal(stale.stale, true);
  assert.equal(stale.gold.gold18.price, 4500000);
  assert.equal(stale.fiat.usd.price, 90000);
});

test('absurd quotes are rejected and the table keeps its previous values', async () => {
  tg.setOverride((u) => {
    if (u.includes('tgju.org'))
      return { current: { gold_18: { p: '99999999999999' }, price_dollar_rl: { p: '-5' } } };
    throw new Error('offline');
  });
  const rates = await getLiveRates(marketEnv());
  // Nothing usable arrived and no snapshot exists: static fallback, flagged.
  assert.equal(rates.stale, true);
  assert.equal(rates.offline, true);
  assert(rates.gold.gold18.price > 0);
});

test('parseMarketNumber reads latin, persian and arabic digits', () => {
  assert.equal(parseMarketNumber('1,234.5'), 1234.5);
  assert.equal(parseMarketNumber('۱۲۳۴'), 1234);
  assert.equal(parseMarketNumber('١٢٣٤'), 1234);
  assert.equal(parseMarketNumber('1.5%'), 1.5);
  assert(Number.isNaN(parseMarketNumber('—')));
});

test('panel live endpoint exposes the same table with source metadata', async () => {
  const h = await setup();
  tg.setOverride((u) => {
    if (u.includes('tgju.org')) return tgjuPayload();
    if (u.includes('nobitex.ir')) return nobitexPayload();
    throw new Error('offline');
  });
  void IRAN_MARKET_SOURCES;
  const res = await h.api('GET', '/rates/live');
  assert.equal(res.ok, true);
  assert.equal(res.data.stale, false);
  assert.equal(res.data.gold.gold18.price, 4500000);
  assert.equal(res.data.fiat.usd.price, 90000);
  assert.equal(res.data.crypto.usdt.priceToman, 901000);
  assert(res.data.updatedAt > 0);
});

/* ============ Public Iranian tracker pages (moj3 / alanchand / isignal) ============
 * These pages are the ones the panel owner checks by hand; their published tables
 * are read as HTML and used whenever the JSON feeds above cannot answer. Fixtures
 * below mirror the served markup of each site's price page. */

const alanchandHtml = `
<table><tr><th>نام ارز</th><th>قیمت خرید</th><th>قیمت فروش</th></tr>
<tr><td>دلار آمریکا</td><td>۲۳۰,۳۵۰</td><td>۲۳۲,۷۰۰</td><td>-</td></tr>
<tr><td>یورو</td><td>۲۶۳,۱۰۰</td><td>۲۶۵,۸۰۰</td><td>۰.۸۷۵</td></tr>
<tr><td>درهم</td><td>۶۲,۷۳۰</td><td>۶۳,۳۶۰</td><td>۳.۶۷</td></tr>
<tr><td>لیر ترکیه</td><td>۴,۶۹۰</td><td>۴,۸۴۰</td><td>۴۸.۸</td></tr>
<tr><td>پوند انگلیس</td><td>۳۰۲,۰۰۰</td><td>۳۰۶,۶۰۰</td><td>۰.۷۵۱</td></tr>
<tr><td>یوان چین</td><td>۳۴,۱۰۰</td><td>۳۴,۸۰۰</td><td>۶.۷۱</td></tr>
<tr><td>دلار کانادا</td><td>۱۶۲,۷۰۰</td><td>۱۶۵,۲۰۰</td><td>۱.۴۰۹</td></tr></table>
<div><h3>آبشده(مثقال طلا)</h3><p>۱۰۱,۲۵۰,۰۰۰ تومان</p></div>
<div><h3>گرم طلای 18 عیار</h3><p>۲۳,۳۷۳,۶۶۰ تومان</p></div>
<div><h3>سکه امامی (طرح جدید)</h3><p>۲۳۵,۰۰۰,۰۰۰ تومان</p></div>
<div><h3>انس طلا</h3><p>۴,۳۲۹.۳۵$</p></div>
<div><h3>تتر</h3><p>۲۲۸,۴۵۴ تومان ۰.۵۷%</p></div>
<div><h3>بیت کوین</h3><p>۱۹,۷۴۴,۸۹۶,۱۵۲ تومان ۱.۱۴$۸۶,۴۴۴</p></div>
<div><h3>اتریوم</h3><p>۶۳۰,۴۹۰,۰۰۰ تومان ۰.۹۰$۲,۷۵۷</p></div>
<div><h3>تون کوین</h3><p>۰ تومان ۰.۹۵$۱.۶۰۰</p></div>
<div><h3>ترون</h3><p>۷۸,۹۳۳ تومان ۱.۳۸$۰.۳۴۴</p></div>
<div><h3>سولانا</h3><p>۲۷,۱۶۸,۳۹۲ تومان ۱.۷۴$۱۱۸.۸</p></div>
<div><h3>نات کوین</h3><p>۱۱۶ تومان ۰.۷۹$۰.۰۰۰۵۱</p></div>`;

const moj3Html = `
<h1>قیمت طلا امروز؛ قیمت لحظه‌ای طلا، دلار و سکه</h1>
<table><tr><td>طلای 18 عیار</td><td>23,431,368</td><td>-3.7%</td><td>+0.98%</td><td>+231,800</td></tr>
<tr><td>طلای 24 عیار</td><td>31,918,300</td><td>-1.6%</td><td>+0.98%</td><td>+309,000</td></tr>
<tr><td>دلار</td><td>233,200</td><td></td><td>+1.04%</td><td>+2,400</td></tr>
<tr><td>سکه طرح جدید</td><td>234,000,000</td><td>-0.9%</td><td>+1.50%</td><td>+3,510,000</td></tr>
<tr><td>سکه طرح قدیم</td><td>230,000,000</td><td>-1.8%</td><td>+1.37%</td><td>+3,160,000</td></tr>
<tr><td>نیم سکه</td><td>119,500,000</td><td>+0.62%</td><td>+0.83%</td><td>+1,000,000</td></tr>
<tr><td>ربع سکه</td><td>63,500,000</td><td>+6.48%</td><td>0.00%</td><td>0</td></tr>
<tr><td>انس جهانی طلا</td><td>4,328</td><td></td><td>-0.72%</td><td>-31</td></tr></table>
<h2>قیمت دلار امروز در بازار آزاد</h2>
<table><tr><td>دلار</td><td>233,200</td><td>+1.04%</td><td>+2,400</td></tr></table>
<h2>قیمت تتر، یورو و درهم امروز</h2>
<table><tr><td>تتر</td><td>227,715</td><td>0.00%</td><td>0</td></tr>
<tr><td>درهم</td><td>63,522</td><td>+1.07%</td><td>+672</td></tr>
<tr><td>یورو</td><td>266,890</td><td>+0.71%</td><td>+1,880</td></tr></table>`;

const isignalHtml = `
<div><h3>سکه امامی</h3><span>1405/06/31</span><span>35,623,500</span><span>1.5%</span>
<span>2,374,900,000 ریال</span></div>
<div><h3>دلار</h3><span>1405/06/31</span><span>24,253</span><span>1.04%</span><span>2,332,000 ریال</span></div>
<div><h3>تتر</h3><span>09:59:00</span><span>0.84%</span><span>2,275,870 ریال</span></div>
<div><h3>طلای 18 عیار</h3><span>1405/06/31</span><span>2,346,022</span><span>0.98%</span>
<span>239,390,000 ریال</span></div>
<div><h3>انس جهانی طلا</h3><span>10:03:49</span><span>28.88</span><span>0.66%</span><span>4,331 دلار</span></div>
<div><h3>آبشده نقدی</h3><span>1405/06/31</span><span>8,052,876</span><span>0.78%</span><span>1,032,420,000 ریال</span></div>
<div><h3>طلای 24 عیار</h3><span>1405/06/31</span><span>319,183,000 ریال</span></div>
<div><h3>سکه بهار آزادی</h3><span>1405/06/31</span><span>2,332,900,000 ریال</span></div>
<div><h3>نیم سکه</h3><span>1,210,000,000 ریال</span></div>
<div><h3>ربع سکه</h3><span>630,000,000 ریال</span></div>
<div><h3>سکه یک گرمی</h3><span>330,000,000 ریال</span></div>`;

const htmlResponse = (html) => new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } });

test('the public Iranian trackers are read as Toman quotes with range checks', () => {
  const alanchand = parseIranSiteHtml(alanchandHtml, 'alanchand');
  assert.equal(alanchand['fiat.usd'], 232700, 'the sell column is the market price');
  assert.equal(alanchand['fiat.eur'], 265800);
  assert.equal(alanchand['fiat.try'], 4840);
  assert.equal(alanchand['gold.gold18'], 23373660);
  assert.equal(alanchand['gold.emami'], 235000000);
  assert.equal(alanchand['gold.ounce'], 4329.35, 'the global ounce stays in USD');
  assert.equal(alanchand['crypto.usdt'], 228454);
  assert.equal(alanchand['crypto.btc'], 19744896152);
  assert.equal(alanchand['crypto.sol'], 27168392);
  assert.equal(alanchand['crypto.not'], 116);
  assert.equal(alanchand['crypto.ton'], undefined, 'a zero quote is rejected instead of stored');

  const moj3 = parseIranSiteHtml(moj3Html, 'moj3');
  assert.equal(moj3['gold.gold18'], 23431368);
  assert.equal(moj3['gold.gold24'], 31918300);
  assert.equal(moj3['fiat.usd'], 233200);
  assert.equal(moj3['gold.emami'], 234000000);
  assert.equal(moj3['gold.bahar'], 230000000);
  assert.equal(moj3['gold.nim'], 119500000);
  assert.equal(moj3['gold.rob'], 63500000);
  assert.equal(moj3['gold.ounce'], 4328);

  const isignal = parseIranSiteHtml(isignalHtml, 'isignal');
  // isignal publishes Rial: the values are normalized to Toman.
  assert.equal(isignal['gold.gold18'], 23939000);
  assert.equal(isignal['gold.gold24'], 31918300);
  assert.equal(isignal['gold.emami'], 237490000);
  assert.equal(isignal['gold.mesghal'], 103242000);
  assert.equal(isignal['fiat.usd'], 233200);
  assert.equal(isignal['gold.ounce'], 4331, 'ounce is not divided as a Rial price');
});

test('the tracker pages fill the gaps left by the JSON feeds', async () => {
  const env = marketEnv();
  tg.setOverride((u) => {
    if (u.includes('tgju.org')) return tgjuPayload();
    if (u.includes('alanchand.com')) return htmlResponse(alanchandHtml);
    if (u.includes('isignal.ir')) return htmlResponse(isignalHtml);
    if (u.includes('moj3.ir')) return htmlResponse(moj3Html);
    throw new Error('offline');
  });
  const rates = await getLiveRates(env);
  assert.equal(rates.stale, false);
  // TGJU wins for the keys it answered…
  assert.equal(rates.fiat.usd.price, 90000);
  assert.match(rates.source, /tgju/);
  // …while the trackers cover what it did not.
  assert.match(rates.source, /alanchand/);
  assert.equal(rates.gold.gold24.price, 31918300);
  assert.equal(rates.gold.bahar.price, 230000000);
  assert.equal(rates.gold.nim.price, 119500000);
  assert.equal(rates.crypto.not.priceToman, 116);
});

test('tracker quotes alone are enough to keep the table plausible offline', async () => {
  const env = marketEnv();
  tg.setOverride((u) => {
    if (u.includes('alanchand.com')) return htmlResponse(alanchandHtml);
    if (u.includes('isignal.ir')) return htmlResponse(isignalHtml);
    if (u.includes('moj3.ir')) return htmlResponse(moj3Html);
    throw new Error('offline');
  });
  const rates = await getLiveRates(env);
  assert.equal(rates.stale, false, 'the page sources keep the table live');
  assert.equal(rates.fiat.usd.price, 232700);
  assert.equal(rates.gold.gold18.price, 23373660);
  assert.equal(rates.crypto.usdt.priceToman, 228454);
  assert.match(rates.source, /alanchand/);
});

test('a tracker page refused by the Worker is read through the relay', async () => {
  const env = marketEnv();
  const seen = [];
  tg.setOverride((u) => {
    seen.push(u);
    // The relay answers with its own short preamble around the page body.
    if (u.startsWith('https://r.jina.ai/') && u.includes('alanchand.com'))
      return new Response(`Title: alanchand\n\nURL Source: https://alanchand.com/\n\nMarkdown Content:\n${alanchandHtml}`);
    throw new Error('offline');
  });
  const rates = await getLiveRates(env);
  assert.ok(seen.some(u => u.startsWith('https://r.jina.ai/') && u.includes('alanchand.com')), 'the page is retried through the relay');
  assert.equal(rates.stale, false, 'a relayed page still counts as a live source');
  assert.equal(rates.fiat.usd.price, 232700, 'the relayed body goes through the same parser');
  assert.equal(rates.gold.gold18.price, 23373660);
  assert.equal(rates.diagnostics.find(d => d.name === 'alanchand').via, 'jina');
});

/* ============ Feed resilience ============
 * The Iranian hosts are the ones a Worker is most likely to be cut off from, so
 * the table must stay current through the global key-less feeds and through the
 * light TGJU widget endpoint rather than fall back to a "connection failed"
 * badge. Fixtures below are the live payload shapes of those endpoints. */

const tgjuWidgetPayload = () => ({
  response: { indicators: [
    { name: 'price_dollar_rl', p: '2317050', h: '2327200', l: '2302600', dp: 0.65 },
    { name: 'price_eur', p: '2643200', dp: 0.97 },
    { name: 'price_iqd', p: '1490', dp: 1.48 },
    { name: 'tgju_gold_irg18', p: '236891000', h: '236891000', l: '233451000', dp: 1.39 },
    { name: 'sekeb', p: '2322250000', dp: 0.46 },
    { name: 'mesghal', p: '1029530000', dp: 0.73 },
    { name: 'tether_gold_xaut', p: '4289.75', h: '4363.72', l: '4281.96', dp: 1.58 },
  ] },
});

const coingeckoPayload = () => ({
  tether: { usd: 0.9998, usd_24h_change: -0.01 },
  bitcoin: { usd: 84382.9957, usd_24h_change: -2.47 },
  ethereum: { usd: 2671.6277, usd_24h_change: -2.93 },
  tron: { usd: 0.3401, usd_24h_change: -0.43 },
  'the-open-network': { usd: 1.4077, usd_24h_change: -3.22 },
  solana: { usd: 114.5297, usd_24h_change: -3.04 },
  notcoin: { usd: 0.0005, usd_24h_change: -8.47 },
});

const rateJsonPayload = () => ({ generated_by_tomanify_at: '2026-09-22', values: { USD: 233200, EUR: 266890, AED: 63522, TRY: 4867, CNY: 34820 } });

test('the light TGJU widget feed answers without the megabyte ajax feed', async () => {
  const env = marketEnv();
  tg.setOverride((u) => {
    if (u.includes('api.tgju.org')) return tgjuWidgetPayload();
    if (u.includes('tgju.org')) throw new Error('mirrors offline');
    if (u.includes('nobitex.ir')) return nobitexPayload();
    throw new Error('offline');
  });
  const rates = await getLiveRates(env);
  assert.equal(rates.stale, false);
  assert.match(rates.source, /tgju/);
  // Widget quotes are Rial too: 2,317,050 → 231,705 Toman.
  assert.equal(rates.fiat.usd.price, 231705);
  assert.equal(rates.fiat.eur.price, 264320);
  assert.equal(rates.fiat.iqd.price, 14900, 'the dinar row is the 100-dinar quote');
  assert.equal(rates.gold.gold18.price, 23689100);
  assert.equal(rates.gold.ounce.price, 4289.75);
  assert.equal(rates.crypto.usdt.priceToman, 901000);
  const tgjuDiag = rates.diagnostics.find(d => d.name === 'tgju');
  assert.equal(tgjuDiag.ok, true);
  assert(tgjuDiag.hits > 0);
});

test('TGJU keeps priority whichever feed answers first', async () => {
  const env = marketEnv();
  tg.setOverride((u) => {
    // TGJU answers last, but its quote must still win over Nobitex's USDT mirror.
    if (u.includes('tgju.org')) return new Promise(resolve => setTimeout(() => resolve(Response.json(tgjuPayload())), 20));
    if (u.includes('nobitex.ir')) return nobitexPayload();
    throw new Error('offline');
  });
  const rates = await getLiveRates(env);
  assert.equal(rates.fiat.usd.price, 90000);
  assert.equal(rates.crypto.usdt.priceToman, 901000);
});

test('when every Iranian host is blocked the global feeds keep the table fresh', async () => {
  const env = marketEnv();
  tg.setOverride((u) => {
    if (u.includes('coingecko.com')) return coingeckoPayload();
    if (u.includes('gold-api.com')) return { currency: 'USD', price: 4290.399902, symbol: 'XAU' };
    if (u.includes('rate-json')) return rateJsonPayload();
    if (u.includes('er-api.com')) return { result: 'success', rates: { USD: 1, EUR: 0.873207, GBP: 0.749328, AED: 3.6725, TRY: 48.831559, CNY: 6.71347, CAD: 1.405443 } };
    throw new Error('offline');
  });
  const rates = await getLiveRates(env);
  assert.equal(rates.stale, false, 'a blocked Iranian market must not blank the table');
  assert.equal(rates.offline, undefined);
  // Free-market quotes still arrive in Toman…
  assert.equal(rates.fiat.usd.price, 233200);
  assert.equal(rates.fiat.eur.price, 266890);
  // …and the gold rows are calculated from the live ounce and dollar, so they
  // stay within a few percent of the Tehran market instead of being old static.
  assert(rates.derived > 0);
  assert.match(rates.source, /derived/);
  assert(rates.gold.gold18.price > 22000000 && rates.gold.gold18.price < 25000000, 'calculated 18K gold must stay in market range');
  assert(rates.gold.emami.price > 220000000 && rates.gold.emami.price < 260000000);
  assert(rates.gold.gold18.derived === true);
  // The cross-currency rows follow the live dollar.
  assert(rates.fiat.cad.price > 150000 && rates.fiat.cad.price < 180000);
  // Crypto in Toman follows the live USD legs.
  assert(rates.crypto.btc.priceToman > 18000000000 && rates.crypto.btc.priceToman < 21000000000);
  assert(rates.crypto.eth.priceToman > 600000000 && rates.crypto.eth.priceToman < 650000000, 'USD legs are converted with the live dollar');
  assert.equal(rates.crypto.usdt.priceToman, 233200);
  // And every failure is named for the panel's status list.
  const blocked = rates.diagnostics.filter(d => !d.ok).map(d => d.name);
  assert(blocked.includes('tgju') && blocked.includes('nobitex') && blocked.includes('alanchand'));
  assert(rates.diagnostics.every(d => typeof d.ms === 'number'));
  assert.equal(rates.diagnostics.find(d => d.name === 'fx').ok, true, 'the world-rate reference is reported as reachable');
});

test('a total blackout still reports the reason next to the saved snapshot', async () => {
  const env = marketEnv();
  tg.setOverride((u) => {
    if (u.includes('tgju.org')) return tgjuPayload();
    if (u.includes('nobitex.ir')) return nobitexPayload();
    throw new Error('offline');
  });
  await getLiveRates(env);
  await env.BOT_KV.delete('v2:rates:cache');
  tg.setOverride(() => { throw new Error('offline'); });
  const stale = await getLiveRates(env);
  assert.equal(stale.stale, true);
  assert.equal(stale.gold.gold18.price, 4500000, 'the saved snapshot is still served');
  assert(stale.diagnostics.some(d => !d.ok && d.error), 'the failure of this attempt stays visible');
});

test('force refresh skips the one-minute cache', async () => {
  const env = marketEnv();
  let calls = 0;
  tg.setOverride((u) => {
    if (u.includes('tgju.org')) return tgjuPayload();
    if (u.includes('nobitex.ir')) { calls++; return nobitexPayload(); }
    throw new Error('offline');
  });
  await getLiveRates(env);
  const cached = await getLiveRates(env);
  assert.equal(cached.gold.gold18.price, 4500000);
  assert.equal(calls, 1, 'the second call is served from the minute cache');
  await getLiveRates(env, { force: true });
  assert(calls >= 2, 'force bypasses the cache for the diagnostics endpoint');
});

test('the panel can ask which rate sources answered', async () => {
  const h = await setup();
  tg.setOverride((u) => {
    if (u.includes('tgju.org')) return tgjuPayload();
    if (u.includes('nobitex.ir')) return nobitexPayload();
    throw new Error('offline');
  });
  const res = await h.api('GET', '/rates/sources');
  assert.equal(res.ok, true);
  const names = res.data.sources.map(s => s.name);
  assert(names.includes('tgju') && names.includes('nobitex') && names.includes('alanchand'), 'every feed is listed: ' + names.join(','));
  assert.equal(res.data.sources.find(s => s.name === 'tgju').ok, true);
  assert.equal(res.data.sources.find(s => s.name === 'nobitex').ok, true);
  assert.equal(res.data.sources.find(s => s.name === 'alanchand').ok, false);
  assert(res.data.labels.tgju.fa, 'labels come with the report');
  assert.equal(res.data.stale, false);
  const live = await h.api('GET', '/rates/live');
  assert(Array.isArray(live.data.diagnostics) && live.data.diagnostics.length > 5, 'the table carries its own diagnostics');
  assert.equal(typeof live.data.derived, 'number');
});

test('a rejected Nobitex batch falls back to one request per symbol', async () => {
  const urls = [];
  tg.setOverride((u) => {
    urls.push(u);
    if (u.includes('nobitex.ir')) {
      const asked = /srcCurrency=([^&]+)/.exec(u)?.[1] || '';
      // The exchange rejects the whole batch when one symbol is not listed.
      if (asked.includes(',')) return new Response(JSON.stringify({ status: 'failed', code: 'InvalidCurrency' }), { status: 400 });
      const latest = { usdt: '2304640', btc: '194350582590', eth: '6150937860', trx: '786040', sol: '263033480' }[asked];
      return { status: 'ok', stats: { [`${asked}-rls`]: { latest, dayLow: latest, dayHigh: latest, dayChange: '1.69' } } };
    }
    if (u.includes('tgju.org')) return tgjuPayload();
    if (u.includes('coingecko')) return {};
    throw new Error('offline');
  });
  const rates = await getLiveRates(marketEnv());
  assert.ok(urls.some(u => /srcCurrency=[^&]*,/.test(u)), 'the batch request is tried first');
  assert.ok(urls.filter(u => /srcCurrency=[a-z]+&/.test(u)).length >= 4, 'every pair is then asked for on its own');
  assert.equal(rates.crypto.usdt.priceToman, 230464);
  assert.equal(rates.crypto.btc.priceToman, 19435058259);
  assert.equal(rates.crypto.trx.priceToman, 78604);
  const nobitex = rates.diagnostics.find(d => d.name === 'nobitex');
  assert.equal(nobitex.ok, true);
  assert.equal(nobitex.error, undefined, 'a recovered batch is not reported as a failure');
  assert.equal(nobitex.hits, 5);
});

/* ---------- The relay transport ----------
 * A Cloudflare Worker is refused by several Iranian market hosts, so a failed
 * direct fetch is retried through a public read-through relay. The relay is only
 * a transport: its payload is parsed and range-checked exactly like a direct one. */
const jinaWrap = (json) => 'Title: \n\nURL Source: https://api.tgju.org/…\n\nMarkdown Content:\n' + JSON.stringify(json) + '\n';
const widgetPayload = () => ({
  response: {
    indicators: [
      { name: 'tgju_gold_irg18', p: '236,891,000', h: '236,941,000', l: '233,451,000', dp: 1.41 },
      { name: 'sekee', p: '2,364,800,000', dp: 0.43 },
      { name: 'price_dollar_rl', p: '2,317,050', dp: 0.65 },
      { name: 'price_eur', p: '2,643,200', dp: 0.31 },
      { name: 'price_iqd', p: '1,490', dp: 0.1 },
      { name: 'ons', p: '4289.75', dp: -0.35 },
    ],
  },
});

test('a host that refuses the Worker is retried through the relay', async () => {
  const seen = [];
  tg.setOverride((u) => {
    seen.push(u);
    if (u.startsWith('https://r.jina.ai/')) return new Response(jinaWrap(widgetPayload()), { headers: { 'content-type': 'text/plain' } });
    if (u.includes('nobitex.ir')) return nobitexPayload();
    if (u.includes('coingecko')) return {};
    throw new Error('offline');
  });
  const kv = marketEnv();
  const rates = await getLiveRates(kv);
  assert.equal(rates.stale, false);
  assert.ok(seen.some(u => u.startsWith('https://r.jina.ai/https://api.tgju.org/')), 'the widget URL is relayed');
  // Same numbers, same normalization as a direct answer.
  assert.equal(rates.gold.gold18.price, 23689100);
  assert.equal(rates.gold.emami.price, 236480000);
  assert.equal(rates.fiat.usd.price, 231705);
  assert.equal(rates.fiat.iqd.price, 14900);
  assert.equal(rates.gold.ounce.price, 4289.75);
  const tgju = rates.diagnostics.find(d => d.name === 'tgju');
  assert.equal(tgju.ok, true);
  assert.equal(tgju.hits, 6);
  assert.equal(tgju.via, 'jina', 'the diagnostics name the transport that delivered the feed');
});

test('fenced relay bodies are unwrapped, and global feeds are never relayed', async () => {
  const seen = [];
  tg.setOverride((u) => {
    seen.push(u);
    if (u.startsWith('https://r.jina.ai/')) return '```json\n' + JSON.stringify(nobitexPayload()) + '\n```';
    throw new Error('offline');
  });
  const rates = await getLiveRates(marketEnv());
  // Everything is blocked, yet the table is still served (as a saved snapshot).
  assert.equal(rates.stale, true);
  assert.ok(seen.some(u => u.startsWith('https://r.jina.ai/http')), 'Iranian hosts were relayed');
  assert.equal(seen.some(u => u.startsWith('https://r.jina.ai/') && /coingecko|kraken|gold-api|rate-json|er-api|jsdelivr/.test(u)), false,
    'global feeds are never sent through the relay');
});

test('the relayed payload still has to pass the range checks', async () => {
  tg.setOverride((u) => {
    if (u.startsWith('https://r.jina.ai/')) return jinaWrap({ response: { indicators: [{ name: 'price_dollar_rl', p: '12' }] } });
    throw new Error('offline');
  });
  const rates = await getLiveRates(marketEnv());
  assert.equal(rates.stale, true, 'an implausible relayed quote does not count as a live source');
  assert.equal(rates.fiat.usd.price, 233200, 'the static baseline is kept');
});
