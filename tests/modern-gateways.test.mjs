import test, { beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { setup, telegramMock } from "./helpers.mjs";
import { saveGateway, createPayment, verifyPayment, handleServicePayment, fundingTick } from "../src/services/payments.js";
import { account } from "../src/services/wallet.js";
import { get, put, hmac, hex } from "../src/services/common.js";
const originalFetch = globalThis.fetch;
const address = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";
let h, tg;
beforeEach(async () => {
  tg = telegramMock();
  globalThis.fetch = tg.fetcher;
  h = await setup();
  h.env.VAULT_KEY = "modern-payment-vault-key-at-least-32-characters";
  h.env.PUBLIC_BASE_URL = "https://panel.example.com";
  await h.msg(42, "/start");
});
afterEach(() => { globalThis.fetch = originalFetch; });
async function gateway(type, extra = {}) {
  return saveGateway(h.env, { type, title: type, secret: { apiKey: "secret-api", ipnSecret: "signing-secret" }, address, ...extra });
}
async function invoice(g) {
  const v = await createPayment(h.env, 42, { gatewayId: g.id, amount: 10000, requestId: "request_" + g.id });
  return get(h.env, "payment", v.id);
}
for (const type of ["tonpay", "blupal", "cubepay"]) {
  test(`${type}: units, remote order binding, underpayment rejection and one-time credit`, async () => {
    let created, fault = "identity", p;
    tg.setOverride((url, method, body) => {
      if (url.includes("/create")) {
        created = body;
        return type === "tonpay" ? { invoice_id: "invoice-1", invoice_url: "https://tonpays.online/pay/1" }
          : type === "blupal" ? { success: true, invoice_id: 101, payment_link: "https://blupal.net/pay/101" }
          : { success: true, pay_page_url: "https://cubevps.ir/pay/1" };
      }
      if (!url.startsWith("https://api.telegram.org/")) {
        const id = fault === "identity" ? "wrong-invoice" : p.id;
        const amount = fault === "amount" ? 1 : 10000;
        if (type === "tonpay") return { order_id: id, invoice_id: p.remoteId, paid: fault !== "pending", status: "completed", final_amount: amount };
        if (type === "blupal") return { invoice_id: fault === "identity" ? 102 : 101, status: fault === "pending" ? "PENDING" : "PAID", amount: 100000, final_amount: amount * 10 };
        return { success: true, order_id: id, status: fault === "pending" ? "pending" : "paid", amount: fault === "amount" ? 1 : 11200 };
      }
    });
    const g = await gateway(type, type === "cubepay" ? { feePercent: 10, feeToman: 200 } : {});
    p = await invoice(g);
    assert.equal(created.amount ?? created.price_amount, type === "tonpay" ? 10000 : type === "blupal" ? 100000 : 11200);
    if (type !== "blupal") assert(created.callback_url.includes(p.id));
    await assert.rejects(() => verifyPayment(h.env, p), /invoice_mismatch/);
    fault = "amount";
    await assert.rejects(() => verifyPayment(h.env, p), /amount_mismatch/);
    fault = "pending";
    await assert.rejects(() => verifyPayment(h.env, p), /payment_not_verified/);
    assert.equal((await account(h.env, 42)).balance, 0);
    fault = "none";
    await verifyPayment(h.env, p, { amount: 9999999, status: "paid" });
    await verifyPayment(h.env, p);
    assert.equal((await account(h.env, 42)).balance, 10000, "invoice surcharge is not credited");
    assert.equal((await get(h.env, "payment", p.id)).status, "paid");
  });
}
test("BluPal polling settles without relying on a merchant-wide callback", async () => {
  tg.setOverride((u) => {
    if (u.endsWith("/create")) return { success: true, invoice_id: 25, payment_link: "https://blupal.net/pay/25" };
    if (u.endsWith("/invoices/25")) return { invoice_id: 25, status: "PAID", amount: 100000, final_amount: 100000 };
  });
  const p = await invoice(await gateway("blupal"));
  await fundingTick(h.env);
  await fundingTick(h.env);
  assert.equal((await get(h.env, "payment", p.id)).status, "paid");
  assert.equal((await account(h.env, 42)).balance, 10000);
});
test("Tronado: raw-body SHA512 signature, exact quote, replay protection and no client-side proof", async () => {
  let created;
  tg.setOverride((u, m, body) => {
    if (u.includes("GetPriceToToman")) return { TronPriceToman: 20000 };
    if (u.includes("GetOrderToken")) { created = body; return { IsSuccessful: true, Data: { Token: "token-1" } }; }
  });
  const p = await invoice(await gateway("tronado"));
  assert.equal(p.cryptoAmount, "0.500000");
  assert.equal(created.TronAmount, 0.5);
  assert.equal(created.WalletAddress, address);
  assert.equal(p.url, "https://t.me/tronado_robot/customerpayment?startapp=token-1");
  await assert.rejects(() => verifyPayment(h.env, p, { IsPaid: true }), /signed_webhook_required/);
  const payload = { PaymentID: p.id, OrderStatusID: 30, IsPaid: true, TronAmount: 0.5, ActualTronAmount: 0.5, WalletAddress: address };
  const request = async (body, signature, url = created.CallbackUrl) => handleServicePayment(new Request(url, {
    method: "POST", headers: { "content-type": "application/json", "x-tronado-sig": signature }, body,
  }), h.env);
  const raw = JSON.stringify(payload);
  const signature = hex(await hmac("signing-secret", raw, "SHA-512"));
  assert.equal((await request(raw, "forged")).status, 403);
  assert.equal((await request(raw + " ", signature)).status, 403, "even whitespace changes the signed raw bytes");
  assert.equal((await request(raw, signature, created.CallbackUrl.replace(/key=.*/, "key=forged"))).status, 403);
  for (const patch of [{ OrderStatusID: 40 }, { PaymentID: "another-order" }, { ActualTronAmount: 0.4 }, { WalletAddress: "wrong" }, { TronAmount: 0.7 }]) {
    const bad = JSON.stringify({ ...payload, ...patch });
    assert.equal((await request(bad, hex(await hmac("signing-secret", bad, "SHA-512")))).status, 400);
  }
  assert.equal((await account(h.env, 42)).balance, 0);
  assert.equal((await request(raw, signature)).status, 200);
  assert.equal((await request(raw, signature)).status, 200);
  assert.equal((await account(h.env, 42)).balance, 10000);
});
test("Tronado rejects expired invoices for explicit review and requires a signing key at setup", async () => {
  await assert.rejects(() => gateway("tronado", { secret: { apiKey: "only-api" } }), /ipn_secret_required/);
  tg.setOverride((u) => {
    if (u.includes("GetPriceToToman")) return { TronPriceToman: 20000 };
    if (u.includes("GetOrderToken")) return { Token: "token-expired" };
  });
  const p = await invoice(await gateway("tronado"));
  p.status = "expired";
  await put(h.env, "payment", p.id, p);
  const raw = JSON.stringify({ PaymentId: p.id, OrderStatusID: 30, TronAmount: 0.5, ActualTronAmount: 0.5 });
  const r = await handleServicePayment(new Request(`https://panel.example.com/service-pay/notify/${p.id}?key=${p.nonce}`, {
    method: "POST", headers: { "content-type": "application/json", "x-tronado-sig": hex(await hmac("signing-secret", raw, "SHA-512")) }, body: raw,
  }), h.env);
  assert.equal(r.status, 409);
  assert.equal((await account(h.env, 42)).balance, 0);
});
test("new gateway network failures remain reviewable and never credit", async () => {
  tg.setOverride((url) => { if (url.includes("tonpays.online")) throw new Error("timeout"); });
  const g = await gateway("tonpay");
  await assert.rejects(() => invoice(g), /provider_network_error/);
  assert.equal((await account(h.env, 42)).balance, 0);
});
