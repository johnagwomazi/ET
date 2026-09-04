import envConfig from "../config/env.config.js";
import { NOTIFICATION_NAVIGATION_KEY } from "../constants/notification.constants.js";

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function buildInternalPath(navigation = {}) {
  const eventId = encodeURIComponent(navigation.params?.eventId || "");
  const paths = {
    [NOTIFICATION_NAVIGATION_KEY.PUBLIC_EVENT]: eventId ? `/events/${eventId}` : "/",
    [NOTIFICATION_NAVIGATION_KEY.CUSTOMER_TICKETS]: "/customer/tickets",
    [NOTIFICATION_NAVIGATION_KEY.CUSTOMER_HISTORY]: "/customer/history",
    [NOTIFICATION_NAVIGATION_KEY.ORGANIZATION_EVENT]: eventId ? `/organization/events/${eventId}` : "/organization/events",
    [NOTIFICATION_NAVIGATION_KEY.ORGANIZATION_FINANCE]: "/organization/finance",
    [NOTIFICATION_NAVIGATION_KEY.MANAGER_EVENT]: eventId ? `/manager/events/${eventId}` : "/manager/events",
    [NOTIFICATION_NAVIGATION_KEY.SUPER_ADMIN_WITHDRAWALS]: "/super-admin/dashboard/withdrawals",
  };
  return paths[navigation.key] || "/";
}

function buildActionUrl(navigation) {
  const baseUrl = (envConfig.frontendUrl || "").replace(/\/$/, "");
  return baseUrl ? `${baseUrl}${buildInternalPath(navigation)}` : "";
}

export function buildNotificationEmail(notification, recipient = {}) {
  const recipientName = recipient.firstName || "there";
  const actionUrl = buildActionUrl(notification.navigation);
  const actionLabel = notification.navigation?.key === NOTIFICATION_NAVIGATION_KEY.CUSTOMER_TICKETS
    ? "View tickets"
    : "View details";
  const text = [
    `Hello ${recipientName},`,
    "",
    notification.message,
    ...(actionUrl ? ["", `${actionLabel}: ${actionUrl}`] : []),
    "",
    "This is an operational message from Events.",
  ].join("\n");
  const actionMarkup = actionUrl
    ? `<p style="margin:24px 0"><a href="${escapeHtml(actionUrl)}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:6px;font-weight:600">${actionLabel}</a></p>`
    : "";

  return {
    subject: notification.title,
    text,
    html: `<!doctype html>
<html lang="en">
  <body style="margin:0;background:#0f172a;color:#e2e8f0;font-family:Arial,sans-serif">
    <div style="max-width:600px;margin:0 auto;padding:28px 18px">
      <div style="border:1px solid #1e293b;background:#111827;padding:28px">
        <p style="margin:0 0 18px;color:#60a5fa;font-size:13px;font-weight:700;text-transform:uppercase">Events</p>
        <h1 style="margin:0 0 18px;color:#ffffff;font-size:24px;line-height:1.3">${escapeHtml(notification.title)}</h1>
        <p style="margin:0 0 14px;color:#cbd5e1;line-height:1.7">Hello ${escapeHtml(recipientName)},</p>
        <p style="margin:0;color:#cbd5e1;line-height:1.7">${escapeHtml(notification.message)}</p>
        ${actionMarkup}
        <p style="margin:24px 0 0;border-top:1px solid #1e293b;padding-top:18px;color:#64748b;font-size:12px;line-height:1.6">This is an operational message from Events.</p>
      </div>
    </div>
  </body>
</html>`,
  };
}
