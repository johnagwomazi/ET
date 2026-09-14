import crypto from "node:crypto";
import envConfig from "../config/env.config.js";

const PAYSTACK_BASE_URL = "https://api.paystack.co";
const SUCCESSFUL_TRANSACTION_STATUSES = new Set(["success"]);
const NON_FINAL_TRANSACTION_STATUSES = new Set(["pending", "ongoing", "processing", "queued"]);
const FINAL_FAILURE_TRANSACTION_STATUSES = new Set(["abandoned", "failed", "reversed"]);
let bankCache = null;
let bankListRequest = null;

export const PAYSTACK_TRANSACTION_OUTCOME = Object.freeze({
  SUCCESS: "SUCCESS",
  PENDING: "PENDING",
  FAILED: "FAILED",
  UNKNOWN: "UNKNOWN",
});

function getAuthorizationHeaders() {
  return {
    Authorization: `Bearer ${envConfig.paystackSecretKey}`,
    "Content-Type": "application/json",
  };
}

function isPaystackConfigured() {
  return Boolean(envConfig.paystackSecretKey);
}

export function isConfigured() {
  return isPaystackConfigured();
}

async function paystackRequest(path, options = {}) {
  if (!isPaystackConfigured()) {
    return {
      configured: false,
      status: false,
      message: "Paystack is not configured",
      data: null,
    };
  }

  try {
    const response = await fetch(`${PAYSTACK_BASE_URL}${path}`, {
      method: options.method || "GET",
      headers: getAuthorizationHeaders(),
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: AbortSignal.timeout(envConfig.paystackTimeoutMs),
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      return {
        configured: true,
        status: false,
        message: payload?.message || "Payment provider request failed",
        data: payload?.data || null,
        httpStatus: response.status,
        indeterminate: response.status >= 500 || response.status === 408 || !payload,
      };
    }

    return {
      configured: true,
      ...payload,
      httpStatus: response.status,
      indeterminate: !payload || typeof payload.status !== "boolean",
    };
  } catch (error) {
    return {
      configured: true,
      status: false,
      message: error?.name === "TimeoutError" ? "Payment provider timed out" : "Payment provider is unavailable",
      indeterminate: true,
      data: null,
    };
  }
}

export async function initializeTransaction({ email, amount, currency, reference, callbackUrl, metadata }) {
  const amountInKobo = Math.round(Number(amount || 0) * 100);

  return paystackRequest("/transaction/initialize", {
    method: "POST",
    body: {
      email,
      amount: amountInKobo,
      currency,
      reference,
      callback_url: callbackUrl,
      metadata,
    },
  });
}

export async function verifyTransaction(reference) {
  return paystackRequest(`/transaction/verify/${encodeURIComponent(reference)}`);
}

export function classifyTransactionStatus(status) {
  const normalizedStatus = String(status || "").trim().toLowerCase();
  if (SUCCESSFUL_TRANSACTION_STATUSES.has(normalizedStatus)) return PAYSTACK_TRANSACTION_OUTCOME.SUCCESS;
  if (NON_FINAL_TRANSACTION_STATUSES.has(normalizedStatus)) return PAYSTACK_TRANSACTION_OUTCOME.PENDING;
  if (FINAL_FAILURE_TRANSACTION_STATUSES.has(normalizedStatus)) return PAYSTACK_TRANSACTION_OUTCOME.FAILED;
  return PAYSTACK_TRANSACTION_OUTCOME.UNKNOWN;
}

export async function createRefund({ transaction, amount, currency, customerNote, merchantNote }) {
  return paystackRequest("/refund", {
    method: "POST",
    body: {
      transaction,
      amount: Math.round(Number(amount || 0) * 100),
      currency,
      customer_note: customerNote,
      merchant_note: merchantNote,
    },
  });
}

export async function initiateTransfer({ amount, recipient, reason, reference }) {
  return paystackRequest("/transfer", {
    method: "POST",
    body: {
      source: "balance",
      amount: Math.round(Number(amount || 0) * 100),
      recipient,
      reason,
      reference,
    },
  });
}

export async function resolveAccountNumber({ accountNumber, bankCode }) {
  const query = new URLSearchParams({ account_number: accountNumber, bank_code: bankCode });
  return paystackRequest(`/bank/resolve?${query.toString()}`);
}

async function fetchSupportedBanks() {
  const banks = new Map();
  const cursors = new Set();
  let next;

  for (let page = 0; page < 20; page += 1) {
    const query = new URLSearchParams({ country: "nigeria", currency: "NGN", type: "nuban", use_cursor: "true", perPage: "100" });
    if (next) query.set("next", next);
    const result = await paystackRequest(`/bank?${query.toString()}`);
    if (!result.status || !Array.isArray(result.data)) {
      return { configured: result.configured, status: false, message: "Bank list is temporarily unavailable" };
    }
    for (const bank of result.data) {
      if (bank.active === true && !bank.is_deleted && bank.country === "Nigeria" &&
          bank.currency === "NGN" && bank.type === "nuban" &&
          typeof bank.name === "string" && bank.name.trim() && /^\d{3,10}$/.test(bank.code)) {
        banks.set(bank.code, { name: bank.name.trim(), code: bank.code });
      }
    }
    next = result.meta?.next;
    if (!next) {
      return { configured: true, status: true, data: [...banks.values()].sort((first, second) => first.name.localeCompare(second.name)) };
    }
    if (typeof next !== "string" || cursors.has(next)) break;
    cursors.add(next);
  }
  return { configured: true, status: false, message: "Bank list is temporarily unavailable" };
}

export async function getSupportedBanks() {
  if (!isPaystackConfigured()) return { configured: false, status: false, data: null };
  const key = envConfig.paystackSecretKey;
  if (bankCache?.key === key && bankCache.expiresAt > Date.now()) return bankCache.result;
  if (bankListRequest?.key === key) return bankListRequest.promise;

  const promise = fetchSupportedBanks();
  bankListRequest = { key, promise };
  try {
    const result = await promise;
    if (result.status && result.data.length) {
      bankCache = { key, result, expiresAt: Date.now() + 60 * 60 * 1000 };
    }
    return result;
  } finally {
    if (bankListRequest?.promise === promise) bankListRequest = null;
  }
}

export async function createTransferRecipient({ name, accountNumber, bankCode, currency, description }) {
  return paystackRequest("/transferrecipient", {
    method: "POST",
    body: {
      type: "nuban",
      name,
      account_number: accountNumber,
      bank_code: bankCode,
      currency,
      description,
    },
  });
}

export async function verifyTransfer(reference) {
  return paystackRequest(`/transfer/verify/${encodeURIComponent(reference)}`);
}

export function verifyWebhookSignature(rawBody, signature) {
  if (!envConfig.paystackSecretKey || !signature || !rawBody) {
    return false;
  }

  const expected = crypto.createHmac("sha512", envConfig.paystackSecretKey).update(rawBody).digest("hex");
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(signature);

  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
}
