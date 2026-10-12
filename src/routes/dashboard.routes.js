
import { Hono } from 'hono';
import { requireAuth } from '../auth.js';
import { getStats, getRecentUsers } from '../kv.js';
import { resolveToken, tgApi } from '../bot-api.js';
import { withTimeout } from '../telegram.js';
import { getLogs, clearLogs } from '../runtime-log.js';

const r = new Hono();
r.use('*', requireAuth);

r.get('/stats', async (c) => {
  const env = c.env;
  const empty = { users: 0, banned: 0, messages: 0, broadcasts: 0, sent: 0 };

  let stats = empty, recentUsers = [];
  try {
    [stats, recentUsers] = await Promise.all([getStats(env), getRecentUsers(env)]);
  } catch (e) {
    console.error('[dashboard] stats read failed', e.name);
    stats = empty; recentUsers = [];
  }

  let webhook = { configured: false };
  try {
    const token = await resolveToken(env);
    if (token) {
      const info = await withTimeout(tgApi(token, 'getWebhookInfo'), 6000, null);
      if (info && info.ok && info.result) {
        webhook = {
          configured: !!info.result.url,
          url: info.result.url || '',
          pending: info.result.pending_update_count || 0,
          lastError: info.result.last_error_message || '',
          lastErrorDate: info.result.last_error_date || 0,
        };
      } else if (info) {
        webhook = { configured: true, error: info.description || 'splus_error' };
      } else {
        webhook = { configured: true, error: 'timeout' };
      }
    }
  } catch (e) {
    webhook = { configured: true, error: e.message || 'splus_error' };
  }

  return c.json({
    ok: true,
    data: { stats, recentUsers, webhook, version: env.APP_VERSION || '-', ts: Date.now() },
  });
});

/** Recent runtime logs for the admin panel (KV ring buffer). */
r.get('/logs', async (c) => {
  const limit = Math.min(100, Math.max(1, Number(c.req.query('limit')) || 50));
  const logs = await getLogs(c.env, limit);
  return c.json({ ok: true, data: { logs, count: logs.length } });
});

r.delete('/logs', async (c) => {
  await clearLogs(c.env);
  return c.json({ ok: true, data: { cleared: true } });
});

export default r;
