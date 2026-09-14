import dotenv from "dotenv";
import { DEFAULT_PORT } from "../constants/app.constants.js";

dotenv.config();

function toNumber(value, fallback) {
  const parsedValue = Number(value);

  if (Number.isFinite(parsedValue)) {
    return parsedValue;
  }

  return fallback;
}

const envConfig = {
  port: toNumber(process.env.PORT, DEFAULT_PORT),
  nodeEnv: process.env.NODE_ENV || "development",
  mongoUri: process.env.MONGODB_URI || "",
  dnsServers: (process.env.DNS_SERVERS || "").split(",").map((value) => value.trim()).filter(Boolean),
  frontendUrl: process.env.FRONTEND_URL || "",
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || "",
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || "",
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  requireEmailVerification:
    process.env.REQUIRE_EMAIL_VERIFICATION !== undefined
      ? process.env.REQUIRE_EMAIL_VERIFICATION === "true"
      : process.env.NODE_ENV === "production",
  cookieHttpOnly: process.env.NODE_ENV === "production" ? true : process.env.COOKIE_HTTP_ONLY !== "false",
  cookieSecure:
    process.env.COOKIE_SECURE !== undefined
      ? process.env.COOKIE_SECURE === "true"
      : process.env.NODE_ENV === "production",
  cookieSameSite: (process.env.COOKIE_SAME_SITE || "lax").toLowerCase(),
  rateLimitWindowMs: toNumber(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
  rateLimitMax: toNumber(process.env.RATE_LIMIT_MAX, 100),
  eventOperationsRateLimitMax: toNumber(process.env.EVENT_OPERATIONS_RATE_LIMIT_MAX, 600),
  financeMutationRateLimitMax: toNumber(process.env.FINANCE_MUTATION_RATE_LIMIT_MAX, 20),
  authRateLimitMax: toNumber(process.env.AUTH_RATE_LIMIT_MAX, 10),
  paymentMutationRateLimitMax: toNumber(process.env.PAYMENT_MUTATION_RATE_LIMIT_MAX, 10),
  notificationWorkerEnabled: process.env.NOTIFICATION_WORKER_ENABLED !== "false",
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || "",
    apiKey: process.env.CLOUDINARY_API_KEY || "",
    apiSecret: process.env.CLOUDINARY_API_SECRET || "",
  },
  smtp: {
    host: process.env.SMTP_HOST || "",
    port: toNumber(process.env.SMTP_PORT, 587),
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
    from: process.env.SMTP_FROM || "",
  },
  superAdmin: {
    firstName: process.env.SUPER_ADMIN_FIRST_NAME || "",
    lastName: process.env.SUPER_ADMIN_LAST_NAME || "",
    email: process.env.SUPER_ADMIN_EMAIL || "",
    password: process.env.SUPER_ADMIN_PASSWORD || "",
  },
  paystackSecretKey: process.env.PAYSTACK_SECRET_KEY || "",
  paystackMode: (process.env.PAYSTACK_MODE || "test").toLowerCase(),
  paystackTimeoutMs: toNumber(process.env.PAYSTACK_TIMEOUT_MS, 10000),
};

function isValidUrl(value, protocols = ["https:", "http:"]) {
  try {
    return protocols.includes(new URL(value).protocol);
  } catch (error) {
    return false;
  }
}

export function validateEnvironment(config = envConfig) {
  const errors = [];
  const production = config.nodeEnv === "production";

  if (!config.mongoUri) errors.push("MONGODB_URI is required");
  if (!config.jwtAccessSecret) errors.push("JWT_ACCESS_SECRET is required");
  if (!config.jwtRefreshSecret) errors.push("JWT_REFRESH_SECRET is required");
  if (config.jwtAccessSecret && config.jwtAccessSecret === config.jwtRefreshSecret) errors.push("JWT access and refresh secrets must be different");
  if (!config.frontendUrl || !config.frontendUrl.split(",").every((url) => isValidUrl(url.trim()))) errors.push("FRONTEND_URL must contain valid comma-separated HTTP(S) origins");
  if (!["lax", "strict", "none"].includes(config.cookieSameSite)) errors.push("COOKIE_SAME_SITE must be lax, strict, or none");
  if (config.cookieSameSite === "none" && !config.cookieSecure) errors.push("COOKIE_SECURE must be true when COOKIE_SAME_SITE is none");
  if (!Number.isFinite(config.paystackTimeoutMs) || config.paystackTimeoutMs < 1000 || config.paystackTimeoutMs > 60000) errors.push("PAYSTACK_TIMEOUT_MS must be between 1000 and 60000");
  const paystackMode = config.paystackMode || "test";
  if (!["test", "live"].includes(paystackMode)) errors.push("PAYSTACK_MODE must be test or live");
  if (config.paystackSecretKey && paystackMode === "test" && !config.paystackSecretKey.startsWith("sk_test_")) {
    errors.push("PAYSTACK_SECRET_KEY must be a test key when PAYSTACK_MODE is test");
  }
  if (config.paystackSecretKey && paystackMode === "live" && !config.paystackSecretKey.startsWith("sk_live_")) {
    errors.push("PAYSTACK_SECRET_KEY must be a live key when PAYSTACK_MODE is live");
  }

  if (production) {
    if (config.jwtAccessSecret.length < 32) errors.push("JWT_ACCESS_SECRET must contain at least 32 characters in production");
    if (config.jwtRefreshSecret.length < 32) errors.push("JWT_REFRESH_SECRET must contain at least 32 characters in production");
    if (!config.cookieSecure) errors.push("COOKIE_SECURE must be true in production");
    if (!config.paystackSecretKey) errors.push("PAYSTACK_SECRET_KEY is required in production");
    if (!config.cloudinary.cloudName || !config.cloudinary.apiKey || !config.cloudinary.apiSecret) errors.push("Cloudinary configuration is required in production");
    if (!config.smtp.host || !config.smtp.user || !config.smtp.pass || !config.smtp.from) errors.push("SMTP configuration is required in production");
  }

  if (errors.length > 0) {
    throw new Error(`Invalid environment configuration:\n- ${errors.join("\n- ")}`);
  }

  return true;
}

export default envConfig;
