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
