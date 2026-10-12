import { ModernProvider, isModernProvider, validateModernOptions } from "./modern-providers.js";
import { x25519 } from "@noble/curves/ed25519.js";
import {
  get,
  put,
  key,
  list,
  seal,
  unseal,
  assert,
  id,
  str,
  integer,
  GB,
  epoch,
  isoSeconds,
  b64,
  randomToken,
  fetchLimited,
  expectResponse,
  RemoteError,
  publicHTTPS,
  hash,
  bytes64,
  randomInt,
} from "./common.js";

const standard = [
  "create",
  "read",
  "renew",
  "volume",
  "time",
  "toggle",
  "delete",
  "reset",
];
export const PROVIDERS = {
  remnawave: {
    label: "Remnawave",
    capabilities: [...standard, "revoke", "nodes", "inbounds"],
    hint: "Bearer token؛ Squad UUID؛ زمان محدود؛ API /api/users",
  },
  rebecca: {
    label: "Rebecca",
    capabilities: [...standard, "revoke", "inbounds", "first_use"],
    hint: "Bearer token؛ Service ID؛ API v2 ساخت و ویرایش",
  },
  stock: {
    label: "انبار / فروش دستی",
    capabilities: ["create", "read", "renew"],
    hint: "کانفیگ‌های آماده، بدون API بیرونی",
  },
  marzban: {
    label: "Marzban",
    capabilities: [...standard, "revoke", "nodes", "inbounds", "first_use"],
    hint: "REST /api/user — نسخه کلاسیک",
  },
  marzban_v1: {
    label: "Marzban 1.x",
    capabilities: [...standard, "revoke", "nodes", "inbounds", "first_use"],
    hint: "proxy_settings و group_ids؛ تاریخ ISO",
  },
  marzneshin: {
    label: "Marzneshin",
    capabilities: [...standard, "revoke", "nodes", "inbounds", "first_use"],
    hint: "REST /api/users و service_ids",
  },
  pasarguard: {
    label: "PasarGuard",
    capabilities: [...standard, "revoke", "nodes", "inbounds", "first_use"],
    hint: "REST /api/user با proxy_settings و group_ids؛ تاریخ ISO",
  },
  xui: {
    label: "3x-ui / x-ui",
    capabilities: [...standard, "revoke", "inbounds", "first_use"],
    hint: "Cookie login؛ API تک inbound",
  },
  xui_token: {
    label: "3x-ui Token API",
    capabilities: [...standard, "revoke", "inbounds"],
    hint: "نسخه دارای /panel/api/clients؛ API token",
  },
  alireza_inbound: {
    label: "Alireza — inbound مستقل",
    capabilities: [...standard, "revoke", "inbounds"],
    hint: "هر سرویس یک inbound؛ API /xui/API/inbounds",
  },
  ibsng: {
    label: "IBSng HTTPS web API",
    capabilities: ["create", "read", "delete", "inbounds"],
    hint: "رابط وب کلاسیک IBSng با HTTPS؛ محدودیت‌ها از گروه IBSng",
  },
  alireza: {
    label: "Alireza single",
    capabilities: [...standard, "revoke", "inbounds", "first_use"],
    hint: "API client در /xui/inbound",
  },
  sui: {
    label: "S-UI API v2",
    capabilities: [...standard, "revoke", "inbounds"],
    hint: "Token + /apiv2",
  },
  hiddify: {
    label: "Hiddify API v2",
    capabilities: [...standard],
    hint: "Hiddify-API-Key؛ مسیر پنل شامل secret path",
  },
  wgdashboard: {
    label: "WGDashboard",
    capabilities: [...standard],
    hint: "wg-dashboard-apikey و نام interface؛ زمان/حجم توسط scheduler پنل",
  },
  guard: {
    label: "Guard",
    capabilities: [...standard, "revoke", "inbounds"],
    hint: "Guard REST /api/subscriptions",
  },
  mikrotik: {
    label: "MikroTik User Manager REST",
    capabilities: ["create", "read", "delete", "toggle", "inbounds"],
    hint: "RouterOS REST با HTTPS؛ حجم/زمان توسط profile سمت سرور",
  },
};
// PasarGuard speaks the same FastAPI dialect as the Marzban family
// (POST /api/admin/token, /api/user, /api/system, /api/nodes) but its create
// payload follows the newer shape: proxy_settings + group_ids + ISO expire.
const isMarzLike = (t) => t === "pasarguard" || (typeof t === "string" && t.startsWith("marz"));
export const publicPanel = (panel) => {
  const { credentials, ...p } = panel;
  return {
    ...p,
    hasCredentials: !!credentials,
    capabilities: PROVIDERS[p.type]?.capabilities || [],
  };
};
export async function savePanel(env, body, existing = {}) {
  assert(
    Object.hasOwn(PROVIDERS, body.type || existing.type),
    "unsupported_panel_type",
  );
  const p = {
    ...existing,
    id: existing.id || id(),
    title: str(body.title, 100),
    type: body.type || existing.type,
    url: str(body.url, 1000).replace(/\/$/, ""),
    location: str(body.location, 64),
    country: str(body.country, 2).toUpperCase(),
    enabled: body.enabled !== false,
    emergency: !!body.emergency,
    fallbackPanelId: str(body.fallbackPanelId, 32),
    capacity: integer(body.capacity ?? 10000, 1, 100000),
    options:
      body.options &&
      typeof body.options === "object" &&
      !Array.isArray(body.options)
        ? body.options
        : {},
    createdAt: existing.createdAt || Date.now(),
  };
  assert(p.title, "panel_title_required");
  assert(p.type === "stock" || publicHTTPS(p.url), "panel_https_required");
  validateModernOptions(p.type, p.options);
  assert(JSON.stringify(p.options).length < 15000, "panel_options_too_large");
  assert(!p.fallbackPanelId || p.fallbackPanelId !== p.id, "fallback_cycle");
  const seen = new Set([p.id]);
  let next = p.fallbackPanelId;
  while (next) {
    assert(!seen.has(next), "fallback_cycle");
    seen.add(next);
    const row = await get(env, "panel", next);
    assert(row, "fallback_panel_not_found");
    next = row.fallbackPanelId;
  }
  if (body.secret && Object.values(body.secret).some((v) => String(v).trim())) {
    const old = existing.credentials
      ? await unseal(env, existing.credentials)
      : {};
    for (const k of [
      "username",
      "password",
      "token",
      "accessClientId",
      "accessClientSecret",
    ])
      if (body.secret[k]) old[k] = str(body.secret[k], 2000);
    p.credentials = await seal(env, old);
    await env.BOT_KV.delete(key("login", p.id));
  }
  assert(p.type === "stock" || p.credentials, "panel_credentials_required");
  if (isModernProvider(p.type)) {
    const secret = await unseal(env, p.credentials);
    assert(secret.token, "panel_token_required");
  }
  // Changing the endpoint or dialect must not reuse an old cookie/token cache.
  if (existing.url !== p.url || existing.type !== p.type)
    await env.BOT_KV.delete(key("login", p.id));
  await put(env, "panel", p.id, p);
  return p;
}
function rows(value) {
  return Array.isArray(value)
    ? value
    : Array.isArray(value?.items)
      ? value.items
      : [];
}
const parse = (value) =>
  typeof value === "string"
    ? (() => {
        try {
          return JSON.parse(value);
        } catch {
          return {};
        }
      })()
    : value || {};
const splitLinks = (value) =>
  Array.isArray(value)
    ? value.filter((x) => typeof x === "string")
    : typeof value === "string"
      ? value
          .split(/\r?\n/)
          .map((x) => x.trim())
          .filter(Boolean)
      : [];
function normalize(raw, extra = {}) {
  const used = Number(
    raw.used_traffic ??
      raw.usedTraffic ??
      Number(raw.up || 0) + Number(raw.down || 0),
  );
  return {
    username: raw.username || raw.email || raw.name,
    remoteId: raw.uuid || raw.id || raw.username,
    dataLimit: Number(
      raw.data_limit ?? raw.volume ?? raw.total ?? raw.totalGB ?? 0,
    ),
    usedBytes: Number.isFinite(used) ? used : 0,
    expiresAt: isoSeconds(
      raw.expire_date ??
        raw.expire ??
        raw.expiry ??
        (raw.expiryTime > 0 ? raw.expiryTime / 1000 : 0),
    ),
    status:
      raw.status ||
      ((raw.enable ?? raw.enabled ?? !raw.is_disabled) ? "active" : "disabled"),
    subscriptionUrl: raw.subscription_url || raw.sub_url || "",
    configs: splitLinks(raw.links || raw.configs),
    raw,
    ...extra,
  };
}
export async function connector(env, panel) {
  return new Connector(
    env,
    panel,
    panel.credentials ? await unseal(env, panel.credentials) : {},
  );
}
class Connector {
  constructor(env, panel, secret) {
    this.env = env;
    this.panel = panel;
    this.secret = secret;
    this.type = panel.type;
    this.options = panel.options || {};
    this.modern = isModernProvider(this.type) ? new ModernProvider(this, normalize) : null;
  }
  get caps() {
    return PROVIDERS[this.type]?.capabilities || [];
  }
  supported(action) {
    assert(this.caps.includes(action), "panel_action_unsupported");
  }
  async login(fresh = false) {
    const k = key("login", this.panel.id);
    let cached = await get(this.env, "login", this.panel.id);
    if (!fresh && cached?.expiresAt > Date.now())
      return unseal(this.env, cached.credentials);
    const marz = isMarzLike(this.type),
      path =
        this.type === "ibsng"
          ? "/IBSng/admin/"
          : this.type === "marzneshin"
            ? "/api/admins/token"
            : marz
              ? "/api/admin/token"
              : "/login";
    const body = new URLSearchParams({
      username: this.secret.username || "",
      password: this.secret.password || "",
    });
    const result = await this.request(path, "POST", body, {}, true);
    let auth;
    if (marz) {
      assert(result.data?.access_token, "provider_invalid_auth_response", 502);
      auth = { authorization: "Bearer " + result.data.access_token };
    } else {
      if (this.type === "ibsng")
        assert(
          (result.headers.get("location") || result.text).includes(
            "admin_index",
          ),
          "provider_auth_failed",
          502,
        );
      assert(result.data?.success !== false, "provider_auth_failed", 502);
      const cookies = result.headers.getSetCookie?.() || [
        result.headers.get("set-cookie") || "",
      ];
      const cookie = cookies
        .map((c) => c.split(";")[0])
        .filter(Boolean)
        .join("; ");
      assert(cookie, "provider_cookie_missing", 502);
      auth = { cookie };
    }
    await put(
      this.env,
      "login",
      this.panel.id,
      {
        expiresAt: Date.now() + 15 * 60000,
        credentials: await seal(this.env, auth),
      },
      { ttl: 900 },
    );
    return auth;
  }
  async auth() {
    if (this.type === "stock") return {};
    if (
      this.type === "marzban" ||
      this.type === "marzban_v1" ||
      this.type === "marzneshin" ||
      this.type === "pasarguard"
    )
      return this.secret.token
        ? { authorization: "Bearer " + this.secret.token }
        : this.login();
    if (
      this.type === "xui" ||
      this.type.startsWith("alireza") ||
      this.type === "ibsng"
    )
      return this.login();
    if (this.type === "xui_token" || this.modern)
      return { authorization: "Bearer " + this.secret.token };
    if (this.type === "sui") return { Token: this.secret.token };
    if (this.type === "guard") return { "X-API-Key": this.secret.token };
    if (this.type === "wgdashboard")
      return { "wg-dashboard-apikey": this.secret.token };
    if (this.type === "hiddify")
      return { "Hiddify-API-Key": this.secret.token };
    if (this.type === "mikrotik")
      return {
        authorization:
          "Basic " +
          b64(
            new TextEncoder().encode(
              `${this.secret.username}:${this.secret.password}`,
            ),
          ),
      };
    return {};
  }
  async request(path, method = "GET", body, headers = {}, skipAuth = false) {
    const url = this.panel.url + path;
    const auth = skipAuth ? {} : await this.auth();
    const h = {
      accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
      ...auth,
      ...headers,
    };
    if (this.secret.accessClientId && this.secret.accessClientSecret) {
      h["CF-Access-Client-Id"] = this.secret.accessClientId;
      h["CF-Access-Client-Secret"] = this.secret.accessClientSecret;
    }
    let payload = body;
    if (body instanceof URLSearchParams)
      h["content-type"] = "application/x-www-form-urlencoded";
    else if (body !== undefined) {
      h["content-type"] = "application/json";
      payload = JSON.stringify(body);
    }
    return fetchLimited(url, {
      method,
      headers: h,
      ...(this.type === "ibsng" ? { redirect: "manual" } : {}),
      ...(payload === undefined ? {} : { body: payload }),
    });
  }
  async call(path, method = "GET", body, allow404 = false) {
    return expectResponse(await this.request(path, method, body), allow404);
  }
  get root() {
    return this.type.startsWith("alireza")
      ? "/xui/API/inbounds"
      : "/panel/api/inbounds";
  }
  async resources() {
    if (this.modern) return this.modern.resources();
    if (this.type === "pasarguard") return this.call("/api/groups");
    if (this.type.startsWith("marz"))
      return this.call(
        this.type === "marzneshin"
          ? "/api/services"
          : this.type === "marzban_v1"
            ? "/api/groups"
            : "/api/inbounds",
      );
    if (["xui", "xui_token", "alireza", "alireza_inbound"].includes(this.type))
      return (
        (
          await this.call(
            this.root + (this.type.startsWith("alireza") ? "" : "/list"),
          )
        )?.obj || []
      );
    if (this.type === "ibsng") {
      const r = await this.request("/IBSng/admin/group/group_list.php");
      assert(r.ok, "provider_auth_failed");
      return [
        ...new Set(
          [...r.text.matchAll(/group_info\.php\?group_name=([^"&<>]+)/g)].map(
            (m) => decodeURIComponent(m[1]),
          ),
        ),
      ].map((group) => ({ group }));
    }
    if (this.type === "guard") return this.call("/api/services");
    if (this.type === "sui")
      return (await this.call("/apiv2/inbounds"))?.obj || {};
    if (this.type === "wgdashboard")
      return this.call("/api/getWireguardConfigurations");
    if (this.type === "mikrotik")
      return this.call("/rest/user-manager/profile");
    return [];
  }
  async health() {
    if (this.modern) return this.modern.health();
    if (this.type === "stock") return { ok: true, kind: "local_inventory" };
    const start = Date.now();
    let data;
    if (
      this.type === "marzban" ||
      this.type === "marzban_v1" ||
      this.type === "pasarguard"
    )
      data = await this.call("/api/system");
    else if (this.type === "marzneshin")
      data = await this.call("/api/system/stats/users");
    else if (this.type === "ibsng") {
      await this.login(true);
      data = { authenticated: true };
    } else if (this.type === "guard")
      data = await this.call("/api/admins/current");
    else if (this.type === "hiddify")
      data = await this.call("/api/v2/admin/server_status/");
    else if (this.type === "sui") data = await this.call("/apiv2/settings");
    else data = await this.resources();
    return { ok: true, ms: Date.now() - start, at: Date.now(), data };
  }
  async nodes() {
    this.supported("nodes");
    if (this.modern) return this.modern.nodes();
    return this.call("/api/nodes");
  }
  async reconnectNode(nodeId) {
    this.supported("nodes");
    if (this.modern) return this.modern.reconnectNode(nodeId);
    // PasarGuard only exposes a global reconnect (POST /api/nodes/reconnect),
    // so a per-node request restarts every node instead of failing.
    if (this.type === "pasarguard")
      return this.call("/api/nodes/reconnect", "POST", {});
    assert(/^[0-9]+$/.test(String(nodeId)), "invalid_node_id");
    return this.call("/api/node/" + nodeId + "/reconnect", "POST", {});
  }
  async get(account) {
    if (this.modern) return this.modern.get(account);
    const username = encodeURIComponent(account.username);
    if (isMarzLike(this.type)) {
      const raw = await this.call(
        (this.type === "marzneshin" ? "/api/users/" : "/api/user/") + username,
        "GET",
        undefined,
        true,
      );
      return raw ? normalize(raw) : null;
    }
    if (this.type === "ibsng") {
      const r = await this.request(
        "/IBSng/admin/user/user_info.php?normal_username_multi=" + username,
      );
      assert(r.ok, "provider_auth_failed");
      if (/does not exist/i.test(r.text)) return null;
      const userId = /change_credit\.php\?user_id=(\d+)/.exec(r.text)?.[1];
      assert(userId, "ibsng_user_page_unrecognized", 502);
      return normalize(
        { username: account.username },
        {
          remoteId: userId,
          dataLimit: 0,
          usedBytes: 0,
          expiresAt: 0,
          status: "managed_by_profile",
          configs: [
            `Username: ${account.username}\nPassword: ${account.password}\nServer: ${this.options.serverAddress || new URL(this.panel.url).hostname}`,
          ],
          raw: { id: userId },
        },
      );
    }
    if (this.type === "alireza_inbound") {
      const rows = (await this.call(this.root))?.obj || [];
      const inbound = rows.find((i) => i.remark === account.username);
      if (!inbound) return null;
      const client = parse(inbound.settings).clients?.[0];
      assert(client, "provider_invalid_user");
      return normalize(
        { ...inbound, email: account.username },
        {
          remoteId: inbound.id,
          configs: xuiLinks(this.panel, inbound, {
            ...client,
            email: account.username,
          }),
          raw: { inbound, client },
        },
      );
    }
    if (this.type === "guard") {
      const value = await this.call(
        "/api/subscriptions/" + username,
        "GET",
        undefined,
        true,
      );
      if (!value) return null;
      const raw = value.data || value;
      return normalize(raw, {
        dataLimit: Number(raw.limit_usage || 0),
        usedBytes: Number(raw.current_usage || raw.usage || 0),
        expiresAt: isoSeconds(raw.limit_expire),
        status: raw.is_active === false ? "disabled" : raw.status || "active",
        subscriptionUrl:
          raw.subscription_url ||
          raw.subscription ||
          (raw.tag && raw.access_key
            ? this.panel.url +
              "/" +
              encodeURIComponent(raw.tag) +
              "/" +
              encodeURIComponent(raw.access_key)
            : ""),
        raw,
      });
    }
    if (this.type === "xui_token") {
      const data = await this.call(
        "/panel/api/clients/traffic/" + username,
        "GET",
        undefined,
        true,
      );
      if (!data?.obj) return null;
      const raw = Array.isArray(data.obj) ? data.obj[0] : data.obj;
      if (!raw) return null;
      const links = await this.call("/panel/api/clients/links/" + username);
      const values = links.obj?.links || links.obj || [];
      assert(
        !raw.email || raw.email === account.username,
        "provider_user_mismatch",
      );
      const linkList = splitLinks(values);
      let remoteUUID =
        raw.uuid ||
        (typeof raw.id === "string" && /^[a-f0-9-]{36}$/i.test(raw.id)
          ? raw.id
          : "");
      for (const link of linkList) {
        if (remoteUUID) break;
        try {
          if (/^vmess:\/\//.test(link)) {
            remoteUUID =
              JSON.parse(new TextDecoder().decode(bytes64(link.slice(8)))).id ||
              "";
          } else if (/^(vless|trojan):\/\//.test(link)) {
            remoteUUID = decodeURIComponent(new URL(link).username);
          }
        } catch {}
      }

      return normalize(
        { ...raw, email: account.username },
        {
          remoteId: remoteUUID,
          configs: splitLinks(values),
          subscriptionUrl: this.options.subscriptionBase
            ? this.options.subscriptionBase.replace(/\/$/, "") +
              "/" +
              account.subId
            : "",
          raw: {
            client: {
              id: remoteUUID,
              email: account.username,
              subId: account.subId,
              enable: raw.enable !== false,
              totalGB: raw.total,
              expiryTime: raw.expiryTime,
            },
            traffic: raw,
          },
        },
      );
    }
    if (["xui", "alireza"].includes(this.type)) {
      const data = await this.call(
        this.type === "alireza"
          ? this.root
          : this.root + "/get/" + account.inboundId,
        "GET",
        undefined,
        true,
      );
      if (!data?.obj) return null;
      const inbound =
        this.type === "alireza"
          ? rows(data.obj).find(
              (i) => Number(i.id) === Number(account.inboundId),
            )
          : data.obj;
      if (!inbound) return null;
      const clients = parse(inbound.settings).clients || [];
      const client = clients.find(
        (c) =>
          c.email === account.username ||
          c.id === account.uuid ||
          c.password === account.uuid,
      );
      if (!client) return null;
      const traffic =
        (inbound.clientStats || []).find((c) => c.email === client.email) || {};
      const sub = this.panel.options.subscriptionBase
        ? this.panel.options.subscriptionBase.replace(/\/$/, "") +
          "/" +
          client.subId
        : "";
      return normalize(
        { ...client, ...traffic },
        {
          username: client.email,
          remoteId: client.id || client.password,
          status:
            client.enable === false
              ? "disabled"
              : client.expiryTime < 0
                ? "on_hold"
                : (traffic.total || client.totalGB) > 0 &&
                    Number(traffic.up || 0) + Number(traffic.down || 0) >=
                      (traffic.total || client.totalGB)
                  ? "limited"
                  : "active",
          subscriptionUrl: sub,
          configs: xuiLinks(this.panel, inbound, client),
          raw: {
            inbound: {
              id: inbound.id,
              port: inbound.port,
              protocol: inbound.protocol,
            },
            client,
            traffic,
          },
        },
      );
    }
    if (this.type === "sui") {
      const data = await this.call("/apiv2/clients");
      const client = rows(data?.obj?.clients).find(
        (c) => c.name === account.username,
      );
      return client
        ? normalize(client, {
            remoteId: client.id,
            subscriptionUrl: this.options.subscriptionBase
              ? this.options.subscriptionBase.replace(/\/$/, "") +
                "/" +
                (client.subId || client.uuid || client.id)
              : "",
            raw: client,
          })
        : null;
    }
    if (this.type === "hiddify") {
      const data = await this.call("/api/v2/admin/user/");
      const client = rows(data?.data || data).find(
        (c) => c.name === account.username || c.uuid === account.uuid,
      );
      if (!client) return null;
      return normalize(client, {
        remoteId: client.uuid,
        dataLimit: Math.round(Number(client.usage_limit_GB || 0) * GB),
        usedBytes: Math.round(Number(client.current_usage_GB || 0) * GB),
        expiresAt: client.expire_date
          ? isoSeconds(client.expire_date)
          : isoSeconds(client.start_date) +
            Number(client.package_days || 0) * 86400,
        status:
          client.enable === false || client.is_active === false
            ? "disabled"
            : "active",
        subscriptionUrl:
          client.subscription_url ||
          client.sub_url ||
          (this.options.subscriptionBase
            ? this.options.subscriptionBase.replace(/\/$/, "") +
              "/" +
              client.uuid +
              "/"
            : ""),
        raw: client,
      });
    }
    if (this.type === "wgdashboard") {
      const conf = encodeURIComponent(this.options.interface || "wg0");
      const data = await this.call(
        "/api/getWireguardConfigurationInfo?configurationName=" + conf,
      );
      const peer = [
        ...rows(data?.data?.configurationPeers),
        ...rows(data?.data?.configurationRestrictedPeers),
      ].find((p) => p.name === account.username || p.id === account.wgPublic);
      if (!peer) return null;
      const restricted = rows(data?.data?.configurationRestrictedPeers).some(
        (p) => p.id === peer.id,
      );
      const jobs = Array.isArray(peer.jobs) ? peer.jobs : [];
      const limits = jobs
        .filter((j) => j.Field === "total_data" && j.Action === "restrict")
        .map((j) => Number(j.Value))
        .filter((n) => Number.isFinite(n) && n > 0);
      const dates = jobs
        .filter((j) => j.Field === "date" && j.Action === "restrict")
        .map((j) => isoSeconds(j.Value))
        .filter((n) => n > 0);
      return normalize(peer, {
        remoteId: peer.id || account.wgPublic,
        usedBytes: Math.round(
          (Number(peer.total_receive || 0) + Number(peer.total_sent || 0)) * GB,
        ),
        dataLimit: limits.length ? Math.round(Math.min(...limits) * GB) : 0,
        expiresAt: dates.length ? Math.min(...dates) : 0,
        status: restricted ? "disabled" : "active",
        raw: peer,
      });
    }
    if (this.type === "mikrotik") {
      const users = await this.call("/rest/user-manager/user");
      const u = rows(users).find((u) => u.name === account.username);
      return u
        ? normalize(u, {
            remoteId: u[".id"],
            username: u.name,
            status: String(u.disabled) === "true" ? "disabled" : "active",
            dataLimit: 0,
            usedBytes: 0,
            expiresAt: 0,
            raw: u,
          })
        : null;
    }
    return null;
  }
  async create(a) {
    this.supported("create");
    if (this.modern) return this.modern.create(a);
    let result;
    if (this.type === "ibsng") return this.ibsCreate(a);
    if (this.type === "alireza_inbound") {
      const existing = await this.resources(),
        ports = new Set(existing.map((i) => i.port));
      const min = Number(a.options.portMin || 40000),
        max = Number(a.options.portMax || 60000);
      assert(min >= 1024 && max <= 65535 && max >= min, "invalid_port_range");
      let port;
      for (let i = 0; i < 1000; i++) {
        const candidate = min + randomInt(max - min + 1);
        if (!ports.has(candidate)) {
          port = candidate;
          break;
        }
      }
      assert(port, "no_available_inbound_port");
      a.port = port;
      const client = {
        id: a.uuid,
        password: a.password,
        email: a.username,
        enable: true,
        totalGB: a.dataLimit,
        expiryTime: a.expiresAt * 1000,
        subId: a.subId,
        flow: a.options.flow || "",
      };
      return this.call(this.root + "/add", "POST", {
        enable: true,
        remark: a.username,
        listen: "",
        port,
        protocol: a.options.protocol || "vless",
        expiryTime: a.expiresAt * 1000,
        total: a.dataLimit,
        settings: JSON.stringify({
          clients: [client],
          decryption: "none",
          fallbacks: [],
        }),
        streamSettings: JSON.stringify(
          a.options.streamSettings || { network: "tcp", security: "none" },
        ),
        sniffing: JSON.stringify({
          enabled: true,
          destOverride: ["http", "tls"],
        }),
      });
    }
    if (isMarzLike(this.type)) {
      const data = {
        username: a.username,
        data_limit: a.dataLimit,
        note: `BotPanel ${a.operationId}`,
        data_limit_reset_strategy: "no_reset",
      };
      if (this.type === "marzneshin") {
        data.service_ids =
          a.options.serviceIds || this.options.serviceIds || [];
        Object.assign(
          data,
          a.firstUse
            ? {
                expire_strategy: "start_on_first_use",
                usage_duration: a.durationDays * 86400,
              }
            : a.expiresAt
              ? {
                  expire_strategy: "fixed_date",
                  expire_date: new Date(a.expiresAt * 1000).toISOString(),
                }
              : { expire_strategy: "never" },
        );
      } else {
        // PasarGuard follows the newer payload shape (proxy_settings +
        // group_ids + ISO expire), exactly like Marzban 1.x.
        const v1 =
          this.type === "marzban_v1" || this.type === "pasarguard";
        data[v1 ? "proxy_settings" : "proxies"] = a.options.proxies ||
          this.options.proxies || { vless: {} };
        const inbounds =
          a.options.groupIds ||
          a.options.serviceIds ||
          a.options.inbounds ||
          this.options.groupIds ||
          this.options.serviceIds ||
          this.options.inbounds;
        if (inbounds) data[v1 ? "group_ids" : "inbounds"] = inbounds;
        data.expire = v1
          ? a.expiresAt
            ? new Date(a.expiresAt * 1000).toISOString()
            : null
          : a.expiresAt;
        if (a.firstUse) {
          data.status = "on_hold";
          data.expire = null;
          data.on_hold_expire_duration = a.durationDays * 86400;
        }
      }
      result = await this.call(
        this.type === "marzneshin" ? "/api/users" : "/api/user",
        "POST",
        data,
      );
    } else if (["xui", "xui_token", "alireza"].includes(this.type)) {
      const c = {
        id: a.uuid,
        email: a.username,
        password: a.uuid,
        flow: a.options.flow || "",
        limitIp: a.options.limitIp || 0,
        totalGB: a.dataLimit,
        expiryTime: a.firstUse
          ? -a.durationDays * 86400000
          : a.expiresAt * 1000,
        enable: true,
        tgId: "",
        subId: a.subId,
        reset: 0,
      };
      if (this.type === "xui_token")
        result = await this.call("/panel/api/clients/add", "POST", {
          client: c,
          inboundIds: [Number(a.inboundId)],
        });
      else
        result = await this.call(this.root + "/addClient", "POST", {
          id: Number(a.inboundId),
          settings: JSON.stringify({ clients: [c] }),
        });
    } else if (this.type === "guard") {
      result = await this.call("/api/subscriptions", "POST", [
        {
          username: a.username,
          limit_usage: a.dataLimit,
          limit_expire: a.expiresAt
            ? new Date(a.expiresAt * 1000).toISOString()
            : null,
          service_ids: a.options.serviceIds || [],
          note: "BotPanel " + a.operationId,
        },
      ]);
    } else if (this.type === "sui") {
      const password = a.uuid;
      const config = {};
      for (const proto of ["vless", "vmess", "tuic"])
        config[proto] = {
          name: a.username,
          uuid: a.uuid,
          password,
          flow: "",
          alterId: 0,
        };
      for (const proto of [
        "trojan",
        "shadowsocks",
        "shadowsocks16",
        "hysteria",
        "hysteria2",
        "shadowtls",
      ])
        config[proto] = { name: a.username, password, auth_str: password };
      for (const proto of ["mixed", "socks", "http", "naive"])
        config[proto] = { username: a.username, password };
      result = await this.suiSave("new", {
        enable: true,
        name: a.username,
        config,
        inbounds: a.options.inboundIds || this.options.inboundIds || [],
        links: [],
        volume: a.dataLimit,
        expiry: a.expiresAt,
        desc: `BotPanel ${a.operationId}`,
      });
    } else if (this.type === "hiddify")
      result = await this.call("/api/v2/admin/user/", "POST", {
        uuid: a.uuid,
        name: a.username,
        usage_limit_GB: a.dataLimit / GB,
        package_days: a.durationDays,
        mode: "no_reset",
        enable: true,
        start_date: new Date().toISOString().slice(0, 10),
        comment: `BotPanel ${a.operationId}`,
      });
    else if (this.type === "wgdashboard") {
      const conf = encodeURIComponent(this.options.interface || "wg0"),
        available = await this.call("/api/getAvailableIPs/" + conf);
      const ips =
        available?.data?.availableIPs ||
        available?.data ||
        available?.availableIPs ||
        [];
      const ip = Array.isArray(ips)
        ? ips.find((x) => typeof x === "string")
        : null;
      assert(ip, "wireguard_no_available_ip");
      result = await this.call("/api/addPeers/" + conf, "POST", {
        name: a.username,
        allowed_ips: [ip],
        private_key: a.wgPrivate,
        public_key: a.wgPublic,
        preshared_key: a.wgPreshared,
      });
    } else if (this.type === "mikrotik") {
      result = await this.call("/rest/user-manager/user", "PUT", {
        name: a.username,
        password: a.password,
        "shared-users": String(a.options.sharedUsers || 1),
      });
    }
    return result;
  }
  async ibsCreate(a) {
    let progress = await get(this.env, "provider-progress", a.operationId);
    if (!progress) {
      const r = await this.request(
        "/IBSng/admin/user/add_new_users.php",
        "POST",
        new URLSearchParams({
          submit_form: "1",
          add: "1",
          count: "1",
          credit: String(a.options.initialCredit || 1),
          owner_name: this.secret.username,
          group_name: a.options.group || a.options.profile || "",
          edit__normal_username: "1",
        }),
      );
      assert(
        r.ok || [302, 303].includes(r.status),
        "provider_rejected_request",
      );
      const text = (r.headers.get("location") || "") + " " + r.text;
      const userId = /[?&]user_id=(\d+)/.exec(text)?.[1];
      assert(userId, "ibsng_user_id_unconfirmed", 502);
      progress = { panelId: this.panel.id, userId, username: a.username };
      await put(this.env, "provider-progress", a.operationId, progress);
    }
    assert(
      progress.panelId === this.panel.id && progress.username === a.username,
      "provider_progress_mismatch",
    );
    const params = new URLSearchParams({
      edit_user: "1",
      user_id: progress.userId,
      submit_form: "1",
      add: "1",
      count: "1",
      credit: "1",
      owner_name: this.secret.username,
      group_name: a.options.group || a.options.profile || "",
      edit__normal_username: "normal_username",
    });
    const r = await this.request(
      "/IBSng/admin/plugins/edit.php?" + params,
      "POST",
      new URLSearchParams({
        target: "user",
        target_id: progress.userId,
        update: "1",
        edit_tpl_cs: "normal_username",
        attr_update_method_0: "normalAttrs",
        has_normal_username: "t",
        current_normal_username: "",
        normal_username: a.username,
        password: a.password,
        normal_save_user_add: "t",
        credit: String(a.options.initialCredit || 1),
      }),
    );
    assert(r.ok || [302, 303].includes(r.status), "provider_rejected_request");
    const user = await this.get(a);
    assert(
      user && user.remoteId === progress.userId,
      "ibsng_user_assignment_unconfirmed",
      502,
    );
    return { ok: true };
  }
  async suiSave(action, data) {
    return this.call(
      "/apiv2/save",
      "POST",
      new URLSearchParams({
        object: "clients",
        action,
        data: typeof data === "string" ? data : JSON.stringify(data),
      }),
    );
  }
  async update(a, desired) {
    this.supported("renew");
    if (this.modern) return this.modern.update(a, desired);
    if (isMarzLike(this.type)) {
      const body = { data_limit: desired.dataLimit };
      if (this.type === "marzneshin") {
        body.expire_strategy = desired.expiresAt ? "fixed_date" : "never";
        body.expire_date = desired.expiresAt
          ? new Date(desired.expiresAt * 1000).toISOString()
          : null;
      } else
        body.expire =
          this.type === "marzban_v1" || this.type === "pasarguard"
            ? desired.expiresAt
              ? new Date(desired.expiresAt * 1000).toISOString()
              : null
            : desired.expiresAt;
      return this.call(
        (this.type === "marzneshin" ? "/api/users/" : "/api/user/") +
          encodeURIComponent(a.username),
        "PUT",
        body,
      );
    }
    if (this.type === "guard")
      return this.call(
        "/api/subscriptions/" + encodeURIComponent(a.username),
        "PUT",
        {
          limit_usage: desired.dataLimit,
          limit_expire: desired.expiresAt
            ? new Date(desired.expiresAt * 1000).toISOString()
            : null,
        },
      );
    const remote = await this.get(a);
    assert(remote, "remote_service_missing", 404);
    if (this.type === "alireza_inbound") {
      const settings = parse(remote.raw.inbound.settings);
      settings.clients = (settings.clients || []).map((c) => ({
        ...c,
        totalGB: desired.dataLimit,
        expiryTime: desired.expiresAt * 1000,
      }));
      return this.call(this.root + "/update/" + remote.remoteId, "POST", {
        ...remote.raw.inbound,
        total: desired.dataLimit,
        expiryTime: desired.expiresAt * 1000,
        settings: JSON.stringify(settings),
      });
    }
    if (["xui", "xui_token", "alireza"].includes(this.type)) {
      const c = {
        ...remote.raw.client,
        totalGB: desired.dataLimit,
        expiryTime: desired.expiresAt * 1000,
      };
      if (this.type === "xui_token")
        return this.call(
          "/panel/api/clients/update/" + encodeURIComponent(a.username),
          "POST",
          c,
        );
      return this.call(
        this.root + "/updateClient/" + encodeURIComponent(remote.remoteId),
        "POST",
        { id: Number(a.inboundId), settings: JSON.stringify({ clients: [c] }) },
      );
    }
    if (this.type === "sui")
      return this.suiSave("edit", {
        ...remote.raw,
        volume: desired.dataLimit,
        expiry: desired.expiresAt,
      });
    if (this.type === "hiddify") {
      const days = Math.max(
        0,
        Math.ceil((desired.expiresAt - epoch()) / 86400),
      );
      return this.call("/api/v2/admin/user/" + remote.remoteId + "/", "PATCH", {
        usage_limit_GB: desired.dataLimit / GB,
        package_days: days,
        start_date: new Date().toISOString().slice(0, 10),
      });
    }
    if (this.type === "wgdashboard")
      return this.wgLimits({
        ...a,
        dataLimit: desired.dataLimit,
        expiresAt: desired.expiresAt,
      });
    throw new RemoteError("panel_action_unsupported", { status: 400 });
  }
  async wgLimits(a) {
    const conf = this.options.interface || "wg0",
      remote = await this.get(a);
    assert(remote, "remote_service_missing");
    for (const [field, value] of [
      ["total_data", a.dataLimit / GB],
      [
        "date",
        a.expiresAt
          ? new Date(a.expiresAt * 1000)
              .toISOString()
              .replace("T", " ")
              .slice(0, 19)
          : null,
      ],
    ]) {
      const h = await hash(this.panel.id + "|" + a.wgPublic + "|" + field),
        jobId =
          h.slice(0, 8) +
          "-" +
          h.slice(8, 12) +
          "-4" +
          h.slice(13, 16) +
          "-8" +
          h.slice(17, 20) +
          "-" +
          h.slice(20, 32);
      const current = (remote.raw.jobs || []).filter(
        (j) => j.Field === field && j.Action === "restrict",
      );
      assert(
        current.every((j) => j.JobID === jobId),
        "unmanaged_wireguard_schedule_requires_review",
      );
      for (const job of current)
        await this.call("/api/deletePeerScheduleJob", "POST", { Job: job });
      if (value)
        await this.call("/api/savePeerScheduleJob", "POST", {
          Job: {
            JobID: jobId,
            Configuration: conf,
            Peer: a.wgPublic,
            Field: field,
            Operator: "lgt",
            Value: String(value),
            CreationDate: "",
            ExpireDate: null,
            Action: "restrict",
          },
        });
    }
    return { ok: true };
  }

  async finishCreate(a) {
    if (this.type === "wgdashboard") {
      await this.wgLimits(a);
      const data = await this.call(
        "/api/downloadPeer/" +
          encodeURIComponent(this.options.interface || "wg0") +
          "?id=" +
          encodeURIComponent(a.wgPublic),
      );
      const config =
        data?.data?.file ||
        data?.data?.configuration ||
        data?.data?.config ||
        data?.data ||
        "";
      assert(
        typeof config === "string" && config.includes("[Interface]"),
        "wireguard_config_unavailable",
      );
      return { ...(await this.get(a)), configs: [config] };
    }
    if (
      this.type === "mikrotik" &&
      (a.options.profile || this.options.profile)
    ) {
      await this.call("/rest/user-manager/user-profile", "PUT", {
        user: a.username,
        profile: a.options.profile || this.options.profile,
      });
    }
    const result = await this.get(a);
    assert(result, "provider_created_user_not_found", 502);
    if (result.subscriptionUrl) {
      const url = new URL(result.subscriptionUrl, this.panel.url + "/");
      assert(url.protocol === "https:", "insecure_subscription_url");
      result.subscriptionUrl = url.href;
    }
    if (this.type === "mikrotik")
      result.configs = [
        `Username: ${a.username}\nPassword: ${a.password}\nServer: ${this.options.serverAddress || new URL(this.panel.url).hostname}`,
      ];
    assert(
      result.configs?.length || result.subscriptionUrl,
      "service_connection_details_missing",
    );
    return result;
  }
  async toggle(a, enabled) {
    this.supported("toggle");
    if (this.modern) return this.modern.toggle(a, enabled);
    if (this.type === "guard")
      return this.call(
        "/api/subscriptions/" + (enabled ? "enable" : "disable"),
        "POST",
        { usernames: [a.username] },
      );
    if (this.type === "marzneshin")
      return this.call(
        "/api/users/" +
          encodeURIComponent(a.username) +
          (enabled ? "/enable" : "/disable"),
        "POST",
        {},
      );
    if (isMarzLike(this.type))
      return this.call("/api/user/" + encodeURIComponent(a.username), "PUT", {
        status: enabled ? "active" : "disabled",
      });
    const remote = await this.get(a);
    assert(remote, "remote_service_missing", 404);
    if (this.type === "alireza_inbound")
      return this.call(this.root + "/update/" + remote.remoteId, "POST", {
        ...remote.raw.inbound,
        enable: enabled,
      });
    if (["xui", "alireza", "xui_token"].includes(this.type)) {
      const c = { ...remote.raw.client, enable: enabled };
      return this.type === "xui_token"
        ? this.call(
            "/panel/api/clients/update/" + encodeURIComponent(a.username),
            "POST",
            c,
          )
        : this.call(
            this.root + "/updateClient/" + encodeURIComponent(remote.remoteId),
            "POST",
            {
              id: Number(a.inboundId),
              settings: JSON.stringify({ clients: [c] }),
            },
          );
    }
    if (this.type === "sui")
      return this.suiSave("edit", { ...remote.raw, enable: enabled });
    if (this.type === "hiddify")
      return this.call("/api/v2/admin/user/" + remote.remoteId + "/", "PATCH", {
        enable: enabled,
      });
    if (this.type === "wgdashboard")
      return this.call(
        "/api/" +
          (enabled ? "allowAccessPeers" : "restrictPeers") +
          "/" +
          encodeURIComponent(this.options.interface || "wg0"),
        "POST",
        { peers: [a.wgPublic] },
      );
    if (this.type === "mikrotik")
      return this.call(
        "/rest/user-manager/user/" + encodeURIComponent(remote.remoteId),
        "PATCH",
        { disabled: enabled ? "false" : "true" },
      );
  }
  async remove(a) {
    this.supported("delete");
    if (this.modern) return this.modern.remove(a);
    if (this.type === "guard")
      return this.call("/api/subscriptions", "DELETE", {
        usernames: [a.username],
      });
    if (isMarzLike(this.type))
      return this.call(
        (this.type === "marzneshin" ? "/api/users/" : "/api/user/") +
          encodeURIComponent(a.username),
        "DELETE",
      );
    const remote = await this.get(a);
    if (!remote) return { alreadyDeleted: true };
    if (this.type === "alireza_inbound")
      return this.call(this.root + "/del/" + remote.remoteId, "POST", {});
    if (this.type === "ibsng") {
      const r = await this.request(
        "/IBSng/admin/user/del_user.php",
        "POST",
        new URLSearchParams({
          user_id: remote.remoteId,
          delete: "1",
          delete_comment: "BotPanel deletion",
        }),
      );
      assert(
        r.ok || [302, 303].includes(r.status),
        "provider_rejected_request",
      );
      assert(!(await this.get(a)), "remote_delete_not_confirmed");
      return { ok: true };
    }
    if (["xui", "alireza", "xui_token"].includes(this.type))
      return this.type === "xui_token"
        ? this.call(
            "/panel/api/clients/del/" + encodeURIComponent(a.username),
            "POST",
            {},
          )
        : this.call(
            this.root +
              "/" +
              a.inboundId +
              "/delClient/" +
              encodeURIComponent(remote.remoteId),
            "POST",
            {},
          );
    if (this.type === "sui")
      return this.suiSave("del", String(remote.remoteId));
    if (this.type === "hiddify")
      return this.call("/api/v2/admin/user/" + remote.remoteId + "/", "DELETE");
    if (this.type === "wgdashboard") {
      await this.toggle(a, true);
      return this.call(
        "/api/deletePeers/" +
          encodeURIComponent(this.options.interface || "wg0"),
        "POST",
        { peers: [a.wgPublic] },
      );
    }
    if (this.type === "mikrotik")
      return this.call(
        "/rest/user-manager/user/" + encodeURIComponent(remote.remoteId),
        "DELETE",
      );
  }
  async reset(a) {
    this.supported("reset");
    if (this.modern) return this.modern.reset(a);
    if (this.type === "alireza_inbound") {
      const r = await this.get(a);
      assert(r, "remote_service_missing");
      return this.call(
        this.root + "/resetAllClientTraffics/" + r.remoteId,
        "POST",
        {},
      );
    }
    if (this.type === "guard")
      return this.call("/api/subscriptions/reset", "POST", {
        usernames: [a.username],
      });
    if (isMarzLike(this.type))
      return this.call(
        (this.type === "marzneshin" ? "/api/users/" : "/api/user/") +
          encodeURIComponent(a.username) +
          "/reset",
        "POST",
        {},
      );
    if (["xui", "alireza"].includes(this.type))
      return this.call(
        this.root +
          "/" +
          a.inboundId +
          "/resetClientTraffic/" +
          encodeURIComponent(a.username),
        "POST",
        {},
      );
    if (this.type === "xui_token")
      return this.call(
        "/panel/api/clients/resetTraffic/" + encodeURIComponent(a.username),
        "POST",
        {},
      );
    const r = await this.get(a);
    assert(r, "remote_service_missing");
    if (this.type === "sui")
      return this.suiSave("edit", { ...r.raw, up: 0, down: 0 });
    if (this.type === "wgdashboard")
      return this.call(
        "/api/resetPeerData/" +
          encodeURIComponent(this.options.interface || "wg0"),
        "POST",
        { id: a.wgPublic, type: "total" },
      );
    if (this.type === "hiddify")
      return this.call("/api/v2/admin/user/" + r.remoteId + "/", "PATCH", {
        current_usage_GB: 0,
      });
  }
  async revoke(a, newUUID, newSubId) {
    this.supported("revoke");
    if (this.modern) return this.modern.revoke(a);
    if (this.type === "alireza_inbound") {
      const r = await this.get(a);
      assert(r, "remote_service_missing");
      const settings = parse(r.raw.inbound.settings);
      settings.clients = settings.clients.map((c) => ({
        ...c,
        id: newUUID,
        password: newUUID,
        subId: newSubId,
      }));
      return this.call(this.root + "/update/" + r.remoteId, "POST", {
        ...r.raw.inbound,
        settings: JSON.stringify(settings),
      });
    }
    if (this.type === "guard")
      return this.call("/api/subscriptions/revoke", "POST", {
        usernames: [a.username],
      });
    if (isMarzLike(this.type))
      return this.call(
        (this.type === "marzneshin" ? "/api/users/" : "/api/user/") +
          encodeURIComponent(a.username) +
          "/revoke_sub",
        "POST",
        {},
      );
    const r = await this.get(a);
    assert(r, "remote_service_missing");
    if (this.type === "sui") {
      const config = structuredClone(r.raw.config);
      for (const v of Object.values(config)) {
        if (v.uuid) v.uuid = newUUID;
        if (v.password) v.password = newUUID;
        if (v.auth_str) v.auth_str = newUUID;
      }
      return this.suiSave("edit", { ...r.raw, config });
    }
    const c = {
      ...r.raw.client,
      id: newUUID,
      password: newUUID,
      subId: newSubId,
    };
    return this.type === "xui_token"
      ? this.call(
          "/panel/api/clients/update/" + encodeURIComponent(a.username),
          "POST",
          c,
        )
      : this.call(
          this.root + "/updateClient/" + encodeURIComponent(r.remoteId),
          "POST",
          {
            id: Number(a.inboundId),
            settings: JSON.stringify({ clients: [c] }),
          },
        );
  }
}
export function prepareAccount(
  panel,
  plan,
  operationId,
  ownerId,
  customName = "",
) {
  const username = customName || `bp_${ownerId}_${operationId.slice(0, 10)}`;
  assert(
    /^[a-zA-Z][a-zA-Z0-9_\-]{2,59}$/.test(username),
    "invalid_service_name",
  );
  // PasarGuard usernames: 3–32 chars, lowercase latin, digits, underscore.
  if (panel.type === "pasarguard")
    assert(/^[a-z][a-z0-9_]{2,31}$/.test(username), "invalid_service_name");
  const a = {
    username,
    uuid: crypto.randomUUID(),
    password: randomToken().slice(0, 24),
    subId: id(),
    operationId,
    options: { ...panel.options, ...plan.options },
    inboundId: plan.options?.inboundId || panel.options?.inboundId || 1,
    dataLimit: Math.round(plan.volumeGB * GB),
    durationDays: plan.days,
    expiresAt: plan.days ? epoch() + plan.days * 86400 : 0,
    firstUse: !!plan.firstUse,
  };
  if (isModernProvider(panel.type)) {
    validateModernOptions(panel.type, a.options, true);
    if (panel.type === "remnawave") {
      assert(username.length <= 36, "invalid_service_name");
      assert(!a.firstUse, "first_use_not_supported");
      assert(a.expiresAt > 0, "finite_expiry_required");
    }
  }
  if (panel.type === "wgdashboard") {
    const priv = crypto.getRandomValues(new Uint8Array(32));
    a.wgPrivate = b64(priv);
    a.wgPublic = b64(x25519.getPublicKey(priv));
    a.wgPreshared = b64(crypto.getRandomValues(new Uint8Array(32)));
  }
  return a;
}
export function xuiLinks(panel, inbound, client) {
  const host = panel.options?.publicHost || new URL(panel.url).hostname,
    port = inbound.port,
    stream = parse(inbound.streamSettings),
    type = stream.network || "tcp",
    security = stream.security || "none";
  if (!port) return [];
  const params = new URLSearchParams({ type, security });
  if (client.flow) params.set("flow", client.flow);
  const tls = stream.tlsSettings || {},
    reality = stream.realitySettings || {},
    ws = stream.wsSettings || {},
    grpc = stream.grpcSettings || {};
  if (security === "tls") {
    if (tls.serverName) params.set("sni", tls.serverName);
    if (tls.settings?.fingerprint) params.set("fp", tls.settings.fingerprint);
  }
  if (security === "reality") {
    if (reality.serverNames?.[0]) params.set("sni", reality.serverNames[0]);
    if (reality.settings?.publicKey)
      params.set("pbk", reality.settings.publicKey);
    else if (reality.privateKey) {
      try {
        params.set(
          "pbk",
          b64(x25519.getPublicKey(bytes64(reality.privateKey)))
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=+$/, ""),
        );
      } catch {}
    }
    if (reality.shortIds?.[0]) params.set("sid", reality.shortIds[0]);
    params.set("fp", reality.settings?.fingerprint || "chrome");
  }
  if (type === "ws") {
    params.set("path", ws.path || "/");
    if (ws.headers?.Host) params.set("host", ws.headers.Host);
  }
  if (type === "grpc") params.set("serviceName", grpc.serviceName || "");
  if (inbound.protocol === "vless")
    return [
      `vless://${client.id}@${host}:${port}?${params}#${encodeURIComponent(client.email)}`,
    ];
  if (inbound.protocol === "trojan")
    return [
      `trojan://${encodeURIComponent(client.password || client.id)}@${host}:${port}?${params}#${encodeURIComponent(client.email)}`,
    ];
  if (inbound.protocol === "vmess")
    return [
      "vmess://" +
        b64(
          new TextEncoder().encode(
            JSON.stringify({
              v: "2",
              ps: client.email,
              add: host,
              port: String(port),
              id: client.id,
              aid: "0",
              scy: "auto",
              net: type,
              type: "none",
              host: ws.headers?.Host || "",
              path: ws.path || grpc.serviceName || "",
              tls: security === "tls" ? "tls" : "",
              sni: tls.serverName || "",
            }),
          ),
        ),
    ];
  return [];
}
