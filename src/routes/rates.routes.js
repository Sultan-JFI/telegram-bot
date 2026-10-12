import { Hono } from 'hono';
import { requireAuth } from '../auth.js';
import { getSettings, saveSettings, getJson } from '../kv.js';
import { patchV2Settings, enabled, assert } from '../config.js';
import { RATES_SEND_CATS, RATES_CATEGORIES, liveRatesDigestText, sendRatesNow, ratesDestinations, getLiveRates, IRAN_MARKET_SOURCES, RATE_SOURCE_LABELS } from '../rates.js';
import { readJson } from '../body.js';

const r = new Hono();
r.use('*', requireAuth);

const result = (c, data) => c.json({ ok: true, data });
// The rates tables belong to the rates-purpose bot and to every custom bot.
const allowed = (settings) => enabled(settings, 'catalog') || settings.botPurpose === 'rates' || settings.botPurpose === 'custom';

r.get('/', async (c) => {
  const settings = await getSettings(c.env);
  const state = await getJson(c.env, 'v2:rates:state', {});
  return result(c, {
    categories: RATES_CATEGORIES,
    keys: RATES_SEND_CATS,
    rates: settings.rates,
    moduleEnabled: allowed(settings),
    lastAt: state.lastAt || 0,
    lastError: state.lastError || '',
  });
});

r.put('/settings', async (c) => {
  const settings = await getSettings(c.env);
  assert(allowed(settings), 'module_disabled', 403);
  patchV2Settings(settings, { rates: await readJson(c) });
  await saveSettings(c.env, settings);
  return result(c, { rates: settings.rates });
});

r.get('/preview', async (c) => {
  const category = RATES_SEND_CATS.includes(c.req.query('category')) ? c.req.query('category') : 'all';
  return result(c, { category, text: await liveRatesDigestText(c.env, category) });
});

// Structured live table so the panel can show the same Iran-market numbers
// the bot publishes, together with their source and freshness.
r.get('/live', async (c) => {
  const rates = await getLiveRates(c.env);
  return result(c, {
    updatedAt: rates.updatedAt,
    source: rates.source,
    stale: !!rates.stale,
    offline: !!rates.offline,
    derived: rates.derived || 0,
    diagnostics: rates.diagnostics || [],
    labels: RATE_SOURCE_LABELS,
    gold: rates.gold,
    fiat: rates.fiat,
    crypto: rates.crypto,
  });
});

// Which feeds answered and which ones failed, with the reason and the latency.
// This is the endpoint behind the panel's «بررسی منابع» button: instead of a
// single «اتصال ناموفق» badge the owner can see that, say, TGJU is blocked while
// the global feeds are filling the table.
r.get('/sources', async (c) => {
  const rates = await getLiveRates(c.env, { force: true });
  return result(c, {
    updatedAt: rates.updatedAt,
    source: rates.source,
    stale: !!rates.stale,
    offline: !!rates.offline,
    derived: rates.derived || 0,
    labels: RATE_SOURCE_LABELS,
    endpoints: {
      tgjuWidget: IRAN_MARKET_SOURCES.tgjuWidget,
      tgju: IRAN_MARKET_SOURCES.tgju,
      nobitex: IRAN_MARKET_SOURCES.nobitex,
      tetherland: IRAN_MARKET_SOURCES.tetherland,
      coingecko: IRAN_MARKET_SOURCES.coingecko,
      kraken: IRAN_MARKET_SOURCES.kraken,
      goldApi: IRAN_MARKET_SOURCES.goldApi,
    },
    sources: rates.diagnostics || [],
  });
});

r.post('/send', async (c) => {
  const settings = await getSettings(c.env);
  assert(allowed(settings), 'module_disabled', 403);
  const body = await readJson(c);
  const category = RATES_SEND_CATS.includes(body.category) ? body.category : 'all';
  const destinations = await ratesDestinations(c.env, Array.isArray(body.destinations) ? body.destinations : []);
  assert(destinations.length, 'invalid_destinations');
  const out = await sendRatesNow(c.env, { category, destinations });
  return result(c, out);
});

export default r;
