import envConfig from "../config/env.config.js";

export const PAYMENT_CONFIRMATION_PATH = "/payment/confirmation";

export function buildPaymentCallbackUrl(frontendUrl = envConfig.frontendUrl) {
  const origin = String(frontendUrl || "").split(",")[0].trim();
  if (!origin) return "";

  return new URL(PAYMENT_CONFIRMATION_PATH, `${origin.replace(/\/+$/, "")}/`).toString();
}
