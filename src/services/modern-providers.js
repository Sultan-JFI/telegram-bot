// HTTP contracts only; no PHP runtime or upstream implementation is bundled.
import { assert, integer, isoSeconds, expectResponse } from "./common.js";

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isModernProvider = (type) => ["remnawave", "rebecca"].includes(type);

export function validateModernOptions(type, options, required = false) {
  if (type === "remnawave") {
    const squads = options.squadIds;
    assert((!required && squads === undefined) ||
      (Array.isArray(squads) && (!required || squads.length > 0) && squads.length <= 100 &&
        squads.every((s) => typeof s === "string" && UUID.test(s))), "invalid_squad_ids");
    if (options.hwidDeviceLimit !== undefined)
      integer(options.hwidDeviceLimit, 0, 1000, "invalid_device_limit");
  }
  if (type === "rebecca") {
    if (required || options.serviceId !== undefined)
      integer(options.serviceId, 1, 2147483647, "rebecca_service_required");
    if (options.ipLimit !== undefined)
      integer(options.ipLimit, 0, 1000, "invalid_device_limit");
  }
}

// The Connector supplies bounded HTTPS transport, encrypted credentials and CF Access.
export class ModernProvider {
  constructor(transport, normalize) {
    this.api = transport;
    this.type = transport.type;
    this.normalize = normalize;
  }
  call(...args) { return this.api.call(...args); }
  async resources() {
    return this.call(this.type === "remnawave" ? "/api/internal-squads" : "/api/v2/services");
  }
  async health() {
    const start = Date.now();
    const data = await this.call(this.type === "remnawave" ? "/api/system/stats" : "/api/system");
    assert(data && typeof data === "object", "provider_invalid_response", 502);
    return { ok: true, ms: Date.now() - start, at: Date.now(), data };
  }
  async nodes() {
    const value = await this.call("/api/nodes");
    const rows = value?.response?.nodes;
    assert(Array.isArray(rows), "provider_invalid_nodes", 502);
    return rows.map((n) => ({ ...n, id: n.uuid,
      status: n.isDisabled ? "disabled" : n.isConnected ? "connected" : "disconnected" }));
  }
  async reconnectNode(nodeId) {
    assert(this.type === "remnawave" && UUID.test(String(nodeId)), "invalid_node_id");
    return this.call(`/api/nodes/${encodeURIComponent(nodeId)}/actions/restart`, "POST", {});
  }
  async get(a) {
    const response = await this.api.request(
      (this.type === "remnawave" ? "/api/users/by-username/" : "/api/user/") + encodeURIComponent(a.username),
    );
    if (response.status === 404) return null;
    const value = expectResponse(response);
    assert(value && typeof value === "object", "provider_invalid_response", 502);
    const raw = this.type === "remnawave" ? value.response : value;
    assert(raw && typeof raw === "object" && raw.username === a.username,
      "provider_user_mismatch", 502);
    if (this.type === "rebecca") return this.normalize(raw);
    assert(raw.id != null || UUID.test(raw.uuid || ""), "provider_invalid_user", 502);
    const statuses = { ACTIVE: "active", DISABLED: "disabled", LIMITED: "limited", EXPIRED: "expired" };
    assert(Object.hasOwn(statuses, raw.status), "provider_invalid_user", 502);
    const normalized = this.normalize(raw, {
      remoteId: String(raw.id ?? raw.uuid),
      dataLimit: Number(raw.trafficLimitBytes || 0),
      usedBytes: Number(raw.userTraffic?.usedTrafficBytes ?? raw.usedTrafficBytes ?? 0),
      expiresAt: isoSeconds(raw.expireAt),
      status: statuses[raw.status],
      subscriptionUrl: raw.subscriptionUrl || "",
      // Preserve a stable marker across credential rotations and reconciliation.
      raw: { ...raw, note: raw.description },
    });
    assert(Number.isFinite(normalized.dataLimit) && normalized.dataLimit >= 0 &&
      Number.isFinite(normalized.usedBytes) && normalized.usedBytes >= 0 && normalized.expiresAt > 0,
      "provider_invalid_user", 502);
    return normalized;
  }
  async create(a) {
    validateModernOptions(this.type, a.options, true);
    if (this.type === "remnawave") {
      assert(!a.firstUse, "first_use_not_supported");
      assert(a.expiresAt > 0, "finite_expiry_required");
      return this.call("/api/users", "POST", {
        username: a.username, status: "ACTIVE",
        trafficLimitBytes: a.dataLimit, trafficLimitStrategy: "NO_RESET",
        expireAt: new Date(a.expiresAt * 1000).toISOString(),
        activeInternalSquads: a.options.squadIds,
        hwidDeviceLimit: Number(a.options.hwidDeviceLimit ?? 0),
        vlessUuid: a.uuid, trojanPassword: a.password,
        description: `BotPanel ${a.operationId}`,
      });
    }
    return this.call("/api/v2/users", "POST", {
      username: a.username, data_limit: a.dataLimit,
      service_id: Number(a.options.serviceId), ip_limit: Number(a.options.ipLimit || 0),
      note: `BotPanel ${a.operationId}`,
      ...(a.firstUse ? { status: "on_hold", on_hold_expire_duration: a.durationDays * 86400 }
        : { expire: a.expiresAt || null }),
    });
  }
  async update(a, desired) {
    if (this.type === "rebecca") return this.call(`/api/v2/users/${encodeURIComponent(a.username)}`, "PUT", {
      data_limit: desired.dataLimit, expire: desired.expiresAt || null,
    });
    assert(desired.expiresAt > 0, "finite_expiry_required");
    // Absolute targets: retry/reconciliation cannot accidentally add volume twice.
    return this.call("/api/users", "PATCH", {
      username: a.username, trafficLimitBytes: desired.dataLimit,
      expireAt: new Date(desired.expiresAt * 1000).toISOString(),
    });
  }
  async action(a, action, body = {}) {
    const remote = await this.get(a);
    assert(remote, "remote_service_missing", 404);
    return this.call(`/api/users/${encodeURIComponent(remote.remoteId)}/actions/${action}`, "POST", body);
  }
  async toggle(a, enabled) {
    return this.type === "remnawave"
      ? this.action(a, enabled ? "enable" : "disable")
      : this.call(`/api/v2/users/${encodeURIComponent(a.username)}`, "PUT", { status: enabled ? "active" : "disabled" });
  }
  async remove(a) {
    if (this.type === "rebecca") return this.call(`/api/user/${encodeURIComponent(a.username)}`, "DELETE");
    const remote = await this.get(a);
    return remote ? this.call(`/api/users/${encodeURIComponent(remote.remoteId)}`, "DELETE") : { alreadyDeleted: true };
  }
  async reset(a) {
    return this.type === "remnawave" ? this.action(a, "reset-traffic")
      : this.call(`/api/user/${encodeURIComponent(a.username)}/reset`, "POST", {});
  }
  async revoke(a) {
    return this.type === "remnawave" ? this.action(a, "revoke", { revokeOnlyPasswords: false })
      : this.call(`/api/user/${encodeURIComponent(a.username)}/revoke_sub`, "POST", {});
  }
}
