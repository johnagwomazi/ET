import test from "node:test";
import assert from "node:assert/strict";

import { EVENT_STATUS } from "../src/constants/eventStatus.constants.js";
import {
  EMAIL_DELIVERY_STATUS,
  NOTIFICATION_TYPE,
} from "../src/constants/notification.constants.js";
import { USER_ROLES } from "../src/constants/roles.constants.js";
import { PAYMENT_STATUS, REFUND_STATUS, TICKET_STATUS, WITHDRAWAL_STATUS } from "../src/constants/ticketing.constants.js";
import * as notificationService from "../src/services/notification.service.js";
import { buildNotificationEmail } from "../src/utils/notificationEmail.util.js";
import {
  notificationIdParamSchema,
  notificationListQuerySchema,
} from "../src/validators/notification.validator.js";
import Notification from "../src/models/notification.model.js";
import notificationRoutes from "../src/routes/notification.routes.js";

const ids = {
  customer: "64b64b64b64b64b64b64c801",
  otherCustomer: "64b64b64b64b64b64b64c802",
  admin: "64b64b64b64b64b64b64c803",
  manager: "64b64b64b64b64b64b64c804",
  superAdmin: "64b64b64b64b64b64b64c805",
  organization: "64b64b64b64b64b64b64c806",
  event: "64b64b64b64b64b64b64c807",
  order: "64b64b64b64b64b64b64c808",
  refund: "64b64b64b64b64b64b64c809",
  withdrawal: "64b64b64b64b64b64b64c810",
  assignment: "64b64b64b64b64b64b64c811",
};

function createDependencies(options = {}) {
  const users = new Map([
    [ids.customer, { _id: ids.customer, firstName: "Ada", email: "ada@example.com", role: USER_ROLES.CUSTOMER, accountStatus: "ACTIVE", isDeleted: false }],
    [ids.otherCustomer, { _id: ids.otherCustomer, firstName: "Other", email: "other@example.com", role: USER_ROLES.CUSTOMER, accountStatus: "ACTIVE", isDeleted: false }],
    [ids.admin, { _id: ids.admin, firstName: "Admin", email: "admin@example.com", role: USER_ROLES.ADMIN, organization: ids.organization, accountStatus: "ACTIVE", isDeleted: false }],
    [ids.manager, { _id: ids.manager, firstName: "Manager", email: "manager@example.com", role: USER_ROLES.MANAGER, organization: ids.organization, accountStatus: "ACTIVE", isDeleted: false }],
    [ids.superAdmin, { _id: ids.superAdmin, firstName: "Super", email: "super@example.com", role: USER_ROLES.SUPER_ADMIN, accountStatus: "ACTIVE", isDeleted: false }],
  ]);
  const notifications = [];
  const sentEmails = [];
  let recipientQueries = 0;

  const notificationRepository = {
    async createNotification(data) {
      if (notifications.some((item) => item.deduplicationKey === data.deduplicationKey)) {
        const error = new Error("duplicate");
        error.code = 11000;
        throw error;
      }
      const notification = {
        _id: `64b64b64b64b64b64b64d${String(notifications.length + 1).padStart(3, "0")}`,
        isRead: false,
        readAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...data,
      };
      notifications.push(notification);
      return notification;
    },
    async findNotificationByDeduplicationKey(key) {
      return notifications.find((item) => item.deduplicationKey === key) || null;
    },
    async findNotificationsForRecipient(recipient, filter, pagination) {
      return notifications
        .filter((item) => item.recipient === recipient)
        .filter((item) => filter.isRead === undefined || item.isRead === filter.isRead)
        .filter((item) => !filter.type || item.type === filter.type)
        .slice(pagination.skip, pagination.skip + pagination.limit);
    },
    async countNotificationsForRecipient(recipient, filter) {
      return notifications.filter((item) =>
        item.recipient === recipient &&
        (filter.isRead === undefined || item.isRead === filter.isRead) &&
        (!filter.type || item.type === filter.type)
      ).length;
    },
    async countUnreadNotifications(recipient) {
      return notifications.filter((item) => item.recipient === recipient && !item.isRead).length;
    },
    async markNotificationReadForRecipient(notificationId, recipient) {
      const notification = notifications.find((item) => item._id === notificationId && item.recipient === recipient);
      if (!notification) return null;
      notification.isRead = true;
      notification.readAt = new Date();
      return notification;
    },
    async markAllNotificationsReadForRecipient(recipient) {
      let modifiedCount = 0;
      notifications.forEach((item) => {
        if (item.recipient === recipient && !item.isRead) {
          item.isRead = true;
          item.readAt = new Date();
          modifiedCount += 1;
        }
      });
      return { modifiedCount };
    },
    async claimNotificationEmail(notificationId) {
      const notification = notifications.find((item) => item._id === notificationId);
      if (!notification || ![EMAIL_DELIVERY_STATUS.PENDING, EMAIL_DELIVERY_STATUS.FAILED].includes(notification.emailDelivery.status)) return null;
      notification.emailDelivery.status = EMAIL_DELIVERY_STATUS.SENDING;
      notification.emailDelivery.attempts = Number(notification.emailDelivery.attempts || 0) + 1;
      return { ...notification, recipient: users.get(notification.recipient) };
    },
    async markNotificationEmailSent(notificationId) {
      const notification = notifications.find((item) => item._id === notificationId);
      notification.emailDelivery.status = EMAIL_DELIVERY_STATUS.SENT;
      return notification;
    },
    async markNotificationEmailFailed(notificationId, failureCode, nextAttemptAt) {
      const notification = notifications.find((item) => item._id === notificationId);
      notification.emailDelivery.status = EMAIL_DELIVERY_STATUS.FAILED;
      notification.emailDelivery.failureCode = failureCode;
      notification.emailDelivery.nextAttemptAt = nextAttemptAt;
      return notification;
    },
    async markNotificationEmailNotConfigured(notificationId) {
      const notification = notifications.find((item) => item._id === notificationId);
      notification.emailDelivery.status = EMAIL_DELIVERY_STATUS.NOT_CONFIGURED;
      return notification;
    },
    async markNotificationEmailUndeliverable(notificationId) {
      const notification = notifications.find((item) => item._id === notificationId);
      notification.emailDelivery.status = EMAIL_DELIVERY_STATUS.UNDELIVERABLE;
      return notification;
    },
    async findRetryableNotificationEmails() {
      return notifications.filter((item) => item.emailDelivery.status === EMAIL_DELIVERY_STATUS.FAILED);
    },
  };

  const dependencies = {
    notificationRepository,
    userRepository: {
      async findUserById(userId) { return users.get(userId) || null; },
      async findActiveUsersByRole(role) { return [...users.values()].filter((user) => user.role === role); },
    },
    ticketRepository: {
      async findEventNotificationRecipients() {
        recipientQueries += 1;
        return options.eventRecipients || [users.get(ids.customer)];
      },
    },
    orderRepository: {
      async findOrderById() { return options.order || null; },
    },
    eventRepository: {
      async findEventsStartingBetween() { return options.upcomingEvents || []; },
    },
    eventManagerAssignmentRepository: {
      async findEventManagers() { return options.assignments || []; },
    },
    emailService: {
      isConfigured() { return options.emailConfigured !== false; },
      async sendTransactionalEmail(payload) {
        if (options.emailFails) throw Object.assign(new Error("SMTP unavailable"), { code: "ECONNECTION" });
        sentEmails.push(payload);
        return { sent: true };
      },
    },
  };

  return { dependencies, notifications, sentEmails, users, get recipientQueries() { return recipientQueries; } };
}

function event(overrides = {}) {
  return {
    _id: ids.event,
    eventName: "Lagos Product Summit",
    status: EVENT_STATUS.PUBLISHED,
    startAt: new Date("2026-09-05T10:00:00.000Z"),
    updatedAt: new Date("2026-09-04T09:00:00.000Z"),
    venue: { name: "Civic Centre" },
    organization: ids.organization,
    ...overrides,
  };
}

function paidOrder(overrides = {}) {
  return {
    _id: ids.order,
    reference: "ord_phase8",
    customer: { _id: ids.customer, firstName: "Ada", email: "ada@example.com", role: USER_ROLES.CUSTOMER, accountStatus: "ACTIVE", isDeleted: false },
    event: event(),
    items: [{ name: "General", quantity: 2 }],
    total: 10000,
    currency: "NGN",
    paymentStatus: PAYMENT_STATUS.PAID,
    ...overrides,
  };
}

test("Phase 8 validates list filters and notification identifiers", () => {
  assert.equal(notificationListQuerySchema.safeParse({ page: "1", limit: "20", isRead: "false", type: NOTIFICATION_TYPE.EVENT_REMINDER }).success, true);
  assert.equal(notificationListQuerySchema.safeParse({ limit: 101 }).success, false);
  assert.equal(notificationListQuerySchema.safeParse({ type: "MARKETING_BLAST" }).success, false);
  assert.equal(notificationListQuerySchema.safeParse({ $where: "x" }).success, false);
  assert.equal(notificationIdParamSchema.safeParse({ notificationId: ids.event }).success, true);
  assert.equal(notificationIdParamSchema.safeParse({ notificationId: "not-an-id" }).success, false);
});

test("notification model includes ownership, history, delivery, and deduplication indexes", () => {
  const paths = Notification.schema.paths;
  assert.ok(paths.recipient);
  assert.ok(paths.isRead);
  assert.ok(paths.deduplicationKey);
  const indexes = Notification.schema.indexes().map(([fields]) => JSON.stringify(fields));
  assert.ok(indexes.includes(JSON.stringify({ recipient: 1, isRead: 1, createdAt: -1 })));
  assert.ok(indexes.includes(JSON.stringify({ deduplicationKey: 1 })));
});

test("authenticated notification routes expose list, count, read, and read-all only", () => {
  const routes = notificationRoutes.stack.filter((layer) => layer.route).map((layer) => `${Object.keys(layer.route.methods)[0]} ${layer.route.path}`);
  assert.deepEqual(routes, ["get /", "get /unread-count", "patch /read-all", "patch /:notificationId/read"]);
});

test("users list and mutate only their own notification history", async () => {
  const state = createDependencies();
  await notificationService.sendPaymentSuccessNotification(paidOrder(), state.dependencies);
  await notificationService.createNotificationForUser({
    recipient: state.users.get(ids.otherCustomer),
    type: NOTIFICATION_TYPE.TICKET_ISSUED,
    title: "Other",
    message: "Other customer notification",
    relatedEntity: { type: "ORDER", id: ids.order },
    navigation: { key: "CUSTOMER_TICKETS", params: {} },
    deduplicationKey: "other-record",
  }, state.dependencies);

  const own = await notificationService.listNotifications(ids.customer, {}, state.dependencies);
  const unread = await notificationService.getUnreadCount(ids.customer, state.dependencies);
  const denied = await notificationService.markNotificationRead(ids.customer, state.notifications[1]._id, state.dependencies);
  const marked = await notificationService.markNotificationRead(ids.customer, state.notifications[0]._id, state.dependencies);
  assert.equal(own.notifications.length, 1);
  assert.equal(unread.unreadCount, 1);
  assert.equal(denied.statusCode, 404);
  assert.equal(marked.notification.isRead, true);
  assert.equal((await notificationService.markAllNotificationsRead(ids.otherCustomer, state.dependencies)).updatedCount, 1);
});

test("verified payment and issued tickets are role-safe and duplicate-proof", async () => {
  const state = createDependencies();
  const order = paidOrder();
  await notificationService.sendPaymentSuccessNotification(order, state.dependencies);
  await notificationService.sendPaymentSuccessNotification(order, state.dependencies);
  await notificationService.sendTicketIssuedNotification(order, [{ reference: "tkt_1" }, { reference: "tkt_2" }], state.dependencies);
  await notificationService.sendTicketIssuedNotification(order, [{ reference: "tkt_1" }, { reference: "tkt_2" }], state.dependencies);
  const failed = await notificationService.sendPaymentSuccessNotification({ ...order, paymentStatus: PAYMENT_STATUS.FAILED }, state.dependencies);
  const wrongRole = await notificationService.sendPaymentSuccessNotification({ ...order, customer: state.users.get(ids.manager) }, state.dependencies);
  assert.equal(state.notifications.length, 2);
  assert.equal(state.sentEmails.length, 2);
  assert.equal(failed.reason, "PAYMENT_NOT_CONFIRMED");
  assert.equal(wrongRole.reason, "RECIPIENT_ROLE_MISMATCH");
  assert.equal(state.notifications[1].metadata.ticketReferences.length, 2);
  assert.equal(JSON.stringify(state.notifications).includes("qrToken"), false);
});

test("postponement notifies only deduplicated ticket holders with the new schedule", async () => {
  const state = createDependencies({ eventRecipients: [] });
  state.dependencies.ticketRepository.findEventNotificationRecipients = async () => [state.users.get(ids.customer), state.users.get(ids.customer)];
  await notificationService.sendEventLifecycleNotifications(
    event({ status: EVENT_STATUS.POSTPONED, startAt: new Date("2026-10-01T12:00:00.000Z") }),
    { action: "postpone", reason: "Venue maintenance" },
    state.dependencies
  );
  assert.equal(state.notifications.length, 1);
  assert.equal(state.notifications[0].type, NOTIFICATION_TYPE.EVENT_POSTPONED);
  assert.match(state.notifications[0].message, /new schedule/i);
  assert.match(state.notifications[0].message, /venue maintenance/i);
});

test("event publication notifies assigned managers without broadcasting to customers", async () => {
  const state = createDependencies({
    assignments: [{ _id: ids.assignment, user: null }],
  });
  state.dependencies.eventManagerAssignmentRepository.findEventManagers = async () => [
    { _id: ids.assignment, user: state.users.get(ids.manager) },
  ];
  await notificationService.sendEventLifecycleNotifications(
    event(),
    { action: "publish" },
    state.dependencies
  );
  assert.equal(state.notifications.length, 1);
  assert.equal(state.notifications[0].recipient, ids.manager);
  assert.equal(state.notifications[0].type, NOTIFICATION_TYPE.EVENT_PUBLISHED);
  assert.equal(state.recipientQueries, 0);
});

test("cancellation wording never claims that a separate refund completed", async () => {
  const state = createDependencies();
  await notificationService.sendEventLifecycleNotifications(
    event({ status: EVENT_STATUS.CANCELED }),
    { action: "cancel", reason: "Safety concern" },
    state.dependencies
  );
  assert.equal(state.notifications[0].type, NOTIFICATION_TYPE.EVENT_CANCELED);
  assert.match(state.notifications[0].message, /handled separately/i);
  assert.doesNotMatch(state.notifications[0].message, /refund (was|has been) completed/i);
});

test("refund notification wording follows the actual canonical status", async () => {
  const order = paidOrder();
  const state = createDependencies({ order });
  for (const status of [REFUND_STATUS.PROCESSING, REFUND_STATUS.SUCCEEDED, REFUND_STATUS.FAILED]) {
    await notificationService.sendRefundStatusNotification({
      _id: ids.refund,
      reference: "ref_phase8",
      order: ids.order,
      amount: 5000,
      status,
    }, state.dependencies);
  }
  assert.deepEqual(state.notifications.map((item) => item.type), [
    NOTIFICATION_TYPE.REFUND_PROCESSING,
    NOTIFICATION_TYPE.REFUND_COMPLETED,
    NOTIFICATION_TYPE.REFUND_FAILED,
  ]);
  assert.match(state.notifications[0].message, /being processed/i);
  assert.match(state.notifications[1].message, /completed successfully/i);
  assert.doesNotMatch(state.notifications[2].message, /provider|paystack/i);
});

test("reminders include valid ticket access and remain duplicate-safe", async () => {
  const state = createDependencies();
  await notificationService.sendEventReminderNotifications(event(), state.dependencies);
  await notificationService.sendEventReminderNotifications(event(), state.dependencies);
  const canceled = await notificationService.sendEventReminderNotifications(event({ status: EVENT_STATUS.CANCELED }), state.dependencies);
  assert.equal(state.notifications.length, 1);
  assert.equal(state.notifications[0].type, NOTIFICATION_TYPE.EVENT_REMINDER);
  assert.match(state.notifications[0].message, /Civic Centre/);
  assert.equal(canceled.reason, "EVENT_NOT_ELIGIBLE");
  assert.equal(state.recipientQueries, 2);
});

test("reminder worker scans only the database window and published events", async () => {
  const upcoming = event();
  const state = createDependencies({ upcomingEvents: [upcoming] });
  let query;
  state.dependencies.eventRepository.findEventsStartingBetween = async (startAt, endAt, statuses) => {
    query = { startAt, endAt, statuses };
    return [upcoming];
  };
  const result = await notificationService.processDueEventReminders(new Date("2026-09-04T10:00:00.000Z"), state.dependencies);
  assert.equal(result.eventsScanned, 1);
  assert.deepEqual(query.statuses, [EVENT_STATUS.PUBLISHED]);
  assert.equal(query.endAt.toISOString(), "2026-09-05T10:00:00.000Z");
  assert.equal(state.notifications.length, 1);
});

test("withdrawal communication is limited to Admin and Super Admin recipients", async () => {
  const state = createDependencies();
  await notificationService.sendWithdrawalStatusNotification({
    _id: ids.withdrawal,
    reference: "wd_phase8",
    requestedBy: ids.admin,
    organization: { _id: ids.organization, organizationName: "Acme Events" },
    amount: 250000,
    currency: "NGN",
    status: WITHDRAWAL_STATUS.PENDING,
  }, { event: "submitted" }, state.dependencies);
  assert.deepEqual(new Set(state.notifications.map((item) => state.users.get(item.recipient).role)), new Set([USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN]));
  assert.equal(state.notifications.some((item) => item.recipient === ids.customer || item.recipient === ids.manager), false);
});

test("manager assignment notification rejects non-manager recipients", async () => {
  const state = createDependencies();
  const accepted = await notificationService.sendManagerAssignedNotification(
    state.users.get(ids.manager), event(), { _id: ids.assignment }, state.dependencies
  );
  const denied = await notificationService.sendManagerAssignedNotification(
    state.users.get(ids.customer), event(), { _id: ids.assignment }, state.dependencies
  );
  assert.equal(accepted.created, true);
  assert.equal(denied.reason, "RECIPIENT_ROLE_MISMATCH");
});

test("email failure is recorded for retry without failing notification creation", async () => {
  const state = createDependencies({ emailFails: true });
  const result = await notificationService.sendPaymentSuccessNotification(paidOrder(), state.dependencies);
  assert.equal(result.created, true);
  assert.equal(state.notifications[0].emailDelivery.status, EMAIL_DELIVERY_STATUS.FAILED);
  assert.equal(state.notifications[0].emailDelivery.failureCode, "ECONNECTION");
  assert.ok(state.notifications[0].emailDelivery.nextAttemptAt instanceof Date);
});

test("email template escapes stored content and uses only allowlisted navigation", () => {
  const template = buildNotificationEmail({
    title: "Payment <confirmed>",
    message: "Hello <script>alert(1)</script>",
    navigation: { key: "NOT_ALLOWED", params: { url: "https://evil.example" } },
  }, { firstName: "Ada" });
  assert.doesNotMatch(template.html, /<script>/);
  assert.doesNotMatch(template.html, /evil\.example/);
  assert.match(template.html, /&lt;script&gt;/);
});
