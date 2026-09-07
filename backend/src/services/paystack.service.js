import crypto from "node:crypto";
import envConfig from "../config/env.config.js";

const PAYSTACK_BASE_URL = "https://api.paystack.co";
const SUCCESSFUL_TRANSACTION_STATUSES = new Set(["success"]);
const NON_FINAL_TRANSACTION_STATUSES = new Set(["pending", "ongoing", "processing", "queued"]);
const FINAL_FAILURE_TRANSACTION_STATUSES = new Set(["abandoned", "failed", "reversed"]);

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
      };
    }

    return {
      configured: true,
      ...payload,
    };
  } catch (error) {
    return {
      configured: true,
      status: false,
      message: error?.name === "TimeoutError" ? "Payment provider timed out" : "Payment provider is unavailable",
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
