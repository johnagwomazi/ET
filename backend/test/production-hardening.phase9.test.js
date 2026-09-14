import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";

import app from "../src/app.js";
import envConfig, { validateEnvironment } from "../src/config/env.config.js";
import cacheControlMiddleware from "../src/middleware/cacheControl.middleware.js";
import Order from "../src/models/order.model.js";
import PaymentEvent from "../src/models/paymentEvent.model.js";
import Refund from "../src/models/refund.model.js";
import * as paystackService from "../src/services/paystack.service.js";
import { setAuthCookies } from "../src/utils/authCookie.util.js";
import { buildPaymentCallbackUrl } from "../src/utils/payment.util.js";

function productionConfig(overrides = {}) {
  return {
    ...envConfig,
    nodeEnv: "production",
    mongoUri: "mongodb+srv://database.example/events",
    frontendUrl: "https://events.example.com",
    jwtAccessSecret: "a".repeat(48),
    jwtRefreshSecret: "b".repeat(48),
    cookieHttpOnly: true,
    cookieSecure: true,
    cookieSameSite: "none",
    paystackSecretKey: "sk_test_placeholder",
    paystackTimeoutMs: 10000,
    cloudinary: { cloudName: "cloud", apiKey: "key", apiSecret: "secret" },
    smtp: { host: "smtp.example.com", port: 587, user: "user", pass: "pass", from: "events@example.com" },
    ...overrides,
  };
}

function runCacheMiddleware(method, path) {
  const headers = {};
  cacheControlMiddleware(
    { method, path },
    { setHeader(name, value) { headers[name] = value; } },
    () => {}
  );
  return headers;
}

test("production environment validation fails closed on unsafe configuration", () => {
  assert.equal(validateEnvironment(productionConfig()), true);
  assert.throws(
    () => validateEnvironment(productionConfig({ jwtAccessSecret: "short", cookieSecure: false })),
    /JWT_ACCESS_SECRET|COOKIE_SECURE/
  );
  assert.throws(() => validateEnvironment(productionConfig({ paystackSecretKey: "" })), /PAYSTACK_SECRET_KEY/);
<<<<<<< HEAD
});

test("Paystack mode must explicitly match the configured secret key", () => {
  assert.throws(
    () => validateEnvironment(productionConfig({ paystackMode: "test", paystackSecretKey: "sk_live_placeholder" })),
    /test key/
  );
  assert.throws(
    () => validateEnvironment(productionConfig({ paystackMode: "live", paystackSecretKey: "sk_test_placeholder" })),
    /live key/
  );
  assert.equal(
    validateEnvironment(productionConfig({ paystackMode: "test", paystackSecretKey: "sk_test_placeholder" })),
    true
  );
=======
>>>>>>> c64907a103062cd0317cf35bb24989f580cdacd6
});

test("private and dynamic endpoints are no-store while public event reads are briefly cacheable", () => {
  assert.match(runCacheMiddleware("GET", "/api/events")["Cache-Control"], /^public/);
  assert.match(runCacheMiddleware("GET", "/api/events/64b64b64b64b64b64b64b001")["Cache-Control"], /^public/);
  assert.match(runCacheMiddleware("GET", "/api/events/64b64b64b64b64b64b64b001/ticket-types")["Cache-Control"], /no-store/);
  assert.match(runCacheMiddleware("GET", "/api/auth/me")["Cache-Control"], /no-store/);
  assert.match(runCacheMiddleware("POST", "/api/ticketing/checkout")["Cache-Control"], /no-store/);
});

test("authentication cookies remain HttpOnly and use consistent security options", () => {
  const cookies = [];
  setAuthCookies({ cookie(name, value, options) { cookies.push({ name, value, options }); } }, "access", "refresh");

  assert.equal(cookies.length, 2);
  assert.equal(cookies.every((cookie) => cookie.options.httpOnly === true), true);
  assert.equal(cookies.every((cookie) => cookie.options.path === "/"), true);
  assert.equal(cookies.every((cookie) => cookie.options.sameSite === envConfig.cookieSameSite), true);
});

test("payment, refund, and webhook indexes enforce idempotency and retry queries", () => {
  const orderIndexes = Order.schema.indexes();
  const refundIndexes = Refund.schema.indexes();
  const paymentEventIndexes = PaymentEvent.schema.indexes();

  assert.ok(orderIndexes.some(([keys, options]) => keys.paymentReference === 1 && options.unique));
  assert.ok(orderIndexes.some(([keys, options]) => keys.customer === 1 && keys.idempotencyKey === 1 && options.unique));
  assert.ok(refundIndexes.some(([keys, options]) => keys.order === 1 && keys.idempotencyKey === 1 && options.unique));
  assert.ok(refundIndexes.some(([keys, options]) => keys.providerReference === 1 && options.unique));
  assert.ok(paymentEventIndexes.some(([keys]) => keys.status === 1 && keys.processingStartedAt === 1));
});

test("Paystack transport failures return a controlled provider result", async () => {
  const originalFetch = global.fetch;
  const originalSecret = envConfig.paystackSecretKey;
  envConfig.paystackSecretKey = "sk_test_placeholder";
  global.fetch = async () => {
    throw new TypeError("network unavailable");
  };

  try {
    const result = await paystackService.verifyTransaction("pay_test");
    assert.equal(result.configured, true);
    assert.equal(result.status, false);
    assert.equal(result.message, "Payment provider is unavailable");
  } finally {
    global.fetch = originalFetch;
    envConfig.paystackSecretKey = originalSecret;
  }
});

test("Paystack initialization sends authorization, callback, currency, and configured timeout", async () => {
  const originalFetch = global.fetch;
  const originalAbortTimeout = AbortSignal.timeout;
  const originalSecret = envConfig.paystackSecretKey;
  const originalTimeout = envConfig.paystackTimeoutMs;
  let captured;
  let capturedTimeout;
  envConfig.paystackSecretKey = "sk_test_placeholder";
  envConfig.paystackTimeoutMs = 4321;
  AbortSignal.timeout = (milliseconds) => {
    capturedTimeout = milliseconds;
    return originalAbortTimeout(milliseconds);
  };
  global.fetch = async (url, options) => {
    captured = { url, options };
    return new Response(JSON.stringify({
      status: true,
      data: { authorization_url: "https://checkout.paystack.test", access_code: "access" },
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  };

  try {
    await paystackService.initializeTransaction({
      email: "buyer@example.com",
      amount: 2500,
      currency: "NGN",
      reference: "pay_test",
      callbackUrl: "http://localhost:5173/payment/confirmation",
      metadata: { orderReference: "ord_test" },
    });
    const body = JSON.parse(captured.options.body);
    assert.equal(captured.url, "https://api.paystack.co/transaction/initialize");
    assert.equal(captured.options.headers.Authorization, "Bearer sk_test_placeholder");
    assert.equal(body.amount, 250000);
    assert.equal(body.currency, "NGN");
    assert.equal(body.callback_url, "http://localhost:5173/payment/confirmation");
    assert.equal(capturedTimeout, 4321);
    assert.equal(captured.options.signal.aborted, false);
  } finally {
    global.fetch = originalFetch;
    AbortSignal.timeout = originalAbortTimeout;
    envConfig.paystackSecretKey = originalSecret;
    envConfig.paystackTimeoutMs = originalTimeout;
  }
});

test("payment callback generation is normalized and fixed to the confirmation route", () => {
  assert.equal(
    buildPaymentCallbackUrl("http://localhost:5173/"),
    "http://localhost:5173/payment/confirmation"
  );
  assert.equal(
    buildPaymentCallbackUrl("https://events.example.com,https://www.events.example.com"),
    "https://events.example.com/payment/confirmation"
  );
});

test("Paystack webhook signatures use the canonical secret key and reject invalid input", () => {
  const originalSecret = envConfig.paystackSecretKey;
  const rawBody = Buffer.from(JSON.stringify({ event: "charge.success", data: { reference: "pay_test" } }));
  envConfig.paystackSecretKey = "sk_test_webhook_signing_secret";
  const signature = crypto.createHmac("sha512", envConfig.paystackSecretKey).update(rawBody).digest("hex");

  try {
    assert.equal(paystackService.verifyWebhookSignature(rawBody, signature), true);
    assert.equal(paystackService.verifyWebhookSignature(rawBody, "invalid"), false);
    assert.equal(paystackService.verifyWebhookSignature(rawBody, ""), false);
  } finally {
    envConfig.paystackSecretKey = originalSecret;
  }
});

test("Paystack transaction statuses distinguish success, pending, failure, and unknown", () => {
  assert.equal(paystackService.classifyTransactionStatus("success"), paystackService.PAYSTACK_TRANSACTION_OUTCOME.SUCCESS);
  for (const status of ["pending", "ongoing", "processing", "queued"]) {
    assert.equal(paystackService.classifyTransactionStatus(status), paystackService.PAYSTACK_TRANSACTION_OUTCOME.PENDING);
  }
  for (const status of ["failed", "abandoned", "reversed"]) {
    assert.equal(paystackService.classifyTransactionStatus(status), paystackService.PAYSTACK_TRANSACTION_OUTCOME.FAILED);
  }
  assert.equal(paystackService.classifyTransactionStatus("new-provider-state"), paystackService.PAYSTACK_TRANSACTION_OUTCOME.UNKNOWN);
});

test("HTTP boundary applies security headers, safe CORS errors, and readiness status", async () => {
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const { port } = server.address();

  try {
    const health = await fetch(`http://127.0.0.1:${port}/api/health`);
    assert.equal(health.status, 503);
    assert.equal(health.headers.get("x-powered-by"), null);
    assert.match(health.headers.get("cache-control"), /no-store/);
    const healthBody = await health.json();
    assert.equal(healthBody.data.database, "disconnected");

    const deniedCors = await fetch(`http://127.0.0.1:${port}/`, {
      headers: { Origin: "https://attacker.example" },
    });
    assert.equal(deniedCors.status, 403);
    const corsBody = await deniedCors.json();
    assert.equal(corsBody.message, "CORS policy does not allow this origin");
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
});
