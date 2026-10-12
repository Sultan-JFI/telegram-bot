import { getJson, putJson, getSettings } from './kv.js';
import { tgApi, sendToUser, resolveToken } from './bot-api.js';
import { text as tr, str, int, isChatId, isValidTime, assert, enabled } from './config.js';
import { fetchLimited } from './services/common.js';
import { MARKET_ENDPOINT } from './services/rates.js';
import { tehranDate, tehranTodayAt } from './news.js';

export const RATES_SEND_CATS = ['all', 'gold', 'fiat', 'crypto'];
export const RATES_CATEGORIES = {
  gold: { fa: '🪙 طلا و انواع سکه', en: '🪙 Gold & Coins' },
  fiat: { fa: '💵 ارزهای بازار آزاد', en: '💵 Fiat Currencies' },
  crypto: { fa: '💎 رمزارزها و تتر', en: '💎 Crypto & Tether' },
};

/* Offline snapshot of the Iranian market, kept in Toman. It is only the starting
 * point of the table: every refresh replaces these numbers with live quotes from
 * TGJU / Bonbast / Nobitex and, when those are unreachable, from the public
 * Iranian trackers (moj3.ir, alanchand.com, isignal.ir). Keeping it current means
 * a cold start (or a fully blocked network) still shows realistic Iranian prices
 * instead of obviously wrong ones. Values below match the 1405/07/01 session. */
export const GOLD_DATA = {
  gold18: { fa: 'طلای ۱۸ عیار', en: '18K Gold (per gram)', unit: 'گرم', price: 23450000, change: 0.98, high: 23590000, low: 23310000 },
  gold24: { fa: 'طلای ۲۴ عیار', en: '24K Gold (per gram)', unit: 'گرم', price: 31918000, change: 0.98, high: 32110000, low: 31730000 },
  mesghal: { fa: 'مثقال طلا (آبشده)', en: 'Mithqal Gold (melted)', unit: 'مثقال', price: 101250000, change: 0.78, high: 101900000, low: 100600000 },
  emami: { fa: 'سکه تمام بهار (امامی)', en: 'Emami Full Gold Coin', unit: 'عدد', price: 234000000, change: 1.50, high: 235000000, low: 231000000 },
  bahar: { fa: 'سکه بهار آزادی (طرح قدیم)', en: 'Bahar Azadi Coin', unit: 'عدد', price: 230000000, change: 1.37, high: 231000000, low: 227000000 },
  nim: { fa: 'نیم سکه بهار آزادی', en: 'Half Gold Coin', unit: 'عدد', price: 119500000, change: 0.83, high: 120200000, low: 118500000 },
  rob: { fa: 'ربع سکه بهار آزادی', en: 'Quarter Gold Coin', unit: 'عدد', price: 63500000, change: 0.00, high: 63900000, low: 63100000 },
  gerami: { fa: 'سکه گرمی', en: '1g Gold Coin', unit: 'عدد', price: 33000000, change: 0.00, high: 33200000, low: 32800000 },
  ounce: { fa: 'انس جهانی طلا', en: 'Global Gold Ounce', unit: 'USD', price: 4330.50, isUsd: true, change: -0.70, high: 4365.00, low: 4300.00 },
};

export const FIAT_DATA = {
  usd: { fa: 'دلار آمریکا', en: 'US Dollar (USD)', code: 'USD', price: 233200, change: 1.04, high: 233900, low: 231800 },
  eur: { fa: 'یورو اروپا', en: 'Euro (EUR)', code: 'EUR', price: 266890, change: 0.71, high: 267600, low: 265600 },
  aed: { fa: 'درهم امارات', en: 'UAE Dirham (AED)', code: 'AED', price: 63522, change: 1.07, high: 63800, low: 63100 },
  gbp: { fa: 'پوند انگلیس', en: 'British Pound (GBP)', code: 'GBP', price: 305000, change: 0.55, high: 306600, low: 302000 },
  try: { fa: 'لیر ترکیه', en: 'Turkish Lira (TRY)', code: 'TRY', price: 4840, change: -0.20, high: 4900, low: 4800 },
  iqd: { fa: 'صد دینار عراق', en: '100 Iraqi Dinar (IQD)', code: 'IQD', price: 14870, change: 0.15, high: 14950, low: 14800 },
  cny: { fa: 'یوان چین', en: 'Chinese Yuan (CNY)', code: 'CNY', price: 34800, change: 0.25, high: 34950, low: 34600 },
  cad: { fa: 'دلار کانادا', en: 'Canadian Dollar (CAD)', code: 'CAD', price: 165200, change: 0.35, high: 165900, low: 164400 },
};

export const CRYPTO_DATA = {
  usdt: { fa: 'تتر (USDT)', en: 'Tether (USDT)', symbol: 'USDT', priceToman: 228000, priceUsd: 1.00, change: 0.20, high: 228600, low: 227300 },
  btc: { fa: 'بیت‌کوین (BTC)', en: 'Bitcoin (BTC)', symbol: 'BTC', priceToman: 19745000000, priceUsd: 86430, change: 1.12, high: 19900000000, low: 19500000000 },
  eth: { fa: 'اتریوم (ETH)', en: 'Ethereum (ETH)', symbol: 'ETH', priceToman: 630500000, priceUsd: 2756, change: 0.85, high: 634000000, low: 625000000 },
  ton: { fa: 'تون‌کوین (TON)', en: 'Toncoin (TON)', symbol: 'TON', priceToman: 335600, priceUsd: 1.47, change: 2.22, high: 340000, low: 331000 },
  trx: { fa: 'ترون (TRX)', en: 'TRON (TRX)', symbol: 'TRX', priceToman: 78650, priceUsd: 0.3442, change: -1.37, high: 79900, low: 77400 },
  sol: { fa: 'سولانا (SOL)', en: 'Solana (SOL)', symbol: 'SOL', priceToman: 27135000, priceUsd: 118.78, change: 1.69, high: 27600000, low: 26750000 },
  not: { fa: 'نات‌کوین (NOT)', en: 'Notcoin (NOT)', symbol: 'NOT', priceToman: 114, priceUsd: 0.0005, change: 0.80, high: 117, low: 111 },
};

const fmtMoney = (n, lang = 'fa') => Number(n).toLocaleString(lang === 'en' ? 'en-US' : 'fa-IR');
const trendIcon = ch => ch > 0 ? '🟢 📈 +' : ch < 0 ? '🔴 📉 ' : '⚪ ';

/* ============ Live Iran-market sources (gold, coins, fiat, crypto) ============
 * Several independent public sources are queried in parallel and merged by
 * priority. Every quote is sanity-checked against a plausible range, and
 * Rial/Toman unit mistakes are auto-corrected, so a broken source can never
 * poison the table. Sources are layered on purpose: Iranian market feeds answer
 * first (TGJU for gold/coins/fiat, Nobitex/TetherLand for the Toman side of the
 * crypto table), then global key-less feeds (CoinGecko, Kraken, gold-api.com,
 * open.er-api.com) cover what is left, and the rows nobody answered are
 * calculated from those live references and marked `derived`. Only when every
 * single source fails is the last good snapshot served (marked stale) instead of
 * showing old static numbers. */

// The TGJU widget endpoint answers with just the rows this table needs (a few
// KB) instead of the ~1 MB ajax.json feed, which keeps a Worker refresh cheap.
export const TGJU_WIDGET_KEYS = [
  'tgju_gold_irg18', 'gold_melted', 'mesghal', 'sekee', 'sekeb', 'nim', 'rob',
  'gerami', 'gold_24', 'ons', 'tether_gold_xaut', 'price_dollar_rl', 'price_eur',
  'price_gbp', 'price_aed', 'price_try', 'price_cny', 'price_cad', 'price_iqd',
];

// Nobitex fails the *entire* stats request when one symbol is not listed (a
// stray `ton` kept this feed at HTTP 400 and left the Toman crypto table empty),
// so only symbols the exchange actually lists are asked for in the batch — and
// the refresh falls back to one request per symbol if even that is rejected.
export const NOBITEX_PAIRS = ['usdt', 'btc', 'eth', 'trx', 'sol'];
export const nobitexUrl = (pairs) => `https://apiv2.nobitex.ir/market/stats?srcCurrency=${pairs.join(',')}&dstCurrency=rls`;

export const IRAN_MARKET_SOURCES = {
  tgjuWidget: 'https://api.tgju.org/v1/widget/tmp?keys=' + TGJU_WIDGET_KEYS.join(',') + '&t=1',
  // The four call* hosts are the ajax board; www.tgju.org/ajax.json answers 404.
  tgju: ['https://call1.tgju.org/ajax.json', 'https://call2.tgju.org/ajax.json', 'https://call3.tgju.org/ajax.json', 'https://call4.tgju.org/ajax.json'],
  nobitex: nobitexUrl(NOBITEX_PAIRS),
  // Bonbast has no free JSON endpoint left (the site answers 405 to a plain GET
  // and its community mirror `bonbast.liara.run` no longer resolves), so the
  // slot is a mirror list that can be filled again without touching the
  // pipeline. Free-market fiat is covered by TGJU, Nobitex's USDT/USD mirror,
  // the rate-json feed and the world rates.
  bonbast: [],
  tetherland: 'https://api.tetherland.com/currencies',
  coingecko: 'https://api.coingecko.com/api/v3/simple/price?ids=tether,bitcoin,ethereum,tron,the-open-network,solana,notcoin&vs_currencies=usd&include_24hr_change=true&precision=4',
  kraken: 'https://api.kraken.com/0/public/Ticker?pair=XBTUSD,ETHUSD,SOLUSD,TRXUSD,TONUSD',
  goldApi: 'https://api.gold-api.com/price/XAU',
  // World currency rates (no key) used to calculate the fiat rows: the direct
  // endpoint first, then the jsDelivr/CDN mirror of the same data, which is
  // served by Cloudflare itself and therefore always reachable from a Worker.
  worldFx: ['https://open.er-api.com/v6/latest/USD', 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.min.json'],
  rateJson: ['https://raw.githubusercontent.com/rate-json/default/main/data.json', 'https://cdn.jsdelivr.net/gh/rate-json/default@main/data.json'],
};

// Human labels for the panel's source-status list, so a failing feed is named
// instead of hidden behind a single "connection failed" badge.
export const RATE_SOURCE_LABELS = {
  tgju: { fa: 'TGJU — طلا، سکه و ارز', en: 'TGJU — gold, coins & FX' },
  bonbast: { fa: 'بون‌بست', en: 'Bonbast' },
  nobitex: { fa: 'نوبیتکس — کریپتو به تومان', en: 'Nobitex — crypto in Toman' },
  tetherland: { fa: 'تترلند — تتر', en: 'TetherLand — USDT' },
  swapwallet: { fa: 'SwapWallet', en: 'SwapWallet' },
  coingecko: { fa: 'کوین‌گکو — نرخ دلاری کریپتو', en: 'CoinGecko — crypto in USD' },
  kraken: { fa: 'کراکن — نرخ دلاری کریپتو', en: 'Kraken — crypto in USD' },
  'gold-api': { fa: 'gold-api — انس جهانی طلا', en: 'gold-api — global gold ounce' },
  fx: { fa: 'نرخ‌های جهانی ارز', en: 'World currency rates' },
  'rate-json': { fa: 'rate-json — نرخ آزاد به تومان', en: 'rate-json — free-market Toman rates' },
  alanchand: { fa: 'آلان‌چند', en: 'Alanchand' },
  moj3: { fa: 'موج ۳', en: 'Moj3' },
  isignal: { fa: 'آی‌سیگنال', en: 'iSignal' },
  derived: { fa: 'محاسبه از منابع زنده', en: 'Calculated from live sources' },
};

/* Public Iranian price trackers (the pages the panel owner checks by hand). They
 * have no free JSON API, so their published Persian price tables are read from
 * the served HTML and used to fill every quote the JSON feeds above missed —
 * for example when TGJU blocks the Worker's egress. The declared unit of each
 * site is applied before the value is range-checked, and a quote is accepted
 * only when it lands inside a plausible Toman band, so a layout change can never
 * push nonsense into the table. */
export const IRAN_MARKET_HTML_SOURCES = {
  alanchand: { url: 'https://alanchand.com/', unit: 'toman' },
  moj3: { url: 'https://moj3.ir/price/', unit: 'toman' },
  isignal: { url: 'https://isignal.ir/gold-currency/', unit: 'rial' },
};

// Persian labels used by those three sites, in the order they are tried. The
// first label that appears in the page wins; from its position the largest
// number that fits the asset's plausible band is taken as the quote.
const SITE_LABELS = [
  [[/طلای\s*۱۸ عیار/, /طلای\s*18 عیار/, /گرم طلای 18 عیار/], 'gold', 'gold18'],
  [[/طلای\s*۲۴ عیار/, /طلای\s*24 عیار/], 'gold', 'gold24'],
  [[/آبشده/, /مثقال طلا/], 'gold', 'mesghal'],
  [[/سکه امامی/, /سکه طرح جدید/], 'gold', 'emami'],
  [[/سکه بهار آزادی/, /سکه طرح قدیم/], 'gold', 'bahar'],
  [[/نیم سکه/], 'gold', 'nim'],
  [[/ربع سکه/], 'gold', 'rob'],
  [[/سکه یک گرمی/, /سکه گرمی/, /سکه\s*1 گرمی/], 'gold', 'gerami'],
  [[/انس جهانی طلا/, /انس طلا/], 'gold', 'ounce'],
  [[/دلار آمریکا/, /دلار/], 'fiat', 'usd'],
  [[/یورو/], 'fiat', 'eur'],
  [[/درهم/], 'fiat', 'aed'],
  [[/پوند انگلیس/, /پوند/], 'fiat', 'gbp'],
  [[/لیر ترکیه/, /لیر/], 'fiat', 'try'],
  [[/صد دینار عراق/, /دینار عراق/], 'fiat', 'iqd'],
  [[/یوان چین/, /یوان/], 'fiat', 'cny'],
  [[/دلار کانادا/], 'fiat', 'cad'],
  [[/تتر/], 'crypto', 'usdt'],
  [[/بیت\s*کوین/], 'crypto', 'btc'],
  [[/اتریوم/], 'crypto', 'eth'],
  [[/تون\s*کوین/], 'crypto', 'ton'],
  [[/ترون/], 'crypto', 'trx'],
  [[/سولانا/], 'crypto', 'sol'],
  [[/نات\s*کوین/], 'crypto', 'not'],
];

const HTML_ENTITIES = { '&nbsp;': ' ', '&zwnj;': '\u200c', '&amp;': '&', '&quot;': '"', '&#39;': "'", '&laquo;': '«', '&raquo;': '»' };

// Cell (one table cell / inline element) and record (one row or card) markers, so
// a label can be tied to the numbers printed in its own row instead of the next
// currency's row.
const SITE_CELL = '\u0001';
export const SITE_REC = '\u0002';
const SITE_BLOCK_TAGS = 'tr|div|li|section|article|table|tbody|thead|ul|ol|dl|nav|main|header|footer';
const SITE_CELL_TAGS = 'p|span|td|th|h1|h2|h3|h4|h5|h6|b|strong|em|i|a|small|label|time|dt|dd';

// Flattens a price page to text while keeping row boundaries, dropping scripts,
// styles and every other tag.
export function htmlToText(html) {
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(new RegExp(`</?(?:${SITE_BLOCK_TAGS})\\s*/?>`, 'gi'), SITE_REC)
    .replace(/<br\s*\/?>/gi, SITE_REC)
    .replace(new RegExp(`</?(?:${SITE_CELL_TAGS})[^>]*>`, 'gi'), SITE_CELL)
    .replace(/<[^>]*>/g, SITE_CELL)
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&[a-z#0-9]+;/gi, (e) => HTML_ENTITIES[e.toLowerCase()] ?? ' ')
    .replace(/[ \t\r\n]+/g, ' ')
    .trim();
}

const SITE_TOKEN_RE = /[0-9][0-9.,٬]*|[۰-۹][۰-۹.,٬]*|[٠-٩][٠-٩.,٬]*/g;

/* Finds the quote a label points at. Every occurrence of the label is tried in
 * order: a heading without numbers is skipped, and a quote is only accepted when
 * it lands inside the asset's plausible band after applying the site's unit. */
function siteQuoteFor(text, label, cat, key, unit) {
  const [min, max] = RATE_RANGES[key] || [0, Infinity];
  const normalize = (raw) => (key === 'ounce' ? raw : unit === 'rial' ? raw / 10 : raw);
  label.lastIndex = 0;
  let match, checked = 0;
  while ((match = label.exec(text)) && checked < 12) {
    checked++;
    const record = text.slice(match.index + match[0].length, text.length).slice(0, 600).split(SITE_REC)[0];
    const hits = [];
    let firstCell = null;
    for (const cell of record.split(SITE_CELL)) {
      const cellHits = [];
      for (const token of cell.match(SITE_TOKEN_RE) || []) {
        const raw = parseMarketNumber(token);
        if (!Number.isFinite(raw) || raw <= 0) continue;
        const toman = normalize(raw);
        if (toman < min || toman > max) continue;
        cellHits.push({ raw, toman });
      }
      if (cellHits.length) {
        hits.push(...cellHits);
        if (!firstCell) firstCell = cellHits;
      }
    }
    const pool = hits.length ? (cat === 'fiat' ? hits : firstCell) : null;
    if (!pool) continue;
    // Currencies publish a buy and a sell column (the free-market price is the
    // sell one), so the largest plausible value of the row is the quote.
    const pick = pool.reduce((a, b) => (b.toman > a.toman ? b : a));
    return key === 'ounce' ? Math.round(pick.raw * 100) / 100 : Math.round(pick.toman);
  }
  return 0;
}

/* Reads the price table of one of the public Iranian trackers. Returns quotes in
 * Toman keyed as `category.key`, ready for `applySiteQuotes`. */
export function parseIranSiteHtml(html, source = 'alanchand') {
  const unit = IRAN_MARKET_HTML_SOURCES[source]?.unit || 'toman';
  const text = htmlToText(html);
  const quotes = {};
  for (const [regexes, cat, key] of SITE_LABELS) {
    for (const re of regexes) {
      // The global flag lets every occurrence of a label be tried in order, so a
      // heading that mentions the asset without a price is skipped.
      const value = siteQuoteFor(text, new RegExp(re.source, 'g'), cat, key, unit);
      if (value) { quotes[`${cat}.${key}`] = value; break; }
    }
  }
  return quotes;
}

// Applied after the JSON feeds, so it only fills the gaps they left behind.
export function applySiteQuotes(rates, quotes) {
  let hits = 0;
  for (const [path, value] of Object.entries(quotes || {})) {
    const [cat, key] = path.split('.');
    if (cat === 'gold' && key === 'ounce') {
      const item = rates.gold?.ounce;
      if (!item || item._live) continue;
      if (value >= RATE_RANGES.ounce[0] && value <= RATE_RANGES.ounce[1]) {
        item.price = value; item._live = true; hits++;
      }
      continue;
    }
    if (applyQuote(rates, cat, key, value, {}, true, 'toman')) hits++;
  }
  return hits;
}

// Plausible [min, max] per key, in Toman (ounce in USD). Bands stay narrow on
// purpose: Rial and Toman readings must never both fit the same band, so a
// source that flips its unit is caught instead of silently shifting 10×.
const RATE_RANGES = {
  gold18: [1000000, 80000000], gold24: [1500000, 110000000], mesghal: [4000000, 350000000],
  emami: [8000000, 1200000000], bahar: [8000000, 1200000000], nim: [4000000, 600000000],
  rob: [2000000, 400000000], gerami: [1000000, 150000000], ounce: [300, 30000],
  usd: [20000, 3000000], eur: [20000, 3500000], aed: [5000, 1000000], gbp: [25000, 4000000],
  try: [500, 200000], iqd: [1000, 400000], cny: [2500, 500000], cad: [15000, 2500000],
  usdt: [20000, 3000000], btc: [500000000, 80000000000], eth: [5000000, 1500000000],
  ton: [50000, 30000000], trx: [2000, 3000000], sol: [2000000, 150000000], not: [50, 300000],
};

const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
export function parseMarketNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : NaN;
  if (value == null) return NaN;
  let s = String(value).trim().replace(/,/g, '').replace(/%/g, '').replace(/٬/g, '');
  s = s.replace(/[۰-۹]/g, d => FA_DIGITS.indexOf(d)).replace(/[٠-٩]/g, d => AR_DIGITS.indexOf(d));
  s = s.replace('٫', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

// Accept the quote when it fits the range in the source's declared unit
// (TGJU and Nobitex publish Rial, SwapWallet publishes Toman IRT). When the
// declared unit misses, one ×10/÷10 retry absorbs a source-side unit flip;
// anything else is rejected so a broken feed can never poison the table.
function fitMoney(raw, key, unit = 'auto') {
  const [min, max] = RATE_RANGES[key] || [0, Infinity];
  const v = parseMarketNumber(raw);
  if (!Number.isFinite(v) || v <= 0) return 0;
  const candidates = unit === 'rial' ? [v / 10, v]
    : unit === 'toman' ? [v, v / 10]
    : [v, v / 10, v * 10];
  for (const c of candidates) {
    if (c >= min && c <= max) return Math.round(c);
  }
  return 0;
}

function fitPercent(raw) {
  const v = parseMarketNumber(raw);
  if (!Number.isFinite(v) || Math.abs(v) > 50) return null;
  return Math.round(v * 100) / 100;
}

function applyQuote(rates, cat, key, price, extra = {}, gapsOnly = false, unit = 'auto') {
  const item = rates[cat]?.[key];
  if (!item) return false;
  if (gapsOnly && item._live) return false;
  const toman = fitMoney(price, key, unit);
  if (!toman) return false;
  if (cat === 'crypto') item.priceToman = toman;
  else item.price = toman;
  const high = fitMoney(extra.high, key, unit);
  const low = fitMoney(extra.low, key, unit);
  if (high) item.high = high;
  if (low) item.low = low;
  const change = fitPercent(extra.change);
  if (change !== null && change !== undefined) item.change = change;
  item._live = true;
  return true;
}

function clearLiveFlags(rates) {
  for (const cat of Object.values(rates)) {
    if (!cat || typeof cat !== 'object') continue;
    for (const item of Object.values(cat)) {
      if (item && typeof item === 'object') { delete item._live; delete item._usdLive; }
    }
  }
}

// [category, key, multiplier]: TGJU publishes the Iraqi dinar per single dinar
// while this table quotes 100 dinars, so that row is scaled on the way in.
const TGJU_MAP = {
  gold_18: ['gold', 'gold18'], gold_24: ['gold', 'gold24'], gold_melted: ['gold', 'mesghal'],
  sekee: ['gold', 'emami'], sekeb: ['gold', 'bahar'], nim: ['gold', 'nim'],
  rob: ['gold', 'rob'], gerami: ['gold', 'gerami'],
  price_dollar_rl: ['fiat', 'usd'], price_eur: ['fiat', 'eur'], price_gbp: ['fiat', 'gbp'],
  price_aed: ['fiat', 'aed'], price_try: ['fiat', 'try'], price_cny: ['fiat', 'cny'],
  price_cad: ['fiat', 'cad'], price_iqd: ['fiat', 'iqd', 100],
};

const scaled = (value, factor = 1) => {
  const n = parseMarketNumber(value);
  return Number.isFinite(n) ? n * factor : undefined;
};

// Same keys as the full ajax feed, but served by the light widget endpoint.
const TGJU_WIDGET_MAP = { ...TGJU_MAP, tgju_gold_irg18: ['gold', 'gold18'] };

// The ounce is quoted in USD by both feeds, so it never goes through the
// Rial→Toman money path.
function applyOunce(rates, price, { high, low, change } = {}) {
  const ounce = parseMarketNumber(price);
  if (!Number.isFinite(ounce) || ounce < RATE_RANGES.ounce[0] || ounce > RATE_RANGES.ounce[1]) return false;
  const item = rates.gold.ounce;
  item.price = Math.round(ounce * 100) / 100;
  const h = parseMarketNumber(high), l = parseMarketNumber(low);
  if (h > 0) item.high = Math.round(h * 100) / 100;
  if (l > 0) item.low = Math.round(l * 100) / 100;
  const ch = fitPercent(change);
  if (ch !== null && ch !== undefined) item.change = ch;
  item._live = true;
  return true;
}

export function parseTgjuRows(rows, rates) {
  let hits = 0;
  for (const row of rows) {
    const name = String(row?.name ?? '');
    if (name === 'ons' || name === 'tether_gold_xaut') {
      if (applyOunce(rates, row.p ?? row.price, { high: row.h ?? row.high, low: row.l ?? row.low, change: row.dp ?? row.change ?? row.d })) hits++;
      continue;
    }
    const map = TGJU_WIDGET_MAP[name];
    if (!map) continue;
    const [cat, key, factor] = map;
    if (applyQuote(rates, cat, key, scaled(row.p ?? row.price, factor), {
      high: scaled(row.h ?? row.high, factor), low: scaled(row.l ?? row.low, factor),
      change: row.dp ?? row.change ?? row.d,
    }, false, 'rial')) hits++;
  }
  return hits;
}

export function parseTgju(payload, rates) {
  const current = payload?.current;
  if (!current || typeof current !== 'object') return 0;
  return parseTgjuRows(Object.entries(current).map(([name, row]) => ({ name, ...row })), rates);
}

// The widget endpoint answers {response:{indicators:[{name,p,h,l,dp}, …]}} with
// only the requested rows — the cheapest way to read the same TGJU numbers.
export function parseTgjuWidget(payload, rates) {
  const rows = payload?.response?.indicators;
  if (!Array.isArray(rows)) return 0;
  return parseTgjuRows(rows, rates);
}

const BONBAST_KEYS = [
  [/dollar|usd|دلار/i, 'usd'], [/eur|یورو/i, 'eur'], [/gbp|pound|پوند/i, 'gbp'],
  [/aed|dirham|درهم/i, 'aed'], [/try|lira|لیر/i, 'try'], [/iqd|dinar|دینار/i, 'iqd'],
  [/cny|yuan|یوان/i, 'cny'], [/cad|کانادا/i, 'cad'],
];

export function parseBonbast(payload, rates) {
  // Community mirror without a frozen schema: accept {code: price-ish} maps
  // as well as [{code|name, sell|price|buy}] lists, matched best-effort.
  // Runs after TGJU, so it only fills keys TGJU missed.
  const rows = [];
  if (Array.isArray(payload)) {
    for (const row of payload) {
      if (row && typeof row === 'object')
        rows.push([String(row.code ?? row.name ?? row.title ?? ''), row.sell ?? row.price ?? row.buy]);
    }
  } else if (payload && typeof payload === 'object') {
    const list = Array.isArray(payload.result) ? payload.result : null;
    if (list) return parseBonbast(list, rates);
    for (const [k, v] of Object.entries(payload))
      rows.push([k, v && typeof v === 'object' ? (v.sell ?? v.price ?? v.buy) : v]);
  }
  let hits = 0;
  for (const [name, price] of rows) {
    const match = BONBAST_KEYS.find(([re]) => re.test(name));
    if (match && applyQuote(rates, 'fiat', match[1], price, {}, true)) hits++;
  }
  return hits;
}

const NOBITEX_MAP = { usdt: 'usdt', btc: 'btc', eth: 'eth', trx: 'trx', ton: 'ton', sol: 'sol' };

export function parseNobitex(payload, rates) {
  const stats = payload?.stats;
  if (!stats || typeof stats !== 'object') return 0;
  let hits = 0;
  for (const [src, key] of Object.entries(NOBITEX_MAP)) {
    const row = stats[`${src}-rls`] || stats[`${src}-usdt`];
    if (!row) continue;
    if (applyQuote(rates, 'crypto', key, row.latest ?? row.last, {
      high: row.dayHigh, low: row.dayLow, change: row.dayChange,
    }, false, 'rial')) hits++;
  }
  // The free-market dollar tracks USDT closely; mirror it when TGJU missed it.
  const usdt = rates.crypto.usdt.priceToman;
  if (hits && usdt > 1000 && !rates.fiat.usd._live) {
    rates.fiat.usd.price = usdt;
    rates.fiat.usd.change = rates.crypto.usdt.change;
    rates.fiat.usd._live = true;
    hits++;
  }
  return hits;
}



const GECKO_MAP = {
  tether: 'usdt', bitcoin: 'btc', ethereum: 'eth', tron: 'trx',
  'the-open-network': 'ton', solana: 'sol', notcoin: 'not',
};

export function parseCoingecko(payload, rates, usdtToman) {
  if (!payload || typeof payload !== 'object') return 0;
  let hits = 0;
  for (const [id, key] of Object.entries(GECKO_MAP)) {
    const row = payload[id];
    const usd = parseMarketNumber(row?.usd);
    if (!Number.isFinite(usd) || usd <= 0) continue;
    const item = rates.crypto[key];
    if (!item) continue;
    item.priceUsd = usd < 100 ? Math.round(usd * 10000) / 10000 : Math.round(usd * 100) / 100;
    item._usdLive = true;
    const ch = fitPercent(row?.usd_24h_change);
    if (ch !== null) item.change = ch;
    // Last-resort Toman estimate for coins no Iranian source quoted.
    if (key !== 'usdt' && usdtToman > 1000 && !item._live) {
      const est = fitMoney(Math.round(usd * usdtToman), key);
      if (est) { item.priceToman = est; item._live = true; }
    }
    hits++;
  }
  return hits;
}

export function parseSwapwallet(payload, rates) {
  const result = payload?.status === 'OK' ? payload.result : null;
  if (!result || typeof result !== 'object') return 0;
  let hits = 0;
  const map = { 'USDT/IRT': 'usdt', 'TRX/IRT': 'trx', 'TON/IRT': 'ton' };
  for (const [pair, key] of Object.entries(map)) {
    // Nobitex already covered these when reachable; only fill its gaps.
    if (result[pair] && applyQuote(rates, 'crypto', key, result[pair], {}, true, 'toman')) hits++;
  }
  return hits;
}

/* TetherLand publishes the USDT/Toman price as free JSON. It is a second Toman
 * anchor next to Nobitex, so the table still knows the dollar side when one of
 * the two exchanges is unreachable from the Worker. */
export function parseTetherland(payload, rates) {
  const usdt = payload?.data?.currencies?.USDT;
  const price = parseMarketNumber(usdt?.price ?? usdt?.sell_price);
  if (!Number.isFinite(price) || price <= 0) return 0;
  const extra = { high: usdt?.sell_price, low: usdt?.buy_price, change: usdt?.diff24d };
  let hits = 0;
  if (applyQuote(rates, 'crypto', 'usdt', price, extra, true, 'toman')) hits++;
  if (applyQuote(rates, 'fiat', 'usd', price, extra, true, 'toman')) hits++;
  return hits;
}

// Global gold spot (USD per ounce) from a key-less feed. Used for the ounce row
// and, when no Iranian source answers, as the base of the calculated gold rows.
export function parseGoldApi(payload, rates) {
  if (rates.gold.ounce._live) return 0;
  return applyOunce(rates, payload?.price, {}) ? 1 : 0;
}

// Key-less spot prices of the majors on Kraken: the USD leg of the crypto table
// when CoinGecko is rate-limiting the shared Worker egress.
const KRAKEN_MAP = { XXBTZUSD: 'btc', XETHZUSD: 'eth', SOLUSD: 'sol', TRXUSD: 'trx', TONUSD: 'ton' };

export function parseKraken(payload, rates) {
  const result = payload?.result;
  if (!result || typeof result !== 'object') return 0;
  let hits = 0;
  for (const [pair, key] of Object.entries(KRAKEN_MAP)) {
    const row = result[pair];
    const last = parseMarketNumber(row?.c?.[0]);
    if (!Number.isFinite(last) || last <= 0) continue;
    const item = rates.crypto[key];
    if (!item || item._usdLive) continue;
    item.priceUsd = last < 100 ? Math.round(last * 10000) / 10000 : Math.round(last * 100) / 100;
    const open = parseMarketNumber(row?.o);
    const change = open > 0 ? fitPercent(((last - open) / open) * 100) : null;
    if (change !== null && change !== undefined) item.change = change;
    item._usdLive = true;
    hits++;
  }
  return hits;
}

/* A small community feed (updated a few times a day, served from GitHub and
 * jsDelivr, so it is reachable even where Iranian hosts are blocked) with the
 * free-market Toman price of the main currencies. It only fills gaps. */
const RATEJSON_MAP = { USD: 'usd', EUR: 'eur', AED: 'aed', TRY: 'try', CNY: 'cny' };

export function parseRateJson(payload, rates) {
  const values = payload?.values;
  if (!values || typeof values !== 'object') return 0;
  let hits = 0;
  for (const [code, key] of Object.entries(RATEJSON_MAP)) {
    if (applyQuote(rates, 'fiat', key, values[code], {}, true, 'toman')) hits++;
  }
  return hits;
}

/* ============ Calculated rows ============
 * Everything above needs an Iranian feed. Those feeds are the ones a Worker is
 * most likely to be cut off from, so any row they did not answer is calculated
 * from the references that are live in this very refresh — the USDT/Toman price,
 * the world gold spot and cross-currency rates — and flagged `derived` so the
 * panel and the bot can say the number is calculated instead of pretending it is
 * an exchange quote. Nothing is ever derived from a stale snapshot: without at
 * least one live reference the table stays honestly stale. */
const GOLD_OUNCE_GRAMS = 31.1034768;
// Tehran's 18K gram against the spot value of 0.750 g of fine gold (observed
// band 0.97–1.01), and the stable weight ratios of the coins and the mithqal.
const GOLD18_MARKET_PREMIUM = 0.99;
const GOLD_RATIOS = { gold24: 1.362, mesghal: 4.345, emami: 9.982, bahar: 9.803, nim: 5.129, rob: 2.702, gerami: 1.435 };
const WORLD_FX_MAP = { EUR: 'eur', GBP: 'gbp', AED: 'aed', TRY: 'try', CNY: 'cny', CAD: 'cad' };

export function deriveQuotes(rates, refs = {}) {
  let derived = 0;
  const put = (cat, key, value, change) => {
    const item = rates[cat]?.[key];
    if (!item || item._live) return false;
    const toman = fitMoney(value, key);
    if (!toman) return false;
    if (cat === 'crypto') item.priceToman = toman;
    else item.price = toman;
    const ch = fitPercent(change);
    if (ch !== null && ch !== undefined) item.change = ch;
    item.derived = true;
    item._live = true;
    derived++;
    return true;
  };

  const usdToman = Number(refs.usdToman) || 0;
  const xauUsd = Number(refs.xauUsd) || 0;

  if (usdToman > 0) {
    put('fiat', 'usd', usdToman);
    put('crypto', 'usdt', usdToman);
  }

  // Gold: the ounce in dollars × the live dollar, then the market ratios.
  const gold18 = usdToman > 0 && xauUsd > 0
    ? (xauUsd / GOLD_OUNCE_GRAMS) * 0.75 * usdToman * GOLD18_MARKET_PREMIUM
    : 0;
  if (gold18 > 0) {
    put('gold', 'gold18', gold18);
    for (const [key, ratio] of Object.entries(GOLD_RATIOS)) put('gold', key, gold18 * ratio);
  }

  // Crypto: live USD legs × the live dollar (the Toman legs are anchored below).
  if (usdToman > 0) {
    for (const [key, item] of Object.entries(rates.crypto)) {
      if (key === 'usdt' || item._live) continue;
      if (item._usdLive && item.priceUsd > 0) put('crypto', key, item.priceUsd * usdToman, item.change);
    }
  }

  // Currencies no Iranian feed quoted: the world rate divided into the dollar.
  const world = refs.worldFx;
  if (usdToman > 0 && world && typeof world === 'object') {
    for (const [code, key] of Object.entries(WORLD_FX_MAP)) {
      const rate = parseMarketNumber(world[code]);
      if (rate > 0) put('fiat', key, usdToman / rate);
    }
  }
  return derived;
}

// Browser-like identity: several market hosts answer 403 to a bare Worker
// request, and the Iranian ones expect the referer of their own page.
const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

/* Public read-through relays — a third party fetching on the Worker's behalf.
 * They exist for one reason: a Cloudflare Worker's egress is refused by several
 * Iranian market hosts, while these relays answer the Worker and can still reach
 * those hosts. A relay is a transport, never a source of truth: its payload goes
 * through exactly the same parser and the same unit/range checks as a direct
 * answer, and it is only consulted after the direct fetch failed. */
export const RATE_RELAYS = [
  { name: 'jina', url: (target) => 'https://r.jina.ai/' + target },
];

// Iranian market / tracker hosts worth relaying. Global feeds are never
// relayed: when they fail it is a real outage, not a blocked egress.
const RELAYABLE_HOSTS = ['tgju.org', 'nobitex.ir', 'tetherland.com', 'swapwallet.app', 'bonbast', 'ramzinex.com', 'wallex.ir', 'bitpin.', 'alanchand.com', 'moj3.ir', 'isignal.ir'];
const relayable = (url) => RELAYABLE_HOSTS.some((h) => String(url).includes(h));

// The relay answers with a short text preamble around the body and fences JSON
// bodies, so the payload is sliced out before parsing.
export function unwrapRelayBody(text) {
  let s = String(text ?? '').trim();
  const fence = s.match(/```[a-z]*\s*\n([\s\S]*?)\n```/i) || s.match(/```([\s\S]*?)```/);
  if (fence) s = fence[1].trim();
  const start = s.search(/[{\[]/);
  if (start > 0) s = s.slice(start);
  return s;
}

// One attempt against one URL. `redirect: 'follow'` matters here — several of
// these hosts bounce http→https or add a trailing slash, and fetchLimited
// defaults to refusing redirects, which used to fail the whole source.
async function directJson(url, max, { referer, timeoutMs = 8000 } = {}) {
  const res = await fetchLimited(url, {
    redirect: 'follow',
    headers: {
      accept: 'application/json, text/plain, */*',
      'accept-language': 'fa-IR,fa;q=0.9,en;q=0.8',
      'user-agent': BROWSER_UA,
      ...(referer ? { referer } : {}),
    },
  }, max, timeoutMs);
  if (!res.ok) throw new Error('http_' + res.status);
  return res.data ?? JSON.parse(res.text);
}

/* Reads a JSON feed: direct first, then through a relay when the host is one the
 * Worker egress is likely to be refused by. `entry` (the diagnostics record) is
 * tagged with the relay that delivered the payload, so the panel can show *how*
 * a number arrived. */
async function fetchJson(url, max = 512 * 1024, { referer, entry, relay = relayable(url), timeoutMs = 8000 } = {}) {
  const directError = await directJson(url, max, { referer, timeoutMs }).then(
    (data) => ({ data }),
    (error) => ({ error }),
  );
  if (directError.data !== undefined) return directError.data;
  if (!relay) throw directError.error;

  let relayError = null;
  for (const spec of RATE_RELAYS) {
    try {
      const res = await fetchLimited(spec.url(url), {
        redirect: 'follow',
        headers: { accept: 'text/plain, application/json, */*', 'user-agent': BROWSER_UA },
      }, max, timeoutMs);
      if (!res.ok) throw new Error('http_' + res.status);
      const data = JSON.parse(unwrapRelayBody(res.data ? JSON.stringify(res.data) : res.text));
      if (entry) entry.via = spec.name;
      return data;
    } catch (e) { relayError = e; }
  }
  // Report both failures: "the host refused the Worker" and "the relay could not
  // either" are different diagnoses.
  throw new Error(`${str(directError.error?.message || directError.error, 60)} relay: ${str(relayError?.message || relayError, 50)}`);
}

// Iranian trackers serve HTML to browsers; a browser-like identity is sent so a
// default worker user agent is not rejected outright.
async function fetchHtml(url, max = 900 * 1024, { timeoutMs = 6000 } = {}) {
  const res = await fetchLimited(url, {
    redirect: 'follow',
    headers: {
      accept: 'text/html,application/xhtml+xml',
      'accept-language': 'fa-IR,fa;q=0.9,en;q=0.8',
      'user-agent': BROWSER_UA,
    },
  }, max, timeoutMs);
  if (!res.ok) throw new Error('http_' + res.status);
  return res.text;
}

/* Same transport rule as the JSON feeds, for the reference pages: direct first,
 * then a relay when the host is one a Worker egress is likely to be refused by.
 * The relayed body is handed to the same parser as the direct one — every quote
 * still has to pass the unit and range checks before it can enter the table, so
 * a relayed page can never be trusted more than a fetched one. */
async function fetchHtmlSource(url, max = 900 * 1024, { entry, timeoutMs = 6000, relay = relayable(url) } = {}) {
  const direct = await fetchHtml(url, max, { timeoutMs }).then(
    (html) => ({ html }),
    (error) => ({ error }),
  );
  if (direct.html !== undefined) return direct.html;
  if (!relay) throw direct.error;

  let relayError = null;
  for (const spec of RATE_RELAYS) {
    try {
      const res = await fetchLimited(spec.url(url), {
        redirect: 'follow',
        headers: {
          accept: 'text/html, text/plain, */*',
          'accept-language': 'fa-IR,fa;q=0.9,en;q=0.8',
          'user-agent': BROWSER_UA,
          // Ask the relay for the page itself rather than its own summary.
          'x-return-format': 'html',
        },
      }, max, timeoutMs);
      if (!res.ok) throw new Error('http_' + res.status);
      if (entry) entry.via = spec.name;
      return res.text || '';
    } catch (e) { relayError = e; }
  }
  throw new Error(`${str(direct.error?.message || direct.error, 60)} relay: ${str(relayError?.message || relayError, 50)}`);
}

// Hard wall-clock budget per source. Without it a host that accepts the
// connection and then goes quiet would hold the whole refresh (and the Telegram
// update that asked for it) for as long as the Worker is allowed to run.
function withDeadline(work, ms, onTimeout) {
  let timer;
  return Promise.race([
    Promise.resolve(work).finally(() => clearTimeout(timer)),
    new Promise((_, reject) => {
      timer = setTimeout(() => { onTimeout?.(); reject(new Error('timeout')); }, ms);
    }),
  ]);
}

/* Refreshes the whole table. Sources are layered by priority and every one of
 * them is timed and reported in `diagnostics`, so a panel (or the admin) can see
 * which feed is failing instead of only being told that "the market is
 * unreachable". */
export async function getLiveRates(env, options = {}) {
  if (!options.force) {
    const cached = await getJson(env, 'v2:rates:cache');
    if (cached && Date.now() - (cached.at || 0) < 60000) return cached.data;
  }

  const rates = {
    gold: structuredClone(GOLD_DATA),
    fiat: structuredClone(FIAT_DATA),
    crypto: structuredClone(CRYPTO_DATA),
    updatedAt: Date.now(),
    source: 'fallback',
    stale: false,
  };
  const hitsByName = new Map();
  const diagnostics = [];
  const entries = new Map();
  const payloads = {};
  const refs = { worldFx: null };

  // Every source is downloaded in parallel, but parsed strictly in the priority
  // order below. Downloading and parsing in the same task would let a fast (but
  // lower-priority) feed overwrite TGJU's quote, which is exactly the sort of
  // non-determinism that makes a price table impossible to trust. Each download
  // also runs under a wall-clock budget so one silent host cannot hold the whole
  // refresh (and the Telegram update or panel request that asked for it).
  const fetchSource = (name, fn, { reference = false, budget = 9000 } = {}) => {
    const started = Date.now();
    const entry = reference ? { name, kind: 'reference', ok: false, hits: 0, ms: 0 } : { name, ok: false, hits: 0, ms: 0 };
    diagnostics.push(entry);
    entries.set(name, entry);
    return (async () => {
      try {
        payloads[name] = await withDeadline(fn(entry), budget, () => { entry.error = 'timeout'; });
      } catch (e) {
        entry.error = entry.error || str(e?.message || String(e), 120);
      }
      entry.ms = Date.now() - started;
      if (reference) entry.ok = payloads[name] !== undefined;
    })();
  };
  const applySource = (name, parse) => {
    const payload = payloads[name];
    const entry = entries.get(name);
    if (payload === undefined) return 0;
    try {
      const hits = parse(payload) || 0;
      entry.hits = hits;
      entry.ok = hits > 0;
      hitsByName.set(name, hits);
      return hits;
    } catch (e) {
      entry.ok = false;
      entry.error = entry.error || str(e?.message || String(e), 120);
      hitsByName.set(name, 0);
      return 0;
    }
  };

  // ---- Pass 1: download every JSON feed at once. Iranian hosts are relayed when
  // the Worker is refused (see RATE_RELAYS); global feeds are not.
  await Promise.all([
    fetchSource('tgju', async (entry) => {
      const errors = [];
      // The light widget endpoint first: it answers with just the rows this
      // table needs (a few KB) instead of the ~1 MB ajax feed, and it is the one
      // endpoint that is also worth fetching through a relay.
      try {
        const widget = await fetchJson(IRAN_MARKET_SOURCES.tgjuWidget, 256 * 1024, { referer: 'https://www.tgju.org/', entry, timeoutMs: 6000 });
        if (Array.isArray(widget?.response?.indicators)) return widget;
      } catch (e) { errors.push(e?.message || 'widget'); }
      // The mirrors carry the same board; they are only worth a direct attempt
      // (a multi-megabyte feed through a text relay would be wasteful).
      for (const url of IRAN_MARKET_SOURCES.tgju) {
        try {
          const ajax = await fetchJson(url, 3 * 1024 * 1024, { referer: 'https://www.tgju.org/', relay: false, timeoutMs: 6000 });
          if (ajax?.current) return ajax;
        } catch (e) { errors.push(e?.message || 'mirror'); }
      }
      throw new Error(errors[0] || 'tgju_unreachable');
    }, { budget: 13000 }),
    // Bonbast is only fetched when a mirror is configured; without one the feed
    // is left out of the report instead of being shown as a permanent failure.
    ...(IRAN_MARKET_SOURCES.bonbast?.length ? [
      fetchSource('bonbast', (entry) => Promise.any(IRAN_MARKET_SOURCES.bonbast.map(url => fetchJson(url, 256 * 1024, { entry, timeoutMs: 6000 }))), { budget: 13000 }),
    ] : []),
    fetchSource('nobitex', async (entry) => {
      // One request for every pair this table needs…
      try {
        const all = await fetchJson(IRAN_MARKET_SOURCES.nobitex, 256 * 1024, { entry, timeoutMs: 6000 });
        if (all?.stats && Object.keys(all.stats).length) return all;
      } catch { /* one rejected symbol must not cost the whole feed */ }
      // …and if that is rejected, one request per pair: Nobitex answers 400 for
      // the whole batch when a single symbol is not listed, so a delisted symbol
      // has to cost one row instead of the feed.
      const parts = await Promise.all(NOBITEX_PAIRS.map(pair =>
        fetchJson(nobitexUrl([pair]), 64 * 1024, { entry, relay: false, timeoutMs: 4000 }).catch(() => null)));
      const stats = {};
      for (const part of parts) if (part?.stats) Object.assign(stats, part.stats);
      if (!Object.keys(stats).length) throw new Error('nobitex_unreachable');
      return { status: 'ok', stats };
    }, { budget: 13000 }),
    fetchSource('tetherland', (entry) => fetchJson(IRAN_MARKET_SOURCES.tetherland, 128 * 1024, { entry, timeoutMs: 6000 }), { budget: 13000 }),
    fetchSource('swapwallet', (entry) => fetchJson(MARKET_ENDPOINT, 256 * 1024, { entry, timeoutMs: 6000 }), { budget: 13000 }),
    fetchSource('coingecko', (entry) => fetchJson(IRAN_MARKET_SOURCES.coingecko, 256 * 1024, { entry, timeoutMs: 6000 })),
    fetchSource('kraken', (entry) => fetchJson(IRAN_MARKET_SOURCES.kraken, 128 * 1024, { entry, timeoutMs: 6000 })),
    fetchSource('gold-api', (entry) => fetchJson(IRAN_MARKET_SOURCES.goldApi, 64 * 1024, { entry, timeoutMs: 6000 })),
    fetchSource('rate-json', (entry) => Promise.any(IRAN_MARKET_SOURCES.rateJson.map(url => fetchJson(url, 128 * 1024, { entry, timeoutMs: 6000 })))),
    fetchSource('fx', async (entry) => {
      for (const url of IRAN_MARKET_SOURCES.worldFx) {
        try {
          const payload = await fetchJson(url, 256 * 1024, { entry, timeoutMs: 6000 });
          // Both feeds answer "1 USD = x", one nested under `rates`, the other
          // under `usd` (lower-cased codes).
          const raw = payload?.rates || payload?.usd;
          if (raw && typeof raw === 'object') {
            refs.worldFx = Object.fromEntries(Object.entries(raw).map(([code, value]) => [code.toUpperCase(), value]));
            return refs.worldFx;
          }
        } catch { /* try the mirror */ }
      }
      throw new Error('fx_unreachable');
    }, { reference: true }),
  ]);

  // ---- Pass 2: apply them in priority order. Iranian market feeds first, so a
  // quoted TGJU/Nobitex number always beats a global or calculated one.
  applySource('tgju', p => (p?.current ? parseTgju(p, rates) : parseTgjuWidget(p, rates)));
  applySource('bonbast', p => parseBonbast(p, rates));
  applySource('nobitex', p => parseNobitex(p, rates));
  applySource('tetherland', p => parseTetherland(p, rates));
  applySource('swapwallet', p => parseSwapwallet(p, rates));
  applySource('coingecko', p => parseCoingecko(p, rates, rates.crypto.usdt.priceToman));
  applySource('kraken', p => parseKraken(p, rates));
  applySource('gold-api', p => parseGoldApi(p, rates));
  applySource('rate-json', p => parseRateJson(p, rates));

  // ---- Pass 3: the public Iranian trackers. Their pages are heavy, so they are
  // only downloaded when the JSON feeds left rows they can actually fill, and
  // they are applied in a fixed order (first site wins a row).
  const trackedKeys = [
    ['gold', ['gold18', 'gold24', 'mesghal', 'emami', 'bahar', 'nim', 'rob', 'gerami', 'ounce']],
    ['fiat', ['usd', 'eur', 'aed', 'gbp', 'try', 'iqd', 'cny', 'cad']],
    ['crypto', ['usdt', 'btc', 'eth', 'ton', 'trx', 'sol', 'not']],
  ];
  const gapsLeft = trackedKeys.some(([cat, keys]) => keys.some(k => !rates[cat]?.[k]?._live));
  if (gapsLeft) {
    const sites = Object.entries(IRAN_MARKET_HTML_SOURCES).map(([name, cfg]) => {
      const entry = { name, ok: false, hits: 0, ms: 0 };
      diagnostics.push(entry);
      return { name, cfg, entry, started: Date.now(), html: '' };
    });
    await withDeadline(Promise.all(sites.map(async (site) => {
      try { site.html = await fetchHtmlSource(site.cfg.url, undefined, { entry: site.entry, timeoutMs: 5000 }); } catch (e) { site.entry.error = str(e?.message || String(e), 120); }
      site.entry.ms = Date.now() - site.started;
    })), 11000, () => {
      // The pages are heavy and are the last fallback, so the pass as a whole is
      // bounded: a site that is still silent at the deadline is reported as such
      // instead of holding the refresh (and the Telegram update behind it).
      for (const site of sites)
        if (!site.html && !site.entry.ms) { site.entry.ms = Date.now() - site.started; site.entry.error = site.entry.error || 'timeout'; }
    }).catch(() => {});
    for (const site of sites) {
      if (!site.html) { hitsByName.set(site.name, 0); continue; }
      const hits = applySiteQuotes(rates, parseIranSiteHtml(site.html, site.name));
      site.entry.hits = hits;
      site.entry.ok = hits > 0;
      hitsByName.set(site.name, hits);
    }
  }

  // ---- Pass 4: calculate the rows nobody answered from the live references of
  // this refresh (never from a stale snapshot).
  const usdToman = rates.fiat.usd._live ? rates.fiat.usd.price
    : rates.crypto.usdt._live ? rates.crypto.usdt.priceToman : 0;
  const xauUsd = rates.gold.ounce._live ? rates.gold.ounce.price : 0;
  const derived = deriveQuotes(rates, { usdToman, xauUsd, worldFx: refs.worldFx });

  // Anchor every coin's USD leg to the live USDT/Toman rate so the table stays
  // internally consistent with the market it quotes.
  const liveUsdt = rates.crypto.usdt._live ? rates.crypto.usdt.priceToman : 0;
  if (liveUsdt > 1000) {
    for (const [key, item] of Object.entries(rates.crypto)) {
      if (key !== 'usdt' && item._live && item.priceToman > 0)
        item.priceUsd = Math.round((item.priceToman / liveUsdt) * 10000) / 10000;
    }
    rates.crypto.usdt.priceUsd = 1;
  }
  clearLiveFlags(rates);

  // Deterministic source line, in priority order.
  const parts = ['tgju', 'bonbast', 'nobitex', 'tetherland', 'swapwallet', 'coingecko', 'kraken', 'gold-api', 'rate-json', 'alanchand', 'moj3', 'isignal']
    .filter(name => (hitsByName.get(name) || 0) > 0);
  const totalHits = [...hitsByName.values()].reduce((a, b) => a + b, 0);
  rates.diagnostics = diagnostics;
  rates.derived = derived;

  if (totalHits > 0) {
    if (derived) parts.push('derived');
    rates.source = parts.join('+');
    rates.updatedAt = Date.now();
    await putJson(env, 'v2:rates:lastgood', { at: Date.now(), data: rates }, { ttl: 7 * 86400 });
  } else {
    // Every source failed: serve the last good snapshot when one exists, and
    // say so openly instead of pretending the static table is live. The failed
    // attempt's diagnostics travel with it, so the cause stays visible.
    const lastGood = await getJson(env, 'v2:rates:lastgood');
    if (lastGood?.data) {
      const snapshot = { ...lastGood.data, stale: true, derived: lastGood.data.derived || 0, diagnostics };
      await putJson(env, 'v2:rates:cache', { at: Date.now(), data: snapshot }, { ttl: 300 });
      return snapshot;
    }
    rates.source = 'fallback';
    rates.stale = true;
    rates.offline = true;
  }

  await putJson(env, 'v2:rates:cache', { at: Date.now(), data: rates }, { ttl: 300 });
  return rates;
}

/* One-line-per-feed status report, shared by the admin bot and the panel's
 * «بررسی منابع نرخ» button: which feed answered, with how many quotes, how fast
 * and — when it failed — with which error. This is what turns a bare
 * «اتصال ناموفق» into an actionable diagnosis. */
export function ratesSourcesText(rates, lang = 'fa') {
  const list = rates?.diagnostics || [];
  const ok = list.filter(s => s.ok).length;
  const lines = [
    `🔌 ${tr('وضعیت منابع نرخ', 'Rate source status', lang)}`,
    `${ok}/${list.length} ${tr('منبع پاسخ داد', 'sources answered', lang)}`,
    '────────────────────',
  ];
  for (const s of list) {
    const label = RATE_SOURCE_LABELS[s.name]
      ? tr(RATE_SOURCE_LABELS[s.name].fa, RATE_SOURCE_LABELS[s.name].en, lang)
      : s.name;
    const mark = s.ok ? `✅ ${s.hits}` : '❌';
    const via = s.via ? ` · ${tr('رله', 'relay', lang)}: ${s.via}` : '';
    const why = s.ok ? '' : ` — ${s.error || 'failed'}`;
    lines.push(`${mark} ${label}${via}${s.ms ? ` (${s.ms}ms)` : ''}${why}`);
  }
  lines.push('────────────────────', ratesSourceLine(rates, lang));
  return lines.join('\n');
}

export function ratesSourceLine(rates, lang = 'fa') {
  if (rates?.stale)
    return tr('آخرین نرخ ذخیره‌شده (اتصال به بازار برقرار نشد)', 'Last saved rates (market unreachable)', lang);
  if (rates?.derived)
    return tr('نرخ زنده بازار ایران (بخشی محاسبه‌شده)', 'Live Iran market rates (partly calculated)', lang);
  return tr('نرخ زنده بازار ایران', 'Live Iran market rates', lang);
}

export function formatDateTime(now = Date.now()) {
  const time = new Intl.DateTimeFormat('fa-IR', { timeZone: 'Asia/Tehran', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(now));
  const date = new Intl.DateTimeFormat('fa-IR', { timeZone: 'Asia/Tehran', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(now));
  return { time, date };
}

export async function ratesHome(env, token, user, lang = 'fa') {
  const data = await getLiveRates(env);
  const { time, date } = formatDateTime(data.updatedAt);

  let text = `📈 ${tr('قیمت لحظه‌ای طلا، ارز و رمزارزها', 'Live Gold, Currency & Crypto Rates', lang)}\n` +
    `⏰ ${tr('ساعت بروزرسانی', 'Updated at', lang)}: ${time} · ${date}\n` +
    `────────────────────\n` +
    `🪙 ${tr('طلای ۱۸ عیار', '18K Gold', lang)}: ${fmtMoney(data.gold.gold18.price, lang)} ${tr('تومان', 'Toman', lang)} (${trendIcon(data.gold.gold18.change)}${data.gold.gold18.change}%)\n` +
    `🥇 ${tr('سکه امامی', 'Emami Coin', lang)}: ${fmtMoney(data.gold.emami.price, lang)} ${tr('تومان', 'Toman', lang)} (${trendIcon(data.gold.emami.change)}${data.gold.emami.change}%)\n` +
    `💵 ${tr('دلار آمریکا', 'US Dollar', lang)}: ${fmtMoney(data.fiat.usd.price, lang)} ${tr('تومان', 'Toman', lang)} (${trendIcon(data.fiat.usd.change)}${data.fiat.usd.change}%)\n` +
    `💶 ${tr('یورو', 'Euro', lang)}: ${fmtMoney(data.fiat.eur.price, lang)} ${tr('تومان', 'Toman', lang)} (${trendIcon(data.fiat.eur.change)}${data.fiat.eur.change}%)\n` +
    `💎 ${tr('تتر', 'Tether USDT', lang)}: ${fmtMoney(data.crypto.usdt.priceToman, lang)} ${tr('تومان', 'Toman', lang)} (${trendIcon(data.crypto.usdt.change)}${data.crypto.usdt.change}%)\n` +
    `₿ ${tr('بیت‌کوین', 'Bitcoin', lang)}: $${fmtMoney(data.crypto.btc.priceUsd, lang)} (${trendIcon(data.crypto.btc.change)}${data.crypto.btc.change}%)\n` +
    `────────────────────\n` +
    `${data.stale ? '⚠️' : '✅'} ${ratesSourceLine(data, lang)}\n` +
    `${tr('برای مشاهده لیست کامل و جزئیات هر بخش دکمه مورد نظر را انتخاب کنید:', 'Select a section below for full details:', lang)}`;

  const rows = [
    [
      { text: '🪙 ' + tr('طلا و انواع سکه', 'Gold & Coins', lang), callback_data: 'rates:gold' },
      { text: '💵 ' + tr('ارزهای بازار آزاد', 'Fiat Currencies', lang), callback_data: 'rates:fiat' },
    ],
    [
      { text: '💎 ' + tr('رمزارزها و تتر', 'Cryptocurrencies', lang), callback_data: 'rates:crypto' },
      { text: '🔄 ' + tr('بروزرسانی', 'Refresh', lang), callback_data: 'rates:refresh' },
    ],
    [
      { text: '🔙 ' + tr('بازگشت به منوی اصلی', 'Back to main menu', lang), callback_data: 'sub:root' },
    ],
  ];

  return sendToUser(token, user.id, text, { reply_markup: { inline_keyboard: rows } });
}

export async function ratesCategory(env, token, user, lang = 'fa', cat = 'gold') {
  const data = await getLiveRates(env);
  const { time, date } = formatDateTime(data.updatedAt);
  let title = '', items = {}, unitDefault = tr('تومان', 'Toman', lang);

  if (cat === 'gold') {
    title = '🪙 ' + tr('قیمت طلا و انواع سکه', 'Gold & Coins Price Table', lang);
    items = data.gold;
  } else if (cat === 'fiat') {
    title = '💵 ' + tr('قیمت ارزهای بازار آزاد', 'Fiat Currency Rates', lang);
    items = data.fiat;
  } else {
    title = '💎 ' + tr('قیمت ارزهای دیجیتال و تتر', 'Crypto & Stablecoins', lang);
    items = data.crypto;
  }

  let text = `${title}\n⏰ ${time} · ${date}\n────────────────────\n`;
  for (const [key, item] of Object.entries(items)) {
    const name = lang === 'en' ? item.en : item.fa;
    const priceStr = item.isUsd ? `$${fmtMoney(item.price, lang)}` : `${fmtMoney(item.priceToman || item.price, lang)} ${unitDefault}`;
    text += `▫️ ${name}:\n  💰 ${priceStr} | ${trendIcon(item.change)}${item.change}%\n  📊 ${tr('بالاترین', 'High', lang)}: ${fmtMoney(item.high, lang)} | ${tr('پایین‌ترین', 'Low', lang)}: ${fmtMoney(item.low, lang)}\n\n`;
  }
  text += `────────────────────\n${data.stale ? '⚠️' : '✅'} ${ratesSourceLine(data, lang)}`;

  const rows = [
    [
      { text: '🪙 ' + tr('طلا و سکه', 'Gold', lang), callback_data: 'rates:gold' },
      { text: '💵 ' + tr('ارزها', 'Currencies', lang), callback_data: 'rates:fiat' },
      { text: '💎 ' + tr('کریپتو', 'Crypto', lang), callback_data: 'rates:crypto' },
    ],
    [
      { text: '🔄 ' + tr('بروزرسانی جدول', 'Refresh', lang), callback_data: `rates:${cat}` },
      { text: '🔙 ' + tr('بازگشت به نرخ‌ها', 'Back to rates', lang), callback_data: 'rates:home' },
    ],
    [
      { text: '🔙 ' + tr('بازگشت به منوی اصلی', 'Back to main menu', lang), callback_data: 'sub:root' },
    ],
  ];

  return sendToUser(token, user.id, text.slice(0, 4096), { reply_markup: { inline_keyboard: rows } });
}

export async function ratesCallback(env, token, user, lang, data) {
  if (!data.startsWith('rates:')) return false;
  const action = data.slice(6);
  if (action === 'home' || action === 'refresh') {
    await ratesHome(env, token, user, lang);
    return true;
  }
  if (['gold', 'fiat', 'crypto'].includes(action)) {
    await ratesCategory(env, token, user, lang, action);
    return true;
  }
  return false;
}

/* ============ Scheduled rate delivery to a channel/group ============
 * The administrator picks which asset family (gold / currencies / crypto, or all
 * three) and a daily Tehran time; the cron tick publishes the table at that time. */
export async function liveRatesDigestText(env, category = 'all', lang = 'fa') {
  const data = await getLiveRates(env);
  const { time, date } = formatDateTime(data.updatedAt);
  const name = (k) => (lang === 'en' ? RATES_CATEGORIES[k].en : RATES_CATEGORIES[k].fa);
  const lines = [`📈 ${tr('جدول قیمت‌های لحظه‌ای', 'Live price table', lang)}\n🕐 ${time} · ${date}\n${data.stale ? '⚠️' : '✅'} ${ratesSourceLine(data, lang)}\n────────────────────`];
  const cats = category === 'all' ? ['gold', 'fiat', 'crypto'] : [category];
  const table = { gold: data.gold, fiat: data.fiat, crypto: data.crypto };
  for (const k of cats) {
    const items = table[k];
    if (!items) continue;
    lines.push(`\n${name(k)}`);
    const keys = k === 'gold' ? ['gold18', 'gold24', 'emami', 'bahar'] : k === 'fiat' ? ['usd', 'eur', 'aed', 'gbp', 'try'] : ['usdt', 'btc', 'eth', 'ton'];
    for (const key of keys) {
      const item = items[key];
      if (!item) continue;
      const priceStr = item.isUsd ? `$${fmtMoney(item.price, lang)}` : k === 'crypto' ? `${fmtMoney(item.priceToman, lang)} ${tr('تومان', 'Toman', lang)}` : `${fmtMoney(item.price, lang)} ${tr('تومان', 'Toman', lang)}`;
      lines.push(`• ${lang === 'en' ? item.en : item.fa}: ${priceStr} (${item.change > 0 ? '🟢 +📈' : item.change < 0 ? '🔴 -' : '⚪'} ${Math.abs(item.change)}%)`);
    }
  }
  lines.push('\n────────────────────');
  return lines.join('\n');
}

export async function ratesDestinations(env, override = []) {
  const list = (Array.isArray(override) && override.length ? override : (await getSettings(env)).rates?.autoSend?.destinations || [])
    .map(d => typeof d === 'string' ? { chatId: d, title: '' } : d)
    .filter(d => d.chatId && isChatId(d.chatId));
  return list.slice(0, 10);
}

export async function sendRatesNow(env, { category = 'all', destinations = [] } = {}) {
  const token = await resolveToken(env);
  assert(token, 'token_missing');
  const targets = await ratesDestinations(env, destinations);
  assert(targets.length, 'invalid_destinations');
  const text = (await liveRatesDigestText(env, category)).slice(0, 4096);
  const results = [];
  for (const d of targets) {
    const res = await sendToUser(token, d.chatId, text, { disable_web_page_preview: true });
    results.push({ chatId: d.chatId, title: d.title || '', ok: !!res.ok, error: res.ok ? '' : str(res.description || '', 160) });
  }
  return { category, sent: results.filter(r => r.ok).length, failed: results.filter(r => !r.ok).length, results };
}

const RATES_STATE_KEY = 'v2:rates:state';
export async function ratesTick(env) {
  const settings = await getSettings(env);
  const cfg = settings.rates?.autoSend;
  const moduleOn = enabled(settings, 'catalog') || settings.botPurpose === 'rates' || settings.botPurpose === 'custom';
  if (!moduleOn && !cfg?.enabled) return;

  // Warm the one-minute cache before anyone asks for it. The panel's live table
  // and the bot's «نرخها» menu then answer from a fresh snapshot in a few
  // milliseconds instead of waiting for ten feeds (and, when a feed is slow, the
  // Telegram update no longer risks the delivery deadline).
  await getLiveRates(env).catch(() => {});

  if (!cfg?.enabled || !cfg.time || !isValidTime(cfg.time) || !cfg.destinations?.length) return;
  const token = await resolveToken(env);
  if (!token) return;
  const state = (await getJson(env, RATES_STATE_KEY)) || { lastDay: '', lastAt: 0 };
  const now = Date.now();
  const today = tehranDate(now);
  if (state.lastDay === today) return;
  if (now < tehranTodayAt(cfg.time, now)) return;
  const category = RATES_SEND_CATS.includes(cfg.category) ? cfg.category : 'all';
  const text = (await liveRatesDigestText(env, category)).slice(0, 4096);
  for (const d of cfg.destinations.slice(0, 10)) {
    if (!isChatId(d.chatId)) continue;
    const res = await sendToUser(token, d.chatId, text, { disable_web_page_preview: true });
    if (!res.ok && res.description) state.lastError = str(res.description, 160);
  }
  state.lastDay = today;
  state.lastAt = now;
  await putJson(env, RATES_STATE_KEY, state);
}
