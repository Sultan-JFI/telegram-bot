import { getJson, putJson } from "../kv.js";
import { entityKey, allEntities, commitJson } from "../storage.js";
import { assert, id, str, int } from "../config.js";
export { assert, id, str, int, commitJson };
export const key = (type, identifier) => entityKey(`svc-${type}`, identifier);
export const get = (env, type, identifier, fallback = null) =>
  getJson(env, key(type, identifier), fallback);
export const put = (env, type, identifier, value, options) =>
  putJson(env, key(type, identifier), value, options);
export const list = (env, type) => allEntities(env, `svc-${type}`);
export const DAY = 86400000,
  GB = 1073741824,
  MAX_MONEY = 100000000000;
export const epoch = () => Math.floor(Date.now() / 1000);
export const uid = (value) => {
  assert(/^[1-9]\d{0,15}$/.test(String(value)), "invalid_user_id");
  return String(value);
};
export function integer(value, min, max, code = "invalid_number") {
  const n = int(value, min, max);
  assert(n !== undefined, code);
  return n;
}
export function money(value) {
  return integer(value, 0, MAX_MONEY, "invalid_amount");
}
export function isoSeconds(value) {
  if (value == null || value === "" || value === 0) return 0;
  if (typeof value === "number")
    return value > 1e12 ? Math.floor(value / 1000) : value;
  const n = Date.parse(
    /(?:Z|[+-]\d\d:\d\d)$/.test(value) ? value : value + "Z",
  );
  return Number.isFinite(n) ? Math.floor(n / 1000) : 0;
}
export const xml = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[c],
  );
export function b64(bytes) {
  const chunks = [];
  for (let i = 0; i < bytes.length; i += 16384)
    chunks.push(String.fromCharCode(...bytes.subarray(i, i + 16384)));
  return btoa(chunks.join(""));
}
export const bytes64 = (value) =>
  Uint8Array.from(atob(value.replace(/-/g, "+").replace(/_/g, "/")), (c) =>
    c.charCodeAt(0),
  );
export const utf8 = (value) => new TextEncoder().encode(value);
export const hex = (bytes) =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
export const digest = async (value) =>
  new Uint8Array(
    await crypto.subtle.digest(
      "SHA-256",
      typeof value === "string" ? utf8(value) : value,
    ),
  );
export const hash = async (value) => hex(await digest(value));
export async function hmac(secret, data, algorithm = "SHA-256") {
  const k = await crypto.subtle.importKey(
    "raw",
    typeof secret === "string" ? utf8(secret) : secret,
    { name: "HMAC", hash: algorithm },
    false,
    ["sign"],
  );
  return new Uint8Array(
    await crypto.subtle.sign(
      "HMAC",
      k,
      typeof data === "string" ? utf8(data) : data,
    ),
  );
}
export function constantEqual(a, b) {
  a = String(a);
  b = String(b);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
export function randomToken() {
  return hex(crypto.getRandomValues(new Uint8Array(32)));
}
export function randomInt(max) {
  assert(
    Number.isSafeInteger(max) && max > 0 && max <= 0x7fffffff,
    "invalid_random_bound",
  );
  const bound = Math.floor(0x100000000 / max) * max;
  let n;
  do {
    n = crypto.getRandomValues(new Uint32Array(1))[0];
  } while (n >= bound);
  return n % max;
}
export function decimalUnits(value, decimals) {
  assert(
    Number.isInteger(decimals) && decimals >= 0 && decimals <= 36,
    "invalid_decimals",
  );
  const match = /^(\d+)(?:\.(\d+))?(?:[eE]([+-]?\d{1,3}))?$/.exec(
    String(value),
  );
  assert(match, "invalid_decimal");
  const exponent = Number(match[3] || 0);
  assert(Math.abs(exponent) <= 100, "decimal_range");
  const digits = match[1] + (match[2] || "");
  const position = match[1].length + exponent + decimals;
  if (position >= digits.length)
    return BigInt(digits + "0".repeat(position - digits.length));
  if (position <= 0) {
    assert(/^0+$/.test(digits), "decimal_precision");
    return 0n;
  }
  assert(/^0*$/.test(digits.slice(position)), "decimal_precision");
  return BigInt(digits.slice(0, position) || "0");
}
export function decimalString(units, decimals) {
  const s = BigInt(units)
    .toString()
    .padStart(decimals + 1, "0");
  return decimals ? s.slice(0, -decimals) + "." + s.slice(-decimals) : s;
}
export async function audit(env, action, details = {}) {
  const entry = {
    id: Date.now().toString(36) + "-" + id(),
    at: Date.now(),
    action,
    ...details,
  };
  await put(env, "audit", entry.id, entry, { ttl: 90 * 86400 });
  return entry;
}
export async function limited(env, bucket, max = 20, seconds = 60) {
  const old = await get(env, "rate", bucket, { at: Date.now(), count: 0 });
  if (Date.now() - old.at >= seconds * 1000) {
    old.at = Date.now();
    old.count = 0;
  }
  assert(old.count < max, "rate_limited", 429);
  old.count++;
  await put(env, "rate", bucket, old, { ttl: seconds });
}
export async function credentialKey(env) {
  assert(
    env.VAULT_KEY && String(env.VAULT_KEY).length >= 32,
    "vault_key_required",
    503,
  );
  return crypto.subtle.importKey(
    "raw",
    await digest(env.VAULT_KEY),
    "AES-GCM",
    false,
    ["encrypt", "decrypt"],
  );
}
export async function seal(env, value) {
  const k = await credentialKey(env),
    iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    k,
    utf8(JSON.stringify(value)),
  );
  return { version: 1, iv: b64(iv), data: b64(new Uint8Array(ciphertext)) };
}
export async function unseal(env, value) {
  if (!value) return {};
  try {
    const k = await credentialKey(env);
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: bytes64(value.iv) },
      k,
      bytes64(value.data),
    );
    return JSON.parse(new TextDecoder().decode(plain));
  } catch {
    assert(false, "vault_decryption_failed", 503);
  }
}
export function publicHTTPS(value) {
  try {
    const u = new URL(value),
      h = u.hostname.toLowerCase();
    if (
      u.protocol !== "https:" ||
      u.username ||
      u.password ||
      u.hash ||
      u.search
    )
      return false;
    if (
      h === "localhost" ||
      !h.includes(".") ||
      h.includes(":") ||
      /^[\d.]+$/.test(h) ||
      /\.(local|internal|localhost|invalid|test)$/.test(h)
    )
      return false;
    return true;
  } catch {
    return false;
  }
}
export class RemoteError extends Error {
  constructor(
    code,
    { status = 502, uncertain = false, remoteStatus = 0 } = {},
  ) {
    super(code);
    this.status = status;
    this.uncertain = uncertain;
    this.remoteStatus = remoteStatus;
  }
}
export async function fetchLimited(url, options = {}, max = 2 * 1024 * 1024, timeoutMs = 10000) {
  let res;
  try {
    res = await fetch(url, {
      ...options,
      redirect: options.redirect || "error",
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    throw new RemoteError("provider_network_error", {
      uncertain: options.method !== "GET",
    });
  }
  if (Number(res.headers.get("content-length") || 0) > max)
    throw new RemoteError("provider_response_too_large", {
      uncertain: options.method !== "GET",
    });
  const reader = res.body?.getReader();
  let length = 0;
  const chunks = [];
  try {
    if (reader)
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        length += value.length;
        if (length > max) {
          await reader.cancel();
          throw new Error("too large");
        }
        chunks.push(value);
      }
  } catch {
    throw new RemoteError("provider_response_incomplete", {
      uncertain: options.method !== "GET",
    });
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  const text = new TextDecoder().decode(bytes);
  let data = null;
  try {
    data = JSON.parse(text);
  } catch {}
  return { ok: res.ok, status: res.status, headers: res.headers, data, text };
}
export function expectResponse(res, allow404 = false) {
  if (res.status === 404 && allow404) return null;
  if (!res.ok)
    throw new RemoteError(
      res.status === 401 || res.status === 403
        ? "provider_auth_failed"
        : `provider_http_${res.status}`,
      { remoteStatus: res.status, uncertain: res.status >= 500 },
    );
  if (
    res.data?.success === false ||
    res.data?.status === false ||
    res.data?.status === "error" ||
    res.data?.error
  )
    throw new RemoteError("provider_rejected_request", { remoteStatus: 400 });
  return res.data;
}
export function publicService(s, includeSecrets = false) {
  if (!s) return null;
  const { remote, ownerToken, configSecret, operationId, ...safe } = s;
  return {
    ...safe,
    ...(includeSecrets
      ? { configs: s.configs || [], subscriptionUrl: s.subscriptionUrl }
      : { configs: undefined, subscriptionUrl: undefined }),
  };
}

export async function limitedRequestText(request, max = 1048576) {
  assert(
    Number(request.headers.get("content-length") || 0) <= max,
    "request_too_large",
    413,
  );
  if (!request.body) return "";
  const reader = request.body.getReader(),
    chunks = [];
  let size = 0,
    timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    reader.cancel().catch(() => {});
  }, 15000);
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > max) {
        await reader.cancel();
        assert(false, "request_too_large", 413);
      }
      chunks.push(value);
    }
    assert(!timedOut, "request_timeout", 408);
    const data = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      data.set(chunk, offset);
      offset += chunk.length;
    }
    return new TextDecoder().decode(data);
  } finally {
    clearTimeout(timer);
  }
}
