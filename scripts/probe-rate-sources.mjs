#!/usr/bin/env node
/* Live probe of every market source the rates module knows about.
 *
 * The Worker can only be as fresh as the feeds its egress reaches, and that
 * reachability differs per network (a developer machine, GitHub's runners and
 * Cloudflare's edge do not see the same internet). This script fetches every
 * configured endpoint exactly the way src/rates.js does — browser user agent,
 * redirects followed, 15 s timeout — runs the module's real parsers on whatever
 * comes back in the module's own priority order, and prints which feed answered
 * with how many quotes plus the table those answers produce.
 *
 *   node scripts/probe-rate-sources.mjs            # human report
 *   node scripts/probe-rate-sources.mjs --json out.json
 *
 * The exit code is always 0: a blocked host is a finding, not a crash.
 */
import { writeFileSync } from 'node:fs';
import { MARKET_ENDPOINT } from '../src/services/rates.js';
import {
  CRYPTO_DATA, FIAT_DATA, GOLD_DATA, IRAN_MARKET_HTML_SOURCES, IRAN_MARKET_SOURCES,
  RATE_RELAYS, TGJU_WIDGET_KEYS, applySiteQuotes, deriveQuotes, parseBonbast,
  parseCoingecko, parseGoldApi, parseIranSiteHtml, parseKraken, parseNobitex,
  parseRateJson, parseSwapwallet, parseTetherland, parseTgju, parseTgjuWidget,
  unwrapRelayBody,
} from '../src/rates.js';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const TIMEOUT = 15000;
const MAX = 3 * 1024 * 1024;

const base = () => ({
  gold: structuredClone(GOLD_DATA),
  fiat: structuredClone(FIAT_DATA),
  crypto: structuredClone(CRYPTO_DATA),
});

async function load(url, { referer, json = true } = {}) {
  const started = Date.now();
  const res = await fetch(url, {
    redirect: 'follow',
    signal: AbortSignal.timeout(TIMEOUT),
    headers: {
      accept: json ? 'application/json, text/plain, */*' : 'text/html,application/xhtml+xml',
      'accept-language': 'fa-IR,fa;q=0.9,en;q=0.8',
      'user-agent': UA,
      ...(referer ? { referer } : {}),
    },
  });
  const text = await res.text();
  const meta = { url, status: res.status, ms: Date.now() - started, bytes: text.length };
  if (!res.ok) throw Object.assign(new Error('http_' + res.status), meta);
  if (text.length > MAX) throw Object.assign(new Error('too_large'), meta);
  return { ...meta, data: json ? JSON.parse(text) : text };
}

const attempts = [];
async function download(name, url, { json = true, referer } = {}) {
  const row = { name, url, ok: false, status: 0, ms: 0, bytes: 0, error: '', payload: null };
  attempts.push(row);
  try {
    const res = await load(url, { json, referer });
    Object.assign(row, { ok: true, status: res.status, ms: res.ms, bytes: res.bytes, payload: res.data });
  } catch (e) {
    Object.assign(row, { status: e.status || 0, ms: e.ms || 0, bytes: e.bytes || 0, error: e.message || String(e) });
  }
  console.log(`${row.ok ? 'OK  ' : 'FAIL'} ${name.padEnd(16)} ${url.slice(0, 72)} ${String(row.status).padStart(3)} ${String(row.bytes).padStart(9)}B ${String(row.ms).padStart(6)}ms ${row.ok ? '' : row.error}`);
  return row;
}

console.log(`# rates source probe · ${new Date().toISOString()}`);
console.log(`# node ${process.version} · ${TGJU_WIDGET_KEYS.length} tgju widget keys\n`);

// ---- Download everything the runner can reach (mirrors the Worker's pass 1).
const feeds = {};
feeds['tgju:widget'] = await download('tgju:widget', IRAN_MARKET_SOURCES.tgjuWidget, { referer: 'https://www.tgju.org/' });
for (let i = 0; i < IRAN_MARKET_SOURCES.tgju.length; i++)
  feeds['tgju:ajax' + (i || '')] = await download('tgju:ajax' + (i || ''), IRAN_MARKET_SOURCES.tgju[i], { referer: 'https://www.tgju.org/' });
for (let i = 0; i < (IRAN_MARKET_SOURCES.bonbast?.length || 0); i++)
  feeds['bonbast' + (i || '')] = await download('bonbast' + (i || ''), IRAN_MARKET_SOURCES.bonbast[i]);
feeds.nobitex = await download('nobitex', IRAN_MARKET_SOURCES.nobitex);
feeds.tetherland = await download('tetherland', IRAN_MARKET_SOURCES.tetherland);
feeds.swapwallet = await download('swapwallet', MARKET_ENDPOINT);
feeds.coingecko = await download('coingecko', IRAN_MARKET_SOURCES.coingecko);
feeds.kraken = await download('kraken', IRAN_MARKET_SOURCES.kraken);
feeds.goldApi = await download('gold-api', IRAN_MARKET_SOURCES.goldApi);
for (let i = 0; i < IRAN_MARKET_SOURCES.rateJson.length; i++)
  feeds['rate-json' + (i || '')] = await download('rate-json' + (i || ''), IRAN_MARKET_SOURCES.rateJson[i]);
for (let i = 0; i < IRAN_MARKET_SOURCES.worldFx.length; i++)
  feeds['world-fx' + (i || '')] = await download('world-fx' + (i || ''), IRAN_MARKET_SOURCES.worldFx[i]);
for (const [name, cfg] of Object.entries(IRAN_MARKET_HTML_SOURCES))
  feeds['tracker:' + name] = await download('tracker:' + name, cfg.url, { json: false });

// ---- The relay path: a host that refuses this network may still answer
// through the read-through relay the Worker falls back to.
const RELAYABLE = ['tgju.org', 'nobitex.ir', 'tetherland.com', 'swapwallet.app', 'bonbast', 'ramzinex.com', 'wallex.ir', 'bitpin.', 'alanchand.com', 'moj3.ir', 'isignal.ir'];
const spec = RATE_RELAYS[0];
const relayTargets = Object.entries(feeds).filter(([, row]) => !row.ok && RELAYABLE.some(h => row.url.includes(h)));
if (relayTargets.length) {
  console.log(`\n# relay (${spec.name}) for the feeds this network could not reach directly`);
  for (const [key, row] of relayTargets) {
    const asHtml = key.startsWith('tracker:');
    const probe = await download(key + ':relay', spec.url(row.url), { json: !asHtml });
    if (probe.ok && !asHtml) {
      // The relay wraps its body in a short preamble, exactly as the Worker
      // unwraps it before parsing.
      try { probe.payload = JSON.parse(unwrapRelayBody(typeof probe.payload === 'string' ? probe.payload : JSON.stringify(probe.payload))); }
      catch (e) { probe.ok = false; probe.error = 'unwrap: ' + e.message; }
    }
  }
}

// ---- Apply them in the Worker's priority order, against one rates object.
const rates = base();
const hitsByName = new Map();
const refs = { worldFx: null };
const firstPayload = (prefix) => Object.entries(feeds).find(([k, v]) => k.startsWith(prefix) && v.ok)?.[1].payload;

const apply = (name, parse, payload) => {
  if (!payload) { hitsByName.set(name, 0); return 0; }
  let hits = 0;
  try { hits = parse(payload, rates) || 0; } catch (e) { console.log(`# parse error in ${name}: ${e.message}`); }
  hitsByName.set(name, hits);
  return hits;
};

const widget = firstPayload('tgju:widget');
const ajax = firstPayload('tgju:ajax');
apply('tgju', (p, r) => (p?.current ? parseTgju(p, r) : parseTgjuWidget(p, r)), ajax?.current ? ajax : widget);
apply('bonbast', parseBonbast, firstPayload('bonbast'));
apply('nobitex', parseNobitex, firstPayload('nobitex'));
apply('tetherland', parseTetherland, firstPayload('tetherland'));
apply('swapwallet', parseSwapwallet, firstPayload('swapwallet'));
apply('coingecko', (p, r) => parseCoingecko(p, r, r.crypto.usdt.priceToman), firstPayload('coingecko'));
apply('kraken', parseKraken, firstPayload('kraken'));
apply('gold-api', parseGoldApi, firstPayload('gold-api'));
apply('rate-json', parseRateJson, firstPayload('rate-json'));
const fxPayload = firstPayload('world-fx');
if (fxPayload) {
  const raw = fxPayload?.rates || fxPayload?.usd;
  if (raw && typeof raw === 'object') refs.worldFx = Object.fromEntries(Object.entries(raw).map(([c, v]) => [c.toUpperCase(), v]));
}
for (const name of Object.keys(IRAN_MARKET_HTML_SOURCES)) {
  const payload = feeds['tracker:' + name]?.payload;
  apply(name, (html, r) => applySiteQuotes(r, parseIranSiteHtml(html, name)), payload);
}

// ---- Same derivation pass as the Worker.
const usdToman = rates.fiat.usd._live ? rates.fiat.usd.price
  : rates.crypto.usdt._live ? rates.crypto.usdt.priceToman : 0;
const xauUsd = rates.gold.ounce._live ? rates.gold.ounce.price : 0;
const derived = deriveQuotes(rates, { usdToman, xauUsd, worldFx: refs.worldFx });
const liveUsdt = rates.crypto.usdt._live ? rates.crypto.usdt.priceToman : 0;
if (liveUsdt > 1000) {
  for (const [key, item] of Object.entries(rates.crypto)) {
    if (key !== 'usdt' && item._live && item.priceToman > 0)
      item.priceUsd = Math.round((item.priceToman / liveUsdt) * 10000) / 10000;
  }
  rates.crypto.usdt.priceUsd = 1;
}

const source = Object.keys(IRAN_MARKET_SOURCES)
  .concat(Object.keys(IRAN_MARKET_HTML_SOURCES))
  .filter((name, i, all) => hitsByName.get(name) > 0 && all.indexOf(name) === i);
const totalHits = [...hitsByName.values()].reduce((a, b) => a + b, 0);
const report = {
  at: Date.now(),
  totalHits,
  source: totalHits ? source.join('+') + (derived ? '+derived' : '') : 'fallback',
  stale: totalHits === 0,
  derived,
  hits: Object.fromEntries([...hitsByName.entries()]),
  unreachable: attempts.filter(a => !a.ok).map(a => `${a.name}:${a.error || 'http_' + a.status}`),
  table: {
    gold18: rates.gold.gold18.price,
    gold24: rates.gold.gold24.price,
    mesghal: rates.gold.mesghal.price,
    emami: rates.gold.emami.price,
    nim: rates.gold.nim.price,
    rob: rates.gold.rob.price,
    ounce: rates.gold.ounce.price,
    usd: rates.fiat.usd.price,
    eur: rates.fiat.eur.price,
    aed: rates.fiat.aed.price,
    gbp: rates.fiat.gbp.price,
    iqd: rates.fiat.iqd.price,
    cad: rates.fiat.cad.price,
    usdt: rates.crypto.usdt.priceToman,
    btc: rates.crypto.btc.priceToman,
    btcUsd: rates.crypto.btc.priceUsd,
    eth: rates.crypto.eth.priceToman,
    ton: rates.crypto.ton.priceToman,
    trx: rates.crypto.trx.priceToman,
    sol: rates.crypto.sol.priceToman,
  },
};

console.log(`\n# hits: ${totalHits ? Object.entries(report.hits).filter(([, v]) => v > 0).map(([k, v]) => k + '=' + v).join(' ') : 'none'}`);
console.log(`# source: ${report.source}${report.stale ? ' (stale: every feed failed)' : ''}`);
console.log('# table: ' + JSON.stringify(report.table));
if (report.unreachable.length) console.log('# unreachable: ' + report.unreachable.join(' '));

const outFlag = process.argv.indexOf('--json');
if (outFlag > -1 && process.argv[outFlag + 1]) {
  writeFileSync(process.argv[outFlag + 1], JSON.stringify({ ...report, attempts: attempts.map(({ payload, ...rest }) => rest) }, null, 2));
  console.log(`# wrote ${process.argv[outFlag + 1]}`);
}
