import {
  MODERN_GATEWAYS, isModernGateway, POLLED_GATEWAYS, createModernInvoice,
  verifyModernInvoice, verifyTronadoWebhook,
} from "./modern-gateways.js";
import { getSettings, getUser } from "../kv.js";
import { resolveToken, tgApi, sendToUser } from "../bot-api.js";
import {
  get,
  put,
  key,
  list,
  commitJson,
  assert,
  id,
  str,
  integer,
  money,
  seal,
  unseal,
  randomToken,
  hash,
  constantEqual,
  hex,
  hmac,
  decimalUnits,
  decimalString,
  fetchLimited,
  limitedRequestText,
  expectResponse,
  publicHTTPS,
  xml,
  MAX_MONEY,
  audit,
} from "./common.js";
import { serviceSettings } from "./settings.js";
import { quoteRates } from "./rates.js";
import { walletWrites } from "./wallet.js";
import {
  CRYPTO,
  verifyCrypto,
  tronAddress,
  tonAddress,
  transactionHash,
} from "./crypto-pay.js";

export const GATEWAYS = {
  ...MODERN_GATEWAYS,
  manual: "کارت‌به‌کارت",
  tetrapay: "TetraPay / IRanpay 1 (FloyPay)",
  iranpay3: "IRanpay 3 / Factor API",
  zarinpal: "زرین‌پال",
  aqaye: "آقای پرداخت",
  zarinpay: "زرین‌پی",
  nowpayments: "NOWPayments",
  plisio: "Plisio",
  stars: "Telegram Stars",
  crypto: "TRON / TON",
};
export const gatewayView = (g) => {
  const { secret, ...safe } = g;
  return {
    ...safe,
    configured:
      g.type === "manual" ||
      g.type === "stars" ||
      g.type === "crypto" ||
      !!secret,
  };
};
export async function saveGateway(env, b, old = {}) {
  assert(Object.hasOwn(GATEWAYS, b.type || old.type), "unsupported_gateway");
  const g = {
    ...old,
    id: old.id || id(),
    title: str(b.title, 100) || GATEWAYS[b.type],
    type: b.type || old.type,
    enabled: b.enabled !== false,
    cashback: integer(b.cashback || 0, 0, 100),
    currency: str(b.currency, 16) || "USDT_TRC20",
    address: str(b.address, 128),
    coinToman: money(b.coinToman || 0),
    feePercent: integer(b.feePercent ?? old.feePercent ?? 0, 0, 100),
    feeToman: money(b.feeToman ?? old.feeToman ?? 0),
    wagePercent: integer(b.wagePercent ?? old.wagePercent ?? 0, 0, 100),
    confirmations: integer(b.confirmations || 20, 1, 1000),
    cardNumber: str(b.cardNumber, 24).replace(/[ -]/g, ""),
    cardHolder: str(b.cardHolder, 100),
    sandbox: !!b.sandbox,
    createdAt: old.createdAt || Date.now(),
  };
  if (g.type === "manual")
    assert(/^\d{16}$/.test(g.cardNumber), "invalid_card_number");
  if (["plisio", "iranpay3"].includes(g.type)) g.currency = "TRX";
  if (g.type === "iranpay3") {
    await tronAddress(g.address);
    assert(
      g.coinToman > 0 ||
        (await serviceSettings(env)).rates.mode === "swapwallet",
      "crypto_rate_required",
    );
  }
  if (g.type === "crypto") {
    assert(CRYPTO[g.currency], "unsupported_crypto");
    if (CRYPTO[g.currency].network === "TRON") await tronAddress(g.address);
    else tonAddress(g.address);
    assert(
      g.coinToman > 0 ||
        (await serviceSettings(env)).rates.mode === "swapwallet",
      "crypto_rate_required",
    );
  }
  if (b.secret && Object.values(b.secret).some((v) => String(v).trim())) {
    const s = old.secret ? await unseal(env, old.secret) : {};
    for (const k of ["apiKey", "merchant", "ipnSecret"])
      if (b.secret[k]) s[k] = str(b.secret[k], 2048);
    g.secret = await seal(env, s);
  }
  assert(
    ["manual", "crypto", "stars"].includes(g.type) || g.secret,
    "gateway_credentials_required",
  );
  if (isModernGateway(g.type)) {
    const secret = await unseal(env, g.secret);
    assert(secret.apiKey, "gateway_credentials_required");
    if (g.type === "tronado") {
      assert(secret.ipnSecret, "ipn_secret_required");
      await tronAddress(g.address);
    }
  }
  await put(env, "gateway", g.id, g);
  return g;
}
async function baseURL(env) {
  const s = await serviceSettings(env),
    v2 = await getSettings(env),
    base = s.publicUrl || env.PUBLIC_BASE_URL || v2.publicBaseUrl;
  assert(base && publicHTTPS(base), "public_url_required");
  return base.replace(/\/$/, "");
}
export const paymentView = (p) => {
  const { nonce, payload, gatewaySnapshot, receipt, ...safe } = p;
  return { ...safe, hasReceipt: !!receipt };
};
async function apiJSON(url, method = "GET", body, headers = {}) {
  return expectResponse(
    await fetchLimited(url, {
      method,
      headers: { "content-type": "application/json", ...headers },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }),
  );
}
function usdPrice(amount, rate) {
  assert(rate > 0, "usd_rate_required");
  return decimalString(
    (BigInt(amount) * 100n + BigInt(rate) - 1n) / BigInt(rate),
    2,
  );
}
export async function createPayment(env, userId, b) {
  const nonce = str(b.requestId, 80);
  assert(/^[A-Za-z0-9_-]{8,80}$/.test(nonce), "idempotency_key_required");
  const oldId = await get(env, "payment-request", userId + ":" + nonce);
  if (oldId) {
    const p = await get(env, "payment", oldId);
    assert(
      p.amount === Number(b.amount) && p.gatewayId === b.gatewayId,
      "idempotency_key_conflict",
    );
    return paymentView(p);
  }
  const s = await serviceSettings(env),
    amount = integer(b.amount, s.topupMin, s.topupMax),
    g = await get(env, "gateway", b.gatewayId);
  assert(g?.enabled, "gateway_unavailable");
  assert(
    (await list(env, "payment")).filter(
      (p) =>
        p.userId === String(userId) &&
        ["pending", "creating", "receipt_review"].includes(p.status),
    ).length < 5,
    "too_many_pending_payments",
  );
  const p = {
    id: id(),
    userId: String(userId),
    amount,
    gatewayId: g.id,
    type: g.type,
    gatewaySnapshot: g,
    status: "creating",
    currency: "IRT",
    nonce: randomToken(),
    createdAt: Date.now(),
    expiresAt: Date.now() + s.topupMinutes * 60000,
    cashback: g.cashback,
  };
  const base = await baseURL(env),
    callback = `${base}/service-pay/callback/${p.id}?key=${p.nonce}`,
    resultURL = `${base}/service-pay/result/${p.id}`;
  const secret = g.secret ? await unseal(env, g.secret) : {};
  const rates = ["nowpayments", "plisio", "crypto", "iranpay3"].includes(g.type)
    ? await quoteRates(env, g)
    : null;
  if (rates) p.rateSnapshot = rates;
  if (["nowpayments", "plisio"].includes(g.type)) {
    p.priceUSD = usdPrice(amount, rates.usdToman);
    p.currency = "USD";
  }
  if (g.type === "stars") {
    assert(s.starToman > 0, "star_rate_required");
    p.stars = Math.ceil(amount / s.starToman);
    assert(p.stars > 0 && p.stars <= 100000, "stars_amount_limit");
    p.currency = "XTR";
    p.payload = `svc:${p.id}:${p.nonce.slice(0, 24)}`;
  }
  if (g.type === "iranpay3") {
    assert(rates.coinToman > 0, "crypto_rate_required");
    p.currency = "TRX";
    p.address = g.address;
    p.cryptoAmount = usdPrice(amount, rates.coinToman);
  }
  if (g.type === "crypto") {
    assert(rates.coinToman > 0, "crypto_rate_required");
    const coin = CRYPTO[g.currency];
    p.currency = g.currency;
    p.address = g.address;
    p.cryptoAmount = decimalString(
      (BigInt(amount) * 10n ** BigInt(coin.decimals) +
        BigInt(rates.coinToman) -
        1n) /
        BigInt(rates.coinToman),
      coin.decimals,
    );
    p.memo = p.id;
  }
  await commitJson(env, [
    [key("payment", p.id), p],
    [key("payment-request", userId + ":" + nonce), p.id],
  ]);
  try {
    if (g.type === "manual") {
      p.cardNumber = g.cardNumber;
      p.cardHolder = g.cardHolder;
    } else if (isModernGateway(g.type)) {
      Object.assign(p, await createModernInvoice(p, g, secret,
        g.type === "tronado" ? callback.replace("/callback/", "/notify/") : callback));
    } else if (g.type === "tetrapay") {
      const response = await apiJSON(
        "https://tetra98.com/api/create_order",
        "POST",
        {
          ApiKey: secret.apiKey || secret.merchant,
          Hash_id: p.id,
          Amount: String(p.amount * 10),
          CallbackURL: callback,
        },
      );
      assert(
        response.Authority && typeof response.payment_url_bot === "string",
        "gateway_create_failed",
      );
      p.remoteId = String(response.Authority);
      p.url = response.payment_url_bot;
    } else if (g.type === "iranpay3") {
      const form = new FormData();
      form.set("amount", p.cryptoAmount);
      form.set("address", g.address);
      form.set("base", "trx");
      const response = expectResponse(
        await fetchLimited("https://pay.melorinabeauty.ir/api/factor/create", {
          method: "POST",
          headers: { Authorization: "Token " + secret.apiKey },
          body: form,
        }),
      );
      assert(
        response.success === true && response.data?.id,
        "gateway_create_failed",
      );
      p.remoteId = String(response.data.id);
      p.url =
        "https://t.me/AvidTrx_Bot?start=" + encodeURIComponent(p.remoteId);
    } else if (g.type === "zarinpal") {
      const domain = g.sandbox ? "sandbox" : "payment";
      const res = await apiJSON(
        `https://${domain}.zarinpal.com/pg/v4/payment/request.json`,
        "POST",
        {
          merchant_id: secret.merchant,
          amount: amount * 10,
          currency: "IRR",
          callback_url: callback,
          description: "Wallet " + p.id,
        },
      );
      assert(
        res.data?.code === 100 && res.data.authority,
        "gateway_create_failed",
      );
      p.remoteId = res.data.authority;
      p.url = `https://${domain}.zarinpal.com/pg/StartPay/${encodeURIComponent(p.remoteId)}`;
    } else if (g.type === "aqaye") {
      const res = await apiJSON(
        "https://panel.aqayepardakht.ir/api/v2/create",
        "POST",
        { pin: secret.merchant, amount, callback, invoice_id: p.id },
      );
      assert(String(res.code) === "1" && res.transid, "gateway_create_failed");
      p.remoteId = String(res.transid);
      p.url =
        "https://panel.aqayepardakht.ir/startpay/" +
        encodeURIComponent(p.remoteId);
    } else if (g.type === "zarinpay") {
      const res = await apiJSON(
        "https://zarinpay.me/api/create-payment",
        "POST",
        {
          amount: amount * 10,
          order_id: p.id,
          callback_url: callback,
          type: "card",
          customer_user_id: p.userId,
          description: "Wallet " + p.id,
        },
        { authorization: "Bearer " + secret.apiKey },
      );
      p.remoteId = res.authority || res.data?.authority;
      p.url =
        res.payment_link ||
        res.payment_url ||
        res.data?.payment_link ||
        res.data?.payment_url;
      assert(res.success && p.remoteId && p.url, "gateway_create_failed");
    } else if (g.type === "nowpayments") {
      const res = await apiJSON(
        "https://api.nowpayments.io/v1/invoice",
        "POST",
        {
          price_amount: Number(p.priceUSD),
          price_currency: "usd",
          order_id: p.id,
          order_description: "Wallet " + p.id,
          ipn_callback_url: `${base}/service-pay/notify/${p.id}?key=${p.nonce}`,
          success_url: resultURL,
          cancel_url: resultURL,
        },
        { "x-api-key": secret.apiKey },
      );
      assert(res.id && res.invoice_url, "gateway_create_failed");
      p.remoteId = String(res.id);
      p.url = res.invoice_url;
    } else if (g.type === "plisio") {
      const query = new URLSearchParams({
        api_key: secret.apiKey,
        currency: g.currency || "TRX",
        source_currency: "USD",
        source_amount: p.priceUSD,
        order_number: p.id,
        order_name: "Wallet " + p.id,
        callback_url: `${base}/service-pay/notify/${p.id}?key=${p.nonce}&json=true`,
        success_callback_url: resultURL,
        fail_callback_url: resultURL,
      });
      const res = await apiJSON(
        "https://api.plisio.net/api/v1/invoices/new?" + query,
      );
      assert(
        res.status === "success" && res.data?.txn_id && res.data?.invoice_url,
        "gateway_create_failed",
      );
      p.remoteId = String(res.data.txn_id);
      p.url = res.data.invoice_url;
    } else if (g.type === "stars") {
      const res = await tgApi(await resolveToken(env), "createInvoiceLink", {
        title: "خرید اعتبار خدمات",
        description: "Service credit " + p.id,
        payload: p.payload,
        provider_token: "",
        currency: "XTR",
        prices: [{ label: "Service credit", amount: p.stars }],
      });
      assert(res.ok, "stars_invoice_failed");
      p.url = res.result;
    }
    if (p.url) assert(/^https:\/\//.test(p.url), "unsafe_payment_url");
    p.status = "pending";
    await put(env, "payment", p.id, p);
  } catch (e) {
    p.status = e.uncertain ? "review" : "failed";
    p.error = e.message;
    await put(env, "payment", p.id, p);
    throw e;
  }
  return paymentView(p);
}
export async function settlePayment(env, p, reference, source) {
  if (p.status === "paid") return p;
  assert(
    reference && String(reference).length <= 200,
    "payment_reference_required",
  );
  const refKey = key("payment-ref", await hash(String(reference)));
  const owner = await get(env, "payment-ref", await hash(String(reference)));
  assert(!owner || owner === p.id, "payment_reference_reused", 409);
  const cashback = Math.floor((p.amount * p.cashback) / 100),
    change = await walletWrites(env, p.userId, {
      delta: p.amount + cashback,
      eventId: "deposit:" + p.id,
      reason: "verified_topup",
      paid: p.amount,
      details: { source, reference, cashback },
    });
  p.status = "paid";
  p.reference = String(reference);
  p.verifiedBy = source;
  p.paidAt = Date.now();
  await commitJson(env, [
    ...change.writes,
    [refKey, p.id],
    [key("payment", p.id), p],
  ]);
  await sendToUser(
    await resolveToken(env),
    p.userId,
    `✅ پرداخت تأیید شد / Payment verified\n${p.amount.toLocaleString("fa-IR")} تومان\n#${p.id}\nاعتبار کیف پول شما به‌روز شد.`,
  );
  const settings = await serviceSettings(env);
  if (settings.reportChat)
    await sendToUser(
      await resolveToken(env),
      settings.reportChat,
      `💳 شارژ کیف پول\nUser: ${p.userId}\n${p.amount} IRT\n${p.type}\n#${p.id}`,
    );
  return p;
}
export async function verifyPayment(env, p, callback = {}) {
  if (p.status === "paid") return p;
  const g = p.gatewaySnapshot,
    secret = g.secret ? await unseal(env, g.secret) : {};
  if (isModernGateway(p.type)) {
    assert(["pending", "expired"].includes(p.status), "payment_requires_review", 409);
    return settlePayment(env, p, await verifyModernInvoice(p, secret), "gateway_verify");
  }
  if (p.type === "tetrapay") {
    assert(
      !callback.authority || constantEqual(callback.authority, p.remoteId),
      "authority_mismatch",
    );
    assert(
      !callback.hashid || callback.hashid === p.id,
      "payment_invoice_mismatch",
    );
    const response = await apiJSON("https://tetra98.com/api/verify", "POST", {
      ApiKey: secret.apiKey || secret.merchant,
      authority: p.remoteId,
      hashid: p.id,
    });
    assert(Number(response.status) === 100, "payment_not_verified");
    if (response.authority !== undefined)
      assert(String(response.authority) === p.remoteId, "authority_mismatch");
    if (response.hashid !== undefined)
      assert(String(response.hashid) === p.id, "payment_invoice_mismatch");
    if (response.Amount !== undefined)
      assert(
        decimalUnits(response.Amount, 0) === BigInt(p.amount) * 10n,
        "payment_amount_mismatch",
      );
    return settlePayment(env, p, "tetrapay:" + p.remoteId, "gateway_verify");
  }
  if (p.type === "iranpay3") {
    const response = await apiJSON(
      "https://pay.melorinabeauty.ir/api/factor/status?id=" +
        encodeURIComponent(p.remoteId),
      "GET",
      undefined,
      { Authorization: "Token " + secret.apiKey },
    );
    assert(
      response.success === true && response.data?.status === "approved",
      "payment_not_verified",
    );
    const result = response.data;
    if (result.id !== undefined)
      assert(String(result.id) === p.remoteId, "payment_invoice_mismatch");
    if (result.amount !== undefined)
      assert(
        decimalUnits(result.amount, 6) >= decimalUnits(p.cryptoAmount, 6),
        "payment_amount_mismatch",
      );
    if (result.base !== undefined)
      assert(
        String(result.base).toLowerCase() === "trx",
        "payment_currency_mismatch",
      );
    if (result.address !== undefined)
      assert(
        (await tronAddress(result.address)) === (await tronAddress(p.address)),
        "payment_recipient_mismatch",
      );
    return settlePayment(env, p, "iranpay3:" + p.remoteId, "gateway_verify");
  }
  if (p.type === "zarinpal") {
    assert(
      constantEqual(callback.Authority || p.remoteId, p.remoteId),
      "authority_mismatch",
    );
    const domain = g.sandbox ? "sandbox" : "payment";
    const r = await apiJSON(
      `https://${domain}.zarinpal.com/pg/v4/payment/verify.json`,
      "POST",
      {
        merchant_id: secret.merchant,
        amount: p.amount * 10,
        authority: p.remoteId,
      },
    );
    assert(
      [100, 101].includes(r.data?.code) && r.data.ref_id,
      "payment_not_verified",
    );
    return settlePayment(env, p, "zarinpal:" + r.data.ref_id, "gateway_verify");
  }
  if (p.type === "aqaye") {
    assert(
      constantEqual(callback.transid || p.remoteId, p.remoteId),
      "authority_mismatch",
    );
    const r = await apiJSON(
      "https://panel.aqayepardakht.ir/api/v2/verify",
      "POST",
      { pin: secret.merchant, amount: p.amount, transid: p.remoteId },
    );
    assert(["1", "2"].includes(String(r.code)), "payment_not_verified");
    return settlePayment(env, p, "aqaye:" + p.remoteId, "gateway_verify");
  }
  if (p.type === "zarinpay") {
    assert(
      constantEqual(callback.authority || p.remoteId, p.remoteId),
      "authority_mismatch",
    );
    const r = await apiJSON(
      "https://zarinpay.me/api/verify-payment",
      "POST",
      { authority: p.remoteId, amount: p.amount * 10, order_id: p.id },
      { authorization: "Bearer " + secret.apiKey },
    );
    assert(
      r.success && [100, 101].includes(Number(r.data?.code)),
      "payment_not_verified",
    );
    return settlePayment(env, p, "zarinpay:" + p.remoteId, "gateway_verify");
  }
  if (p.type === "nowpayments") {
    const paymentId = String(callback.payment_id || p.paymentId || "");
    assert(/^\d+$/.test(paymentId), "provider_payment_id_required");
    const r = await apiJSON(
      "https://api.nowpayments.io/v1/payment/" + paymentId,
      "GET",
      undefined,
      { "x-api-key": secret.apiKey },
    );
    assert(
      String(r.invoice_id) === p.remoteId &&
        String(r.order_id) === p.id &&
        String(r.price_currency).toLowerCase() === "usd" &&
        decimalUnits(r.price_amount, 2) === decimalUnits(p.priceUSD, 2),
      "payment_invoice_mismatch",
    );
    assert(r.payment_status === "finished", "payment_not_finished");
    assert(
      decimalUnits(r.actually_paid, 18) >= decimalUnits(r.pay_amount, 18),
      "underpayment",
    );
    p.paymentId = paymentId;
    return settlePayment(env, p, "nowpayments:" + paymentId, "gateway_verify");
  }
  if (p.type === "plisio") {
    const params = new URLSearchParams({
      api_key: secret.apiKey,
      search: p.id,
    });
    const data = await apiJSON(
      "https://api.plisio.net/api/v1/operations?" + params,
    );
    const records = data.data?.operations || [];
    const r = records.find(
      (r) =>
        String(r.txn_id || r.id) === p.remoteId &&
        String(r.order_number) === p.id,
    );
    assert(r && r.status === "completed", "payment_not_finished");
    assert(
      String(r.source_currency).toUpperCase() === "USD" &&
        decimalUnits(r.source_amount, 2) === decimalUnits(p.priceUSD, 2),
      "payment_amount_mismatch",
    );
    return settlePayment(env, p, "plisio:" + p.remoteId, "gateway_verify");
  }
  if (p.type === "crypto") {
    assert(p.txHash, "transaction_hash_required");
    const proof = await verifyCrypto(p, g, secret);
    return settlePayment(env, p, proof.reference, "blockchain_verify");
  }
  assert(false, "manual_or_stars_confirmation_required");
}
export async function attachHash(env, userId, paymentId, value) {
  const p = await get(env, "payment", paymentId);
  assert(
    p && p.userId === String(userId) && p.type === "crypto",
    "payment_not_found",
  );
  assert(
    ["pending", "review", "expired"].includes(p.status),
    "payment_expired",
  );
  p.txHash = transactionHash(value);
  await put(env, "payment", p.id, p);
  try {
    await verifyPayment(env, p);
  } catch (e) {
    p.lastError = e.message;
    await put(env, "payment", p.id, p);
  }
  return paymentView(p);
}
export async function attachReceipt(env, userId, paymentId, receipt) {
  const p = await get(env, "payment", paymentId);
  assert(
    p && p.userId === String(userId) && p.type === "manual",
    "payment_not_found",
  );
  assert(
    p.status === "pending" && p.expiresAt > Date.now(),
    "receipt_not_allowed",
  );
  assert(receipt.fileId, "receipt_required");
  p.receipt = {
    fileId: receipt.fileId,
    name: str(receipt.name, 150),
    at: Date.now(),
  };
  p.status = "receipt_review";
  p.expiresAt = Date.now() + 48 * 3600000;
  await put(env, "payment", p.id, p);
  const s = await serviceSettings(env);
  if (s.reportChat)
    await sendToUser(
      await resolveToken(env),
      s.reportChat,
      `📎 رسید شارژ کیف پول\n${p.userId}\n#${p.id}\n${p.amount} تومان\nبررسی دستی در پنل خدمات`,
    );
  return paymentView(p);
}
export async function decideReceipt(env, paymentId, approve, reason) {
  const p = await get(env, "payment", paymentId);
  assert(
    p && p.type === "manual" && p.status === "receipt_review",
    "receipt_review_required",
  );
  if (approve)
    return settlePayment(env, p, "manual:" + p.id, "administrator_bank_review");
  assert(str(reason, 300).length >= 3, "rejection_reason_required");
  p.status = "rejected";
  p.reason = str(reason, 300);
  await put(env, "payment", p.id, p);
  await sendToUser(
    await resolveToken(env),
    p.userId,
    `❌ رسید تأیید نشد\n#${p.id}\n${p.reason}`,
  );
  return p;
}
export async function starsPreCheckout(env, query) {
  if (!String(query.invoice_payload).startsWith("svc:")) return false;
  const [, pid] = String(query.invoice_payload).split(":");
  const p = await get(env, "payment", pid);
  const valid =
    p &&
    p.type === "stars" &&
    p.userId === String(query.from.id) &&
    p.status === "pending" &&
    p.expiresAt > Date.now() &&
    query.currency === "XTR" &&
    query.total_amount === p.stars &&
    constantEqual(query.invoice_payload, p.payload);
  await tgApi(await resolveToken(env), "answerPreCheckoutQuery", {
    pre_checkout_query_id: query.id,
    ok: !!valid,
    ...(!valid
      ? { error_message: "فاکتور معتبر نیست یا مهلت آن تمام شده است." }
      : {}),
  });
  return true;
}
export async function starsSuccessful(env, msg) {
  const paid = msg.successful_payment;
  if (!paid || !String(paid.invoice_payload).startsWith("svc:")) return false;
  const [, pid] = paid.invoice_payload.split(":");
  const p = await get(env, "payment", pid);
  assert(
    p &&
      p.type === "stars" &&
      p.userId === String(msg.from.id) &&
      paid.currency === "XTR" &&
      paid.total_amount === p.stars &&
      constantEqual(p.payload, paid.invoice_payload),
    "stars_payment_mismatch",
  );
  assert(paid.telegram_payment_charge_id, "stars_charge_required");
  await settlePayment(
    env,
    p,
    "stars:" + paid.telegram_payment_charge_id,
    "telegram_successful_payment",
  );
  return true;
}
export async function fundingTick(env) {
  for (const p of (await list(env, "payment"))
    .filter(
      (p) =>
        p.status === "pending" ||
        (p.status === "expired" &&
          p.type === "crypto" &&
          p.txHash &&
          Date.now() < p.expiresAt + 86400000),
    )
    .sort((a, b) => (a.lastChecked || 0) - (b.lastChecked || 0))
    .slice(0, 4)) {
    if (
      ["plisio", "crypto", "iranpay3", "tetrapay", ...POLLED_GATEWAYS].includes(p.type) &&
      (p.type !== "crypto" || p.txHash)
    ) {
      try {
        await verifyPayment(env, p);
      } catch (e) {
        p.lastError = e.message;
      }
    }
    if (p.status === "pending" && p.expiresAt < Date.now()) {
      p.status = "expired";
    }
    p.lastChecked = Date.now();
    await put(env, "payment", p.id, p);
  }
}
const htmlPage = (message, status = 200) =>
  new Response(
    `<!doctype html><html lang="fa" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>پرداخت خدمات</title><style>body{background:#081322;color:#e2e8f0;font:16px Tahoma;display:grid;place-items:center;min-height:90vh;margin:0;padding:20px}main{max-width:520px;border:1px solid #26445c;padding:32px;border-radius:24px;background:#102238}p{line-height:2}h1{color:#38bdf8;font-size:23px}</style><main><h1>پرداخت خدمات</h1><p>${xml(message)}</p><p>به ربات یا مینی‌اپ برگردید و وضعیت فاکتور را بررسی کنید.</p></main></html>`,
    {
      status,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
        "referrer-policy": "no-referrer",
        "content-security-policy":
          "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'",
      },
    },
  );
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((k) => [k, canonical(value[k])]),
    );
  return value;
}
export async function handleServicePayment(request, env) {
  const url = new URL(request.url),
    [, , action, pid] = url.pathname.split("/");
  if (action === "result")
    return htmlPage(
      "بازگشت از درگاه به‌تنهایی تأیید پرداخت نیست. نتیجه در سرور بررسی می‌شود.",
    );
  try {
    assert(
      ["callback", "notify"].includes(action) && /^[a-f0-9]{16}$/.test(pid),
      "payment_not_found",
      404,
    );
    const p = await get(env, "payment", pid);
    assert(
      p && constantEqual(url.searchParams.get("key") || "", p.nonce),
      "unauthorized_callback",
      403,
    );
    let body = {}, rawBody = "";
    if (request.method === "POST") {
      const type = request.headers.get("content-type") || "";
      const text = rawBody = await limitedRequestText(request);
      body = type.includes("application/json")
        ? JSON.parse(text)
        : Object.fromEntries(new URLSearchParams(text));
    }
    if (p.type === "tronado") {
      assert(action === "notify" && request.method === "POST", "signed_webhook_required", 403);
      const secret = await unseal(env, p.gatewaySnapshot.secret);
      const reference = await verifyTronadoWebhook(p, secret, rawBody, request.headers.get("x-tronado-sig") || "");
      await settlePayment(env, p, reference, "signed_webhook");
      return Response.json({ ok: true });
    }
    const params = { ...Object.fromEntries(url.searchParams), ...body };
    if (action === "notify" && p.type === "nowpayments") {
      const secret = await unseal(env, p.gatewaySnapshot.secret);
      assert(secret.ipnSecret, "ipn_secret_required", 503);
      const signature = request.headers.get("x-nowpayments-sig") || "";
      assert(
        constantEqual(
          hex(
            await hmac(
              secret.ipnSecret,
              JSON.stringify(canonical(body)),
              "SHA-512",
            ),
          ),
          signature.toLowerCase(),
        ),
        "invalid_webhook_signature",
        403,
      );
    }
    if (
      action === "callback" &&
      p.type === "zarinpal" &&
      params.Status !== "OK"
    )
      return htmlPage("پرداخت تکمیل نشده است.");
    await verifyPayment(env, p, params);
    return action === "notify"
      ? Response.json({ ok: true })
      : htmlPage("پرداخت با استعلام سرور تأیید شد و اعتبار کیف پول ثبت شد.");
  } catch (e) {
    return action === "notify"
      ? Response.json(
          { ok: false, error: e.message },
          { status: e.status || 400 },
        )
      : htmlPage(
          "پرداخت هنوز تأیید نشده است؛ برای بررسی به ربات یا پشتیبانی مراجعه کنید.",
          e.status || 400,
        );
  }
}
