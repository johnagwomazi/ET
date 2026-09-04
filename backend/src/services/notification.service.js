import { ACCOUNT_STATUS } from "../constants/accountStatus.constants.js";
import { EVENT_STATUS } from "../constants/eventStatus.constants.js";
import { HTTP_STATUS } from "../constants/httpStatus.constants.js";
import {
  EMAIL_DELIVERY_STATUS,
  NOTIFICATION_CHANNEL,
  NOTIFICATION_DEFAULTS,
  NOTIFICATION_ENTITY_TYPE,
  NOTIFICATION_NAVIGATION_KEY,
  NOTIFICATION_TYPE,
} from "../constants/notification.constants.js";
import { USER_ROLES } from "../constants/roles.constants.js";
import { PAYMENT_STATUS, REFUND_STATUS, TICKET_STATUS, WITHDRAWAL_STATUS } from "../constants/ticketing.constants.js";
import * as eventManagerAssignmentRepository from "../repositories/eventManagerAssignment.repository.js";
import * as eventRepository from "../repositories/event.repository.js";
import * as notificationRepository from "../repositories/notification.repository.js";
import * as orderRepository from "../repositories/order.repository.js";
import * as ticketRepository from "../repositories/ticket.repository.js";
import * as userRepository from "../repositories/user.repository.js";
import logger from "../lib/logger.js";
import { buildPaginationMeta, buildPaginationOptions } from "../utils/query.util.js";
import { buildNotificationEmail } from "../utils/notificationEmail.util.js";
import { mapNotificationResponse } from "../utils/notificationResponse.util.js";
import * as emailService from "./email.service.js";

const defaultDependencies = {
  emailService,
  eventManagerAssignmentRepository,
  eventRepository,
  notificationRepository,
  orderRepository,
  ticketRepository,
  userRepository,
};

function getDocumentId(value) {
  if (!value) return null;
  if (typeof value === "string") return value;
  return (value._id || value.id || value).toString();
}

function isUserDocument(value) {
  return Boolean(value && typeof value === "object" && value.email);
}

function isActiveUser(user) {
  return Boolean(user && !user.isDeleted && (!user.accountStatus || user.accountStatus === ACCOUNT_STATUS.ACTIVE));
}

async function resolveUser(value, dependencies) {
  if (isUserDocument(value)) return value;
  const id = getDocumentId(value);
  return id ? dependencies.userRepository.findUserById(id) : null;
}

function formatMoney(amount, currency = "NGN") {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));
}

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "the scheduled time";
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Lagos",
  }).format(date);
}

function eventName(event) {
  return event?.eventName || event?.eventDetails?.eventName || "your event";
}

function eventVenue(event) {
  const venue = event?.venue || event?.eventDetails?.venue || {};
  return venue.name || venue.address?.line1 || venue.address?.city || "the listed venue";
}

function emailFailureCode(error) {
  const value = error?.code || error?.name || "EMAIL_DELIVERY_FAILED";
  return String(value).replace(/[^A-Z0-9_-]/gi, "_").slice(0, 80).toUpperCase();
}

function retryAt(attempts) {
  const delay = NOTIFICATION_DEFAULTS.EMAIL_RETRY_BASE_MS * (2 ** Math.max(0, attempts - 1));
  return new Date(Date.now() + delay);
}

export async function deliverNotificationEmail(notificationId, dependencies = defaultDependencies) {
  const claimed = await dependencies.notificationRepository.claimNotificationEmail(
    notificationId,
    NOTIFICATION_DEFAULTS.EMAIL_MAX_ATTEMPTS
  );
  if (!claimed) return { claimed: false };

  if (!dependencies.emailService.isConfigured()) {
    await dependencies.notificationRepository.markNotificationEmailNotConfigured(getDocumentId(claimed));
    return { claimed: true, sent: false, notConfigured: true };
  }

  try {
    const recipient = claimed.recipient;
    if (!recipient?.email || !isActiveUser(recipient)) {
      await dependencies.notificationRepository.markNotificationEmailUndeliverable(getDocumentId(claimed));
      return { claimed: true, sent: false };
    }
    const template = buildNotificationEmail(claimed, recipient);
    await dependencies.emailService.sendTransactionalEmail({ to: recipient.email, ...template });
    await dependencies.notificationRepository.markNotificationEmailSent(getDocumentId(claimed));
    return { claimed: true, sent: true };
  } catch (error) {
    const attempts = Number(claimed.emailDelivery?.attempts || 1);
    await dependencies.notificationRepository.markNotificationEmailFailed(
      getDocumentId(claimed),
      emailFailureCode(error),
      attempts < NOTIFICATION_DEFAULTS.EMAIL_MAX_ATTEMPTS ? retryAt(attempts) : null
    );
    logger.error(`Notification email delivery failed for ${getDocumentId(claimed)}: ${error.message || error}`);
    return { claimed: true, sent: false };
  }
}

export async function createNotificationForUser(input, dependencies = defaultDependencies) {
  const recipient = await resolveUser(input.recipient, dependencies);
  if (!isActiveUser(recipient)) return { skipped: true, reason: "RECIPIENT_UNAVAILABLE" };
  if (input.allowedRoles?.length && !input.allowedRoles.includes(recipient.role)) {
    return { skipped: true, reason: "RECIPIENT_ROLE_MISMATCH" };
  }

  const recipientId = getDocumentId(recipient);
  const emailRequested = input.email !== false && Boolean(recipient.email);
  const deduplicationKey = `${recipientId}:${input.deduplicationKey}`;
  let notification;
  let created = false;

  try {
    notification = await dependencies.notificationRepository.createNotification({
      recipient: recipientId,
      organization: getDocumentId(input.organization || recipient.organization),
      type: input.type,
      title: input.title,
      message: input.message,
      relatedEntity: input.relatedEntity,
      navigation: input.navigation,
      metadata: input.metadata || {},
      channels: emailRequested
        ? [NOTIFICATION_CHANNEL.IN_APP, NOTIFICATION_CHANNEL.EMAIL]
        : [NOTIFICATION_CHANNEL.IN_APP],
      emailDelivery: {
        status: emailRequested ? EMAIL_DELIVERY_STATUS.PENDING : EMAIL_DELIVERY_STATUS.NOT_REQUESTED,
        nextAttemptAt: emailRequested ? new Date() : null,
      },
      deduplicationKey,
    });
    created = true;
  } catch (error) {
    if (error?.code !== 11000) throw error;
    notification = await dependencies.notificationRepository.findNotificationByDeduplicationKey(deduplicationKey);
  }

  if (created && emailRequested) {
    await deliverNotificationEmail(getDocumentId(notification), dependencies);
  }
  return { notification: mapNotificationResponse(notification), created };
}

async function notifyRecipients(recipients, buildInput, dependencies) {
  let created = 0;
  let failed = 0;
  for (let index = 0; index < recipients.length; index += NOTIFICATION_DEFAULTS.DELIVERY_BATCH_SIZE) {
    const batch = recipients.slice(index, index + NOTIFICATION_DEFAULTS.DELIVERY_BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map((recipient) => createNotificationForUser(buildInput(recipient), dependencies))
    );
    created += results.filter((result) => result.status === "fulfilled" && result.value.created).length;
    failed += results.filter((result) => result.status === "rejected").length;
  }
  if (failed) logger.error(`${failed} notification records could not be created`);
  return { recipients: recipients.length, created, failed };
}

export async function listNotifications(recipientId, query = {}, dependencies = defaultDependencies) {
  const pagination = buildPaginationOptions(query, {
    page: 1,
    limit: NOTIFICATION_DEFAULTS.PAGE_SIZE,
    sortBy: "createdAt",
  });
  const filter = {};
  if (query.isRead !== undefined) filter.isRead = query.isRead;
  if (query.type) filter.type = query.type;
  const [notifications, totalItems] = await Promise.all([
    dependencies.notificationRepository.findNotificationsForRecipient(recipientId, filter, pagination),
    dependencies.notificationRepository.countNotificationsForRecipient(recipientId, filter),
  ]);
  return {
    notifications: notifications.map(mapNotificationResponse),
    pagination: buildPaginationMeta(totalItems, pagination),
  };
}

export async function getUnreadCount(recipientId, dependencies = defaultDependencies) {
  return { unreadCount: await dependencies.notificationRepository.countUnreadNotifications(recipientId) };
}

export async function markNotificationRead(recipientId, notificationId, dependencies = defaultDependencies) {
  const notification = await dependencies.notificationRepository.markNotificationReadForRecipient(notificationId, recipientId);
  if (!notification) return { error: "Notification not found", statusCode: HTTP_STATUS.NOT_FOUND };
  return { notification: mapNotificationResponse(notification) };
}

export async function markAllNotificationsRead(recipientId, dependencies = defaultDependencies) {
  const result = await dependencies.notificationRepository.markAllNotificationsReadForRecipient(recipientId);
  return { updatedCount: Number(result.modifiedCount || 0) };
}

export async function sendPaymentSuccessNotification(order, dependencies = defaultDependencies) {
  if (order?.paymentStatus !== PAYMENT_STATUS.PAID) return { skipped: true, reason: "PAYMENT_NOT_CONFIRMED" };
  const recipient = await resolveUser(order.customer, dependencies);
  if (!recipient) return { skipped: true, reason: "CUSTOMER_UNAVAILABLE" };
  const quantity = (order.items || []).reduce((total, item) => total + Number(item.quantity || 0), 0);
  const itemSummary = (order.items || []).map((item) => `${item.quantity} x ${item.name}`).join(", ");
  return createNotificationForUser({
    recipient,
    allowedRoles: [USER_ROLES.CUSTOMER],
    type: NOTIFICATION_TYPE.PAYMENT_CONFIRMED,
    title: "Payment confirmed",
    message: `Payment of ${formatMoney(order.total, order.currency)} for ${eventName(order.event)} was confirmed. Order ${order.reference} includes ${quantity} ticket${quantity === 1 ? "" : "s"}${itemSummary ? ` (${itemSummary})` : ""}.`,
    relatedEntity: { type: NOTIFICATION_ENTITY_TYPE.ORDER, id: getDocumentId(order) },
    navigation: { key: NOTIFICATION_NAVIGATION_KEY.CUSTOMER_TICKETS, params: {} },
    metadata: { orderReference: order.reference, amount: Number(order.total || 0), currency: order.currency || "NGN", ticketCount: quantity },
    deduplicationKey: `${NOTIFICATION_TYPE.PAYMENT_CONFIRMED}:ORDER:${getDocumentId(order)}:${PAYMENT_STATUS.PAID}`,
  }, dependencies);
}

export async function sendTicketIssuedNotification(order, tickets = [], dependencies = defaultDependencies) {
  if (order?.paymentStatus !== PAYMENT_STATUS.PAID || !tickets.length) return { skipped: true, reason: "TICKETS_NOT_ISSUED" };
  const recipient = await resolveUser(order.customer, dependencies);
  if (!recipient) return { skipped: true, reason: "CUSTOMER_UNAVAILABLE" };
  const references = tickets.slice(0, 5).map((ticket) => ticket.reference).filter(Boolean);
  return createNotificationForUser({
    recipient,
    allowedRoles: [USER_ROLES.CUSTOMER],
    type: NOTIFICATION_TYPE.TICKET_ISSUED,
    title: "Your tickets are ready",
    message: `${tickets.length} ticket${tickets.length === 1 ? " is" : "s are"} ready for ${eventName(order.event)}. Open My Tickets for secure QR access.`,
    relatedEntity: { type: NOTIFICATION_ENTITY_TYPE.ORDER, id: getDocumentId(order) },
    navigation: { key: NOTIFICATION_NAVIGATION_KEY.CUSTOMER_TICKETS, params: {} },
    metadata: { orderReference: order.reference, ticketCount: tickets.length, ticketReferences: references },
    deduplicationKey: `${NOTIFICATION_TYPE.TICKET_ISSUED}:ORDER:${getDocumentId(order)}`,
  }, dependencies);
}

export async function sendRefundStatusNotification(refund, dependencies = defaultDependencies) {
  const order = isUserDocument(refund?.order?.customer)
    ? refund.order
    : await dependencies.orderRepository.findOrderById(getDocumentId(refund?.order));
  if (!order) return { skipped: true, reason: "ORDER_UNAVAILABLE" };
  const recipient = await resolveUser(order.customer, dependencies);
  const statusConfig = {
    [REFUND_STATUS.PENDING]: [NOTIFICATION_TYPE.REFUND_PROCESSING, "Refund requested", "Your refund request has been received and is awaiting processing."],
    [REFUND_STATUS.PROCESSING]: [NOTIFICATION_TYPE.REFUND_PROCESSING, "Refund processing", "Your refund is being processed."],
    [REFUND_STATUS.SUCCEEDED]: [NOTIFICATION_TYPE.REFUND_COMPLETED, "Refund completed", "Your refund was completed successfully."],
    [REFUND_STATUS.FAILED]: [NOTIFICATION_TYPE.REFUND_FAILED, "Refund needs attention", "Your refund could not be completed. Please review your order history for the current status."],
  }[refund?.status];
  if (!recipient || !statusConfig) return { skipped: true, reason: "REFUND_STATUS_NOT_SUPPORTED" };
  const [type, title, statusMessage] = statusConfig;
  return createNotificationForUser({
    recipient,
    allowedRoles: [USER_ROLES.CUSTOMER],
    type,
    title,
    message: `${statusMessage} ${formatMoney(refund.amount, order.currency)} for order ${order.reference}.`,
    relatedEntity: { type: NOTIFICATION_ENTITY_TYPE.REFUND, id: getDocumentId(refund) },
    navigation: { key: NOTIFICATION_NAVIGATION_KEY.CUSTOMER_HISTORY, params: {} },
    metadata: { refundReference: refund.reference, orderReference: order.reference, status: refund.status, amount: Number(refund.amount || 0), currency: order.currency || "NGN" },
    deduplicationKey: `${type}:REFUND:${getDocumentId(refund)}:${refund.status}`,
  }, dependencies);
}

export async function sendEventLifecycleNotifications(event, context = {}, dependencies = defaultDependencies) {
  const eventId = getDocumentId(event);
  if (!eventId) return { skipped: true, reason: "EVENT_UNAVAILABLE" };
  if (context.action === "publish") {
    const assignments = await dependencies.eventManagerAssignmentRepository.findEventManagers(eventId);
    const managers = assignments.map((assignment) => assignment.user).filter(Boolean);
    return notifyRecipients(managers, (recipient) => ({
      recipient,
      allowedRoles: [USER_ROLES.MANAGER],
      organization: event.organization,
      type: NOTIFICATION_TYPE.EVENT_PUBLISHED,
      title: "Assigned event published",
      message: `${eventName(event)} has been published and is now visible to customers.`,
      relatedEntity: { type: NOTIFICATION_ENTITY_TYPE.EVENT, id: eventId },
      navigation: { key: NOTIFICATION_NAVIGATION_KEY.MANAGER_EVENT, params: { eventId } },
      metadata: { eventName: eventName(event), status: EVENT_STATUS.PUBLISHED },
      deduplicationKey: `${NOTIFICATION_TYPE.EVENT_PUBLISHED}:EVENT:${eventId}:${event.updatedAt || event.startAt || "published"}`,
    }), dependencies);
  }

  if (!["postpone", "cancel"].includes(context.action)) return { skipped: true, reason: "LIFECYCLE_NOTIFICATION_NOT_REQUIRED" };
  const recipients = await dependencies.ticketRepository.findEventNotificationRecipients(eventId, {
    ticketStatuses: [TICKET_STATUS.VALID, TICKET_STATUS.USED],
  });
  const isPostponed = context.action === "postpone";
  const type = isPostponed ? NOTIFICATION_TYPE.EVENT_POSTPONED : NOTIFICATION_TYPE.EVENT_CANCELED;
  const schedule = isPostponed ? ` The new schedule is ${formatDateTime(event.startAt)}.` : "";
  const guidance = isPostponed
    ? " Your existing ticket remains available in My Tickets."
    : " Any eligible refund will be handled separately; check your history for authoritative refund updates.";
  return notifyRecipients(recipients, (recipient) => ({
    recipient,
    allowedRoles: [USER_ROLES.CUSTOMER],
    organization: event.organization,
    type,
    title: `${eventName(event)} ${isPostponed ? "postponed" : "canceled"}`,
    message: `${eventName(event)} has been ${isPostponed ? "postponed" : "canceled"}.${schedule}${context.reason ? ` Reason: ${context.reason}.` : ""}${guidance}`,
    relatedEntity: { type: NOTIFICATION_ENTITY_TYPE.EVENT, id: eventId },
    navigation: { key: NOTIFICATION_NAVIGATION_KEY.CUSTOMER_TICKETS, params: { eventId } },
    metadata: { eventName: eventName(event), eventStatus: event.status, startAt: event.startAt || null },
    deduplicationKey: `${type}:EVENT:${eventId}:${event.updatedAt || event.startAt || context.reason || event.status}`,
  }), dependencies);
}

export async function sendEventReminderNotifications(event, dependencies = defaultDependencies) {
  if (event?.status !== EVENT_STATUS.PUBLISHED) return { skipped: true, reason: "EVENT_NOT_ELIGIBLE" };
  const eventId = getDocumentId(event);
  const recipients = await dependencies.ticketRepository.findEventNotificationRecipients(eventId, {
    ticketStatuses: [TICKET_STATUS.VALID],
    paymentStatuses: [PAYMENT_STATUS.PAID, PAYMENT_STATUS.PARTIALLY_REFUNDED],
  });
  return notifyRecipients(recipients, (recipient) => ({
    recipient,
    allowedRoles: [USER_ROLES.CUSTOMER],
    organization: event.organization,
    type: NOTIFICATION_TYPE.EVENT_REMINDER,
    title: `${eventName(event)} is tomorrow`,
    message: `Reminder: ${eventName(event)} starts ${formatDateTime(event.startAt)} at ${eventVenue(event)}. Open My Tickets before arrival.`,
    relatedEntity: { type: NOTIFICATION_ENTITY_TYPE.EVENT, id: eventId },
    navigation: { key: NOTIFICATION_NAVIGATION_KEY.CUSTOMER_TICKETS, params: { eventId } },
    metadata: { eventName: eventName(event), startAt: event.startAt, venue: eventVenue(event), reminder: "24_HOURS" },
    deduplicationKey: `${NOTIFICATION_TYPE.EVENT_REMINDER}:EVENT:${eventId}:24_HOURS:${new Date(event.startAt).toISOString()}`,
  }), dependencies);
}

export async function sendManagerAssignedNotification(manager, event, assignment, dependencies = defaultDependencies) {
  const eventId = getDocumentId(event);
  return createNotificationForUser({
    recipient: manager,
    allowedRoles: [USER_ROLES.MANAGER],
    organization: event.organization,
    type: NOTIFICATION_TYPE.MANAGER_ASSIGNED,
    title: "Event assignment",
    message: `You have been assigned to ${eventName(event)} scheduled for ${formatDateTime(event.startAt)}.`,
    relatedEntity: { type: NOTIFICATION_ENTITY_TYPE.MANAGER_ASSIGNMENT, id: getDocumentId(assignment) },
    navigation: { key: NOTIFICATION_NAVIGATION_KEY.MANAGER_EVENT, params: { eventId } },
    metadata: { eventName: eventName(event), eventId, startAt: event.startAt || null },
    deduplicationKey: `${NOTIFICATION_TYPE.MANAGER_ASSIGNED}:ASSIGNMENT:${getDocumentId(assignment)}`,
  }, dependencies);
}

function withdrawalType(status, event) {
  if (event === "submitted") return NOTIFICATION_TYPE.WITHDRAWAL_SUBMITTED;
  if (status === WITHDRAWAL_STATUS.REJECTED) return NOTIFICATION_TYPE.WITHDRAWAL_REJECTED;
  if (status === WITHDRAWAL_STATUS.PAID) return NOTIFICATION_TYPE.WITHDRAWAL_COMPLETED;
  if (status === WITHDRAWAL_STATUS.FAILED) return NOTIFICATION_TYPE.WITHDRAWAL_FAILED;
  if ([WITHDRAWAL_STATUS.APPROVED, WITHDRAWAL_STATUS.PROCESSING].includes(status)) return NOTIFICATION_TYPE.WITHDRAWAL_APPROVED;
  return null;
}

export async function sendWithdrawalStatusNotification(withdrawal, context = {}, dependencies = defaultDependencies) {
  const type = withdrawalType(withdrawal?.status, context.event);
  if (!type) return { skipped: true, reason: "WITHDRAWAL_STATUS_NOT_SUPPORTED" };
  const withdrawalId = getDocumentId(withdrawal);
  const statusText = {
    [NOTIFICATION_TYPE.WITHDRAWAL_SUBMITTED]: "submitted for Super Admin review",
    [NOTIFICATION_TYPE.WITHDRAWAL_APPROVED]: "approved and is being processed",
    [NOTIFICATION_TYPE.WITHDRAWAL_REJECTED]: `rejected${withdrawal.rejectionReason ? `: ${withdrawal.rejectionReason}` : ""}`,
    [NOTIFICATION_TYPE.WITHDRAWAL_COMPLETED]: "completed by the payment provider",
    [NOTIFICATION_TYPE.WITHDRAWAL_FAILED]: "not completed; review the Finance page for the current status",
  }[type];
  const results = [];

  if (context.event === "submitted") {
    const superAdmins = await dependencies.userRepository.findActiveUsersByRole(USER_ROLES.SUPER_ADMIN);
    results.push(await notifyRecipients(superAdmins, (recipient) => ({
      recipient,
      allowedRoles: [USER_ROLES.SUPER_ADMIN],
      type,
      title: "Withdrawal review required",
      message: `${withdrawal.organization?.organizationName || "An organization"} submitted a ${formatMoney(withdrawal.amount, withdrawal.currency)} withdrawal request.`,
      relatedEntity: { type: NOTIFICATION_ENTITY_TYPE.WITHDRAWAL, id: withdrawalId },
      navigation: { key: NOTIFICATION_NAVIGATION_KEY.SUPER_ADMIN_WITHDRAWALS, params: { withdrawalId } },
      metadata: { reference: withdrawal.reference, amount: Number(withdrawal.amount || 0), currency: withdrawal.currency || "NGN", status: withdrawal.status },
      deduplicationKey: `${type}:WITHDRAWAL:${withdrawalId}:${withdrawal.status}`,
    }), dependencies));
  }

  const requestedBy = await resolveUser(withdrawal.requestedBy, dependencies);
  if (requestedBy) {
    results.push(await createNotificationForUser({
      recipient: requestedBy,
      allowedRoles: [USER_ROLES.ADMIN],
      organization: withdrawal.organization,
      type,
      title: type === NOTIFICATION_TYPE.WITHDRAWAL_SUBMITTED ? "Withdrawal submitted" : "Withdrawal status updated",
      message: `Withdrawal ${withdrawal.reference} for ${formatMoney(withdrawal.amount, withdrawal.currency)} was ${statusText}.`,
      relatedEntity: { type: NOTIFICATION_ENTITY_TYPE.WITHDRAWAL, id: withdrawalId },
      navigation: { key: NOTIFICATION_NAVIGATION_KEY.ORGANIZATION_FINANCE, params: { withdrawalId } },
      metadata: { reference: withdrawal.reference, amount: Number(withdrawal.amount || 0), currency: withdrawal.currency || "NGN", status: withdrawal.status },
      deduplicationKey: `${type}:WITHDRAWAL:${withdrawalId}:${withdrawal.status}`,
    }, dependencies));
  }
  return { results };
}

export async function processDueEventReminders(now = new Date(), dependencies = defaultDependencies) {
  const leadMs = NOTIFICATION_DEFAULTS.REMINDER_HOURS_BEFORE_EVENT * 60 * 60 * 1000;
  const startAt = new Date(now.getTime() + leadMs - NOTIFICATION_DEFAULTS.WORKER_INTERVAL_MS);
  const endAt = new Date(now.getTime() + leadMs);
  const events = await dependencies.eventRepository.findEventsStartingBetween(startAt, endAt, [EVENT_STATUS.PUBLISHED]);
  const results = await Promise.allSettled(events.map((event) => sendEventReminderNotifications(event, dependencies)));
  return { eventsScanned: events.length, completed: results.filter((result) => result.status === "fulfilled").length };
}

export async function retryPendingNotificationEmails(dependencies = defaultDependencies) {
  const notifications = await dependencies.notificationRepository.findRetryableNotificationEmails(
    NOTIFICATION_DEFAULTS.EMAIL_MAX_ATTEMPTS
  );
  const results = await Promise.allSettled(
    notifications.map((notification) => deliverNotificationEmail(getDocumentId(notification), dependencies))
  );
  return { emailsScanned: notifications.length, completed: results.filter((result) => result.status === "fulfilled").length };
}
