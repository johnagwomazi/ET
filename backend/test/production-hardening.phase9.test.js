import test from "node:test";
import assert from "node:assert/strict";

import app from "../src/app.js";
import envConfig, { validateEnvironment } from "../src/config/env.config.js";
import cacheControlMiddleware from "../src/middleware/cacheControl.middleware.js";
import Order from "../src/models/order.model.js";
import PaymentEvent from "../src/models/paymentEvent.model.js";
import Refund from "../src/models/refund.model.js";
import * as paystackService from "../src/services/paystack.service.js";
import { setAuthCookies } from "../src/utils/authCookie.util.js";

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
    paystackWebhookSecret: "whsec_placeholder",
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
  assert.throws(
    () => validateEnvironment(productionConfig({ paystackWebhookSecret: "" })),
    /PAYSTACK_WEBHOOK_SECRET/
  );
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
