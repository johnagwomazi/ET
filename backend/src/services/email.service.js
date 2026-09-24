import nodemailer from "nodemailer";
import envConfig from "../config/env.config.js";

let transporter;

export function isConfigured() {
  return Boolean(envConfig.smtp.host && envConfig.smtp.user && envConfig.smtp.pass && envConfig.smtp.from);
}

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: envConfig.smtp.host,
      port: envConfig.smtp.port,
      secure: envConfig.smtp.port === 465,
      auth: { user: envConfig.smtp.user, pass: envConfig.smtp.pass },
    });
  }
  return transporter;
}

export async function sendTransactionalEmail({ to, subject, text, html }) {
  if (!isConfigured()) return { sent: false, notConfigured: true };
  const result = await getTransporter().sendMail({ from: envConfig.smtp.from, to, subject, text, html });
  return { sent: true, messageId: result.messageId || "" };
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function sendEmailVerificationCode({ to, firstName, code, expiresInMinutes = 10 }) {
  const safeName = escapeHtml(firstName || "there");
  const safeCode = escapeHtml(code);
  return sendTransactionalEmail({
    to,
    subject: "Verify your email address",
    text: `Hi ${firstName || "there"}, your verification code is ${code}. It expires in ${expiresInMinutes} minutes.`,
    html: `<p>Hi ${safeName},</p><p>Your verification code is:</p><p style="font-size:24px;font-weight:700;letter-spacing:6px">${safeCode}</p><p>This code expires in ${expiresInMinutes} minutes.</p>`,
  });
}

export async function sendPasswordResetEmail({ to, firstName, resetUrl, token }) {
  const safeName = escapeHtml(firstName || "there");
  const safeUrl = escapeHtml(resetUrl);
  const safeToken = escapeHtml(token);
  return sendTransactionalEmail({
    to,
    subject: "Reset your password",
    text: `Hi ${firstName || "there"}, reset your password here: ${resetUrl}. The token expires in 15 minutes. Token: ${token}`,
    html: `<p>Hi ${safeName},</p><p>Use the link below to reset your password. It expires in 15 minutes.</p><p><a href="${safeUrl}">Reset password</a></p><p>Reset token: <strong>${safeToken}</strong></p>`,
  });
}
