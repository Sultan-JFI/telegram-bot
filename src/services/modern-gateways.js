// Bounded Worker fetches; callbacks are never an unauthenticated payment proof.
import {
  assert, fetchLimited, expectResponse, decimalUnits, decimalString,
  constantEqual, hex, hmac,
} from "./common.js";

export const MODERN_GATEWAYS = {
  tonpay: "TonPay / تون‌پی",
  blupal: "BluPal / بلوپال",
  cubepay: "QubePay / کیوب‌پی",
  tronado: "Tronado / ترونادو",
};
export const isModernGateway = (type) => Object.hasOwn(MODERN_GATEWAYS, type);
export const POLLED_GATEWAYS = ["tonpay", "blupal", "cubepay"];
async function json(url, method, body, headers) {
  return expectResponse(await fetchLimited(url, {
    method, headers: { "content-type": "application/json", ...headers },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  }));
}
const keyHeader = (s) => ({ "X-API-Key": s.apiKey });
const bearer = (s) => ({ authorization: "Bearer " + s.apiKey });

export async function createModernInvoice(p, g, secret, callback) {
  let r;
  if (p.type === "tonpay") {
    r = await json("https://tonpays.online/api/v1/invoices/create", "POST", {
      amount: p.amount, order_id: p.id, callback_url: callback,
    }, keyHeader(secret));
    assert(r.invoice_id && r.invoice_url, "gateway_create_failed");
    return { remoteId: String(r.invoice_id), url: r.invoice_url };
  }
  if (p.type === "blupal") {
    r = await json("https://blupal.net/api/v1/invoices/create", "POST", {
      amount: p.amount * 10,
    }, keyHeader(secret));
    assert(r.success === true && r.invoice_id && r.payment_link, "gateway_create_failed");
    // BluPal uses merchant-wide callbacks. Polling requires no public webhook lookup.
    return { remoteId: String(r.invoice_id), url: r.payment_link };
  }
  if (p.type === "cubepay") {
    const payable = p.amount + Math.ceil(p.amount * (g.feePercent || 0) / 100) + (g.feeToman || 0);
    r = await json("https://cubevps.ir/pay/create-order.php", "POST", {
      order_id: p.id, price_amount: payable, callback_url: callback,
      redirect_after_payment: false,
    }, bearer(secret));
    assert(r.success === true && r.pay_page_url, "gateway_create_failed");
    return { remoteId: p.id, url: r.pay_page_url, gatewayAmount: payable };
  }
  if (p.type === "tronado") {
    r = await json("https://bot.tronado.cloud/Tron/GetPriceToToman", "POST", {}, {});
    const rate = decimalUnits(r.TronPriceToman, 6);
    assert(rate > 0n, "crypto_rate_required");
    const amount = decimalString((BigInt(p.amount) * 1000000000000n + rate - 1n) / rate, 6);
    r = await json("https://bot.tronado.cloud/api/v5/GetOrderToken?wageFromBusinessPercentage=" + (g.wagePercent ?? 0), "POST", {
      PaymentID: p.id, WalletAddress: g.address, TronAmount: Number(amount), CallbackUrl: callback,
    }, keyHeader(secret));
    const token = typeof r === "string" ? r : (r.Token ?? r.token ?? r.Data?.Token);
    assert(typeof token === "string" && token.length > 0 && token.length < 512, "gateway_create_failed");
    return {
      remoteId: token, url: "https://t.me/tronado_robot/customerpayment?startapp=" + encodeURIComponent(token),
      cryptoAmount: amount, address: g.address,
      rateSnapshot: { source: "tronado", coinToman: decimalString(rate, 6), at: Date.now() },
    };
  }
  throw new Error("unsupported_gateway");
}

export async function verifyModernInvoice(p, secret) {
  let r;
  if (p.type === "tonpay") {
    r = await json("https://tonpays.online/api/v1/invoices/check/" + encodeURIComponent(p.remoteId), "GET", undefined, keyHeader(secret));
    assert(String(r.order_id) === p.id, "payment_invoice_mismatch");
    if (r.invoice_id !== undefined) assert(String(r.invoice_id) === p.remoteId, "payment_invoice_mismatch");
    assert(r.paid === true && r.status === "completed", "payment_not_verified");
    // Do not credit the invoice face value on a partial settlement.
    assert(decimalUnits(r.final_amount, 2) >= BigInt(p.amount) * 100n, "payment_amount_mismatch");
  } else if (p.type === "blupal") {
    r = await json("https://blupal.net/api/v1/invoices/" + encodeURIComponent(p.remoteId), "GET", undefined, keyHeader(secret));
    assert(String(r.invoice_id) === p.remoteId, "payment_invoice_mismatch");
    assert(r.status === "PAID", "payment_not_verified");
    assert(decimalUnits(r.amount, 0) === BigInt(p.amount) * 10n &&
      decimalUnits(r.final_amount, 2) >= BigInt(p.amount) * 1000n, "payment_amount_mismatch");
  } else if (p.type === "cubepay") {
    r = await json("https://cubevps.ir/pay/check-order-status.php?order_id=" + encodeURIComponent(p.id), "GET", undefined, bearer(secret));
    assert(r.success === true && String(r.order_id) === p.id, "payment_invoice_mismatch");
    assert(["paid", "verified", "completed"].includes(r.status), "payment_not_verified");
    assert(decimalUnits(r.amount ?? r.price_amount, 2) === BigInt(p.gatewayAmount) * 100n, "payment_amount_mismatch");
  } else {
    // Tronado must enter through the raw-body signature-verifying webhook, not
    // a customer's JSON /verify request or a browser redirect.
    throw new Error("signed_webhook_required");
  }
  return p.type + ":" + p.remoteId;
}

export async function verifyTronadoWebhook(p, secret, rawBody, signature) {
  assert(secret.ipnSecret, "ipn_secret_required", 503);
  assert(/^[a-f0-9]{128}$/i.test(signature) && constantEqual(
    hex(await hmac(secret.ipnSecret, rawBody, "SHA-512")), signature.toLowerCase(),
  ), "invalid_webhook_signature", 403);
  const r = JSON.parse(rawBody);
  assert(String(r.PaymentId ?? r.PaymentID) === p.id, "payment_invoice_mismatch");
  assert(r.OrderStatusID === undefined ? r.IsPaid === true : Number(r.OrderStatusID) === 30, "payment_not_verified");
  assert(decimalUnits(r.TronAmount, 6) === decimalUnits(p.cryptoAmount, 6) &&
    decimalUnits(r.ActualTronAmount, 6) >= decimalUnits(p.cryptoAmount, 6), "payment_amount_mismatch");
  if (r.WalletAddress !== undefined) assert(r.WalletAddress === p.address, "payment_recipient_mismatch");
  assert(["pending", "paid"].includes(p.status), "payment_requires_review", 409);
  return "tronado:" + p.remoteId;
}
