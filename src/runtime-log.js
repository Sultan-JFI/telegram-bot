/**
 * Small ring-buffer of recent worker events for the admin panel.
 * Stored in KV so it survives across isolates (best-effort, not a full log shipper).
 */
const KEY = 'v2:runtime:logs';
const MAX = 80;

export async function pushLog(env, level, message, extra = {}) {
  try {
    if (!env?.BOT_KV) return;
    const row = {
      at: Date.now(),
      level: String(level || 'info').slice(0, 16),
      message: String(message || '').slice(0, 500),
      ...Object.fromEntries(
        Object.entries(extra || {}).map(([k, v]) => [k, typeof v === 'string' ? v.slice(0, 200) : v]),
      ),
    };
    const prev = await env.BOT_KV.get(KEY);
    let list = [];
    if (prev) {
      try { list = JSON.parse(prev); } catch { list = []; }
    }
    if (!Array.isArray(list)) list = [];
    list.unshift(row);
    await env.BOT_KV.put(KEY, JSON.stringify(list.slice(0, MAX)));
  } catch {
    // never break request path for logging
  }
}

export async function getLogs(env, limit = 50) {
  try {
    const raw = await env.BOT_KV.get(KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list.slice(0, Math.min(100, Math.max(1, limit))) : [];
  } catch {
    return [];
  }
}

export async function clearLogs(env) {
  try { await env.BOT_KV.delete(KEY); } catch {}
}
