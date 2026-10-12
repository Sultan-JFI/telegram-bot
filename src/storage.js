// A SQLite-backed KV-compatible store. Legacy BOT_KV is imported read-only.
// All requests that mutate this store are serialized by BotCoordinator.
//
// Every statement here must stay an index lookup or a narrow index range. Cloudflare bills
// SQLite-backed Durable Objects per row *scanned* ("rows read"), and the Workers Free plan
// allows 5,000,000 of them per day; when that budget is spent, every SELECT in the object
// throws until 00:00 UTC — the whole panel and the bot then answer `internal_error`. The
// background tick lists a dozen prefixes twice a minute, so a listing that walks the whole
// table (as `substr(key,1,n) = prefix` and `key LIKE 'v2:%'` did) burns through that
// allowance with only a few hundred rows in the table.
export class DurableKV {
  constructor(storage, legacy) {
    this.storage = storage;
    this.sql = storage.sql;
    this.legacy = legacy;
    this.sql.exec('CREATE TABLE IF NOT EXISTS panel_kv (key TEXT PRIMARY KEY, value TEXT, metadata TEXT, expires INTEGER, deleted INTEGER NOT NULL DEFAULT 0)');
    this.sql.exec('CREATE TABLE IF NOT EXISTS panel_imports (prefix TEXT PRIMARY KEY)');
    // Lets cleanup() visit only the rows that can actually expire instead of scanning the table.
    this.sql.exec('CREATE INDEX IF NOT EXISTS panel_kv_expires ON panel_kv (expires) WHERE expires IS NOT NULL');
  }
  async get(key) {
    let row = this.sql.exec('SELECT * FROM panel_kv WHERE key = ?', key).toArray()[0];
    if (row) return row.deleted || (row.expires && row.expires <= Date.now()) ? null : row.value === null ? this.importValue(key) : row.value;
    if ((key.startsWith('v2:') || key.startsWith('session:')) || !this.legacy) return null;
    return this.importValue(key);
  }
  async importValue(key) {
    let raw = this.legacy ? await this.legacy.get(key) : null;
    if (raw && key.startsWith('broadcast:') && key !== 'broadcast:index') {
      try {
        const job = JSON.parse(raw);
        if (job?.id && ['running', 'ticking', 'scheduled'].includes(job.status)) {
          job.status = job.status === 'ticking' ? 'needs_review' : 'paused'; job.legacyImported = true;
          job.errors = [...(job.errors || []), { d: 'legacy_job_imported_paused_review_before_resume' }]; raw = JSON.stringify(job);
        }
      } catch {}
    }
    const row = this.sql.exec('SELECT * FROM panel_kv WHERE key = ?', key).toArray()[0];
    // A concurrent request may have written the authoritative local value while KV was read.
    if (row && (row.deleted || row.value !== null)) return row.deleted ? null : row.value;
    this.sql.exec('INSERT OR REPLACE INTO panel_kv (key,value,metadata,deleted) VALUES (?,?,?,?)', key, raw, row?.metadata || null, raw == null ? 1 : 0);
    return raw;
  }
  async put(key, value, opts = {}) {
    const expires = opts.expirationTtl ? Date.now() + opts.expirationTtl * 1000 : opts.expiration ? opts.expiration * 1000 : null;
    this.sql.exec('INSERT OR REPLACE INTO panel_kv (key,value,metadata,expires,deleted) VALUES (?,?,?,?,0)', key, String(value), opts.metadata ? JSON.stringify(opts.metadata) : null, expires);
  }
  async batch(writes) {
    this.storage.transactionSync(() => {
      for (const w of writes) {
        const expires = w.ttl ? Date.now() + w.ttl * 1000 : null;
        this.sql.exec('INSERT OR REPLACE INTO panel_kv (key,value,metadata,expires,deleted) VALUES (?,?,?,?,0)', w.key, String(w.value), w.metadata ? JSON.stringify(w.metadata) : null, expires);
      }
    });
  }
  async delete(key) {
    // Keep tombstones so deleted legacy values cannot reappear after import.
    this.sql.exec('INSERT OR REPLACE INTO panel_kv (key,value,deleted) VALUES (?,NULL,1)', key);
  }
  async ensurePrefix(prefix) {
    if ((prefix.startsWith('v2:') || prefix.startsWith('session:')) || !this.legacy || this.sql.exec('SELECT 1 FROM panel_imports WHERE prefix=?', prefix).toArray().length) return;
    let cursor;
    do {
      const page = await this.legacy.list({ prefix, limit: 1000, cursor });
      for (const k of page.keys) {
        this.sql.exec('INSERT OR IGNORE INTO panel_kv (key,value,metadata,expires) VALUES (?,NULL,?,?)', k.name, k.metadata ? JSON.stringify(k.metadata) : null, k.expiration ? k.expiration * 1000 : null);
      }
      cursor = page.list_complete ? null : page.cursor;
    } while (cursor);
    this.sql.exec('INSERT OR IGNORE INTO panel_imports (prefix) VALUES (?)', prefix);
  }
  async list({ prefix = '', cursor, limit = 1000 } = {}) {
    await this.ensurePrefix(prefix);
    let after = '';
    if (cursor) { try { after = JSON.parse(atob(cursor)).after || ''; } catch {} }
    const size = Math.min(1000, Math.max(1, Number(limit) || 1000));
    // A prefix is the key range [prefix, prefixEnd(prefix)), which the primary key index
    // answers directly; the cursor only moves the lower bound forward inside that range.
    const end = prefixEnd(prefix);
    const rows = this.sql.exec(
      `SELECT key,metadata FROM panel_kv WHERE ${after ? 'key > ?' : 'key >= ?'}${end ? ' AND key < ?' : ''} AND deleted = 0 AND (expires IS NULL OR expires > ?) ORDER BY key LIMIT ?`,
      after || prefix, ...(end ? [end] : []), Date.now(), size + 1,
    ).toArray();
    const complete = rows.length <= size;
    const page = rows.slice(0, size);
    return { keys: page.map(r => ({ name: r.key, metadata: r.metadata ? JSON.parse(r.metadata) : undefined })), list_complete: complete, cursor: complete ? undefined : btoa(JSON.stringify({ after: page.at(-1).key })) };
  }
  cleanup() {
    // Only v2 rows are purged: an expired row under a legacy prefix doubles as the tombstone
    // that stops the old KV value from being imported again. The prefix test is deliberately
    // written as substr() so the planner cannot pick the primary key (most rows are v2 rows)
    // and walks the partial `expires` index instead — i.e. only the rows that have expired.
    this.sql.exec('DELETE FROM panel_kv WHERE expires IS NOT NULL AND expires < ? AND substr(key,1,3) = ?', Date.now(), 'v2:');
  }
}

// Smallest string greater than every key that starts with `prefix` (its last code unit
// incremented), or null for the empty prefix. Keys are compared bytewise by SQLite and all
// prefixes used by the panel are ASCII, so this bound is exact.
export function prefixEnd(prefix) {
  let p = String(prefix);
  while (p.length && p.charCodeAt(p.length - 1) >= 0xffff) p = p.slice(0, -1);
  if (!p.length) return null;
  let next = p.charCodeAt(p.length - 1) + 1;
  if (next >= 0xd800 && next <= 0xdfff) next = 0xe000; // never produce a lone surrogate
  return p.slice(0, -1) + String.fromCharCode(next);
}

export const entityKey = (type, id) => `v2:${type}:${id}`;
export async function entities(env, type, { limit = 100, cursor } = {}) {
  const prefix = `v2:${type}:`;
  const page = await env.BOT_KV.list({ prefix, limit, cursor });
  const rows = (await Promise.all(page.keys.map(async k => {
    const raw = await env.BOT_KV.get(k.name);
    try { return JSON.parse(raw); } catch { return null; }
  }))).filter(Boolean);
  return { rows, cursor: page.list_complete ? null : page.cursor };
}
export async function allEntities(env, type) {
  let cursor, rows = [];
  do { const p = await entities(env, type, { limit: 1000, cursor }); rows.push(...p.rows); cursor = p.cursor; } while (cursor);
  return rows;
}

export async function commitJson(env, writes) {
  const records = writes.map(([key, value, options = {}]) => ({ key, value: JSON.stringify(value), ...options }));
  if (env.BOT_KV.batch) return env.BOT_KV.batch(records);
  // Test/local adapters may expose only the KV API. Production always uses SQLite batch().
  for (const record of records) await env.BOT_KV.put(record.key, record.value, record.ttl ? { expirationTtl: record.ttl } : {});
}
