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
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "To be announced";
  return new Intl.DateTimeFormat("en-NG", { dateStyle: "full", timeZone: "Africa/Lagos" }).format(date);
}

function formatTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "To be announced";
  return new Intl.DateTimeFormat("en-NG", { timeStyle: "short", timeZone: "Africa/Lagos" }).format(date);
}

function formatMoney(amount, currency = "NGN") {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));
}

function eventVenue(event = {}) {
  return [
    event.venue?.name,
    event.venue?.address?.line1,
    event.venue?.address?.city,
    event.venue?.address?.state,
    event.venue?.address?.country,
  ].filter(Boolean).join(", ") || "To be announced";
}

function detailRows(rows) {
  return rows.map(([label, value]) => `<tr><td style="padding:7px 12px 7px 0;color:#94a3b8;vertical-align:top;white-space:nowrap">${escapeHtml(label)}</td><td style="padding:7px 0;color:#e2e8f0;font-weight:600">${escapeHtml(value)}</td></tr>`).join("");
}

function emailLayout({ heading, greeting, paragraphs = [], rows = [], cta, code, footerNote = "" }) {
  const paragraphHtml = paragraphs.map((paragraph) => `<p style="margin:0 0 16px;line-height:1.65;color:#cbd5e1">${escapeHtml(paragraph)}</p>`).join("");
  const rowsHtml = rows.length ? `<table role="presentation" style="width:100%;margin:20px 0;border-collapse:collapse">${detailRows(rows)}</table>` : "";
  const codeHtml = code ? `<div style="margin:24px 0;padding:18px;text-align:center;border:1px solid #334155;border-radius:12px;background:#020617;color:#c4b5fd;font-size:28px;font-weight:700;letter-spacing:8px">${escapeHtml(code)}</div>` : "";
  const ctaHtml = cta ? `<p style="margin:26px 0;text-align:center"><a href="${escapeHtml(cta.url)}" style="display:inline-block;padding:13px 22px;border-radius:10px;background:#7c3aed;color:#ffffff;text-decoration:none;font-weight:700">${escapeHtml(cta.label)}</a></p>` : "";
  return `<!doctype html><html><body style="margin:0;background:#020617;font-family:Arial,sans-serif;color:#e2e8f0"><table role="presentation" style="width:100%;border-collapse:collapse"><tr><td style="padding:28px 14px"><table role="presentation" style="width:100%;max-width:620px;margin:0 auto;border:1px solid #1e293b;border-radius:16px;background:#0f172a"><tr><td style="padding:22px 28px;border-bottom:1px solid #1e293b;color:#c4b5fd;font-size:22px;font-weight:800">Eventidor</td></tr><tr><td style="padding:28px"><h1 style="margin:0 0 20px;color:#ffffff;font-size:25px">${escapeHtml(heading)}</h1><p style="margin:0 0 16px;color:#e2e8f0">Hi ${escapeHtml(greeting || "there")},</p>${paragraphHtml}${rowsHtml}${codeHtml}${ctaHtml}${footerNote ? `<p style="margin:20px 0 0;line-height:1.6;color:#94a3b8;font-size:13px">${escapeHtml(footerNote)}</p>` : ""}<p style="margin:24px 0 0;line-height:1.6;color:#cbd5e1">The Eventidor Team</p></td></tr></table></td></tr></table></body></html>`;
}

function eventRows(event, ticketType = null) {
  const rows = [
    ["Event", event?.eventName || "Event"],
    ["Date", formatDate(event?.startAt)],
    ["Time", formatTime(event?.startAt)],
    ["Venue", eventVenue(event)],
  ];
  if (ticketType) rows.splice(1, 0, ["Ticket Type", ticketType?.name || "Ticket"]);
  return rows;
}

export function buildPurchaseConfirmationEmail({ buyerName, event, order, myTicketsUrl }) {
  const quantity = (order?.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const ticketTypes = (order?.items || []).map((item) => `${item.name} x ${item.quantity}`).join(", ");
  const rows = [
    ...eventRows(event),
    ["Tickets", quantity],
    ["Ticket Type(s)", ticketTypes || "Ticket"],
    ["Amount Paid", formatMoney(order?.total, order?.currency)],
  ];
  const paragraphs = [
    `Your ticket purchase for ${event?.eventName || "your event"} was successful.`,
    "Your tickets are now available in My Tickets on Eventidor.",
    "Bought tickets for other people? You can assign individual tickets to them from My Tickets.",
    "Keep your QR code and check-in code private. Each ticket can only be successfully checked in once.",
    "See you at the event!",
  ];
  return {
    subject: `Your tickets for ${event?.eventName || "your event"} are ready <�`,
    text: `Your tickets are confirmed!\n\nHi ${buyerName || "there"},\n\n${paragraphs.join("\n\n")}\n\n${rows.map(([label, value]) => `${label}: ${value}`).join("\n")}\n\nView My Tickets: ${myTicketsUrl}\n\nThe Eventidor Team`,
    html: emailLayout({ heading: "Your tickets are confirmed!", greeting: buyerName, paragraphs, rows, cta: { label: "VIEW MY TICKETS", url: myTicketsUrl } }),
  };
}

export function buildTicketAssignmentEmail({ recipientName, senderName, event, ticketType, ticketUrl, isGuest }) {
  const paragraphs = isGuest
    ? [`${senderName} has sent you a ticket for ${event?.eventName || "an event"}.`, "You don't need an account to access or use your ticket."]
    : [`${senderName} has assigned you a ticket for ${event?.eventName || "an event"}.`, "The ticket has already been added to My Tickets on your Eventidor account."];
  paragraphs.push("At the event, present the QR code on your ticket for scanning. Tap the QR code to enlarge it for easier check-in.");
  paragraphs.push("Your ticket also contains a manual check-in code if QR scanning isn't available.");
  return {
    subject: `${senderName} sent you a ticket for ${event?.eventName || "an event"} <�`,
    text: `You've received a ticket!\n\nHi ${recipientName || "there"},\n\n${paragraphs.join("\n\n")}\n\n${eventRows(event, ticketType).map(([label, value]) => `${label}: ${value}`).join("\n")}\n\nView My Ticket: ${ticketUrl}\n\nKeep your ticket and check-in details private.\n\nThe Eventidor Team`,
    html: emailLayout({ heading: "You've received a ticket!", greeting: recipientName, paragraphs, rows: eventRows(event, ticketType), cta: { label: "VIEW MY TICKET", url: ticketUrl }, footerNote: "Do not share your ticket link, QR code, or check-in code with anyone else." }),
  };
}

export function buildComplimentaryTicketEmail({ recipientName, organizationName, event, ticketType, ticketUrl }) {
  const paragraphs = [
    `You've received a complimentary ${ticketType?.name || "event"} ticket from ${organizationName || "the organizer"} for ${event?.eventName || "an event"}.`,
    "No payment is required. Your ticket is already confirmed.",
    "Present your QR code at the event entrance for check-in. You can tap the QR code to enlarge it for easier scanning.",
    "Your ticket also includes a manual check-in code.",
  ];
  return {
    subject: `You've received a complimentary ticket for ${event?.eventName || "an event"} <�`,
    text: `Hi ${recipientName || "there"},\n\n${paragraphs.join("\n\n")}\n\n${eventRows(event).map(([label, value]) => `${label}: ${value}`).join("\n")}\n\nView My Ticket: ${ticketUrl}\n\nKeep your ticket, QR code, access link, and check-in code private.\n\nThe Eventidor Team`,
    html: emailLayout({ heading: "You've received a complimentary ticket!", greeting: recipientName, paragraphs, rows: eventRows(event), cta: { label: "VIEW MY TICKET", url: ticketUrl }, footerNote: "Keep your ticket, QR code, access link, and check-in code private." }),
  };
}

export function buildEmailVerificationEmail({ firstName, code, expiresInMinutes = 10 }) {
  return {
    subject: "Verify your email address",
    text: `Welcome! Let's verify your email.\n\nHi ${firstName || "there"},\n\nThanks for creating an account with Eventidor.\n\nUse this verification code to confirm your email address: ${code}\n\nThis code expires in ${expiresInMinutes} minutes.\n\nIf you didn't create this account, you can safely ignore this email.\n\nThe Eventidor Team`,
    html: emailLayout({ heading: "Welcome! Let's verify your email.", greeting: firstName, paragraphs: ["Thanks for creating an account with Eventidor.", "Use the verification code below to confirm your email address:", `This code expires in ${expiresInMinutes} minutes.`, "If you didn't create this account, you can safely ignore this email."], code }),
  };
}

export async function sendPurchaseConfirmationEmail(input) {
  return sendTransactionalEmail({ to: input.to, ...buildPurchaseConfirmationEmail(input) });
}

export async function sendTicketAssignmentEmail(input) {
  return sendTransactionalEmail({ to: input.to, ...buildTicketAssignmentEmail(input) });
}

export async function sendComplimentaryTicketEmail(input) {
  return sendTransactionalEmail({ to: input.to, ...buildComplimentaryTicketEmail(input) });
}

export async function sendEmailVerificationCode(input) {
  return sendTransactionalEmail({ to: input.to, ...buildEmailVerificationEmail(input) });
}

export async function sendPasswordResetEmail({ to, firstName, resetUrl, token }) {
  return sendTransactionalEmail({
    to,
    subject: "Reset your password",
    text: `Hi ${firstName || "there"}, reset your Eventidor password here: ${resetUrl}. The token expires in 15 minutes. Token: ${token}`,
    html: emailLayout({ heading: "Reset your password", greeting: firstName, paragraphs: ["Use the link below to reset your Eventidor password. It expires in 15 minutes."], cta: { label: "RESET PASSWORD", url: resetUrl }, footerNote: `Reset token: ${token}` }),
  });
}
