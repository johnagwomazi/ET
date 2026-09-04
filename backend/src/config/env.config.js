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
  frontendUrl: process.env.FRONTEND_URL || "",
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || "",
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || "",
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  requireEmailVerification:
    process.env.REQUIRE_EMAIL_VERIFICATION !== undefined
      ? process.env.REQUIRE_EMAIL_VERIFICATION === "true"
      : process.env.NODE_ENV === "production",
  cookieName: process.env.COOKIE_NAME || "events_session",
  cookieSecret: process.env.COOKIE_SECRET || "",
  cookieHttpOnly: process.env.COOKIE_HTTP_ONLY !== "false",
  cookieSecure: process.env.COOKIE_SECURE === "true",
  cookieSameSite: process.env.COOKIE_SAME_SITE || "lax",
  rateLimitWindowMs: toNumber(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
  rateLimitMax: toNumber(process.env.RATE_LIMIT_MAX, 100),
  eventOperationsRateLimitMax: toNumber(process.env.EVENT_OPERATIONS_RATE_LIMIT_MAX, 600),
  financeMutationRateLimitMax: toNumber(process.env.FINANCE_MUTATION_RATE_LIMIT_MAX, 20),
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
  paystackPublicKey: process.env.PAYSTACK_PUBLIC_KEY || "",
  paystackWebhookSecret: process.env.PAYSTACK_WEBHOOK_SECRET || "",
};

export default envConfig;
