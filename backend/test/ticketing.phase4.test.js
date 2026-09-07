import test from "node:test";
import assert from "node:assert/strict";

import {
  checkoutSchema,
  refundCreateSchema,
  ticketTypeCreateSchema,
  ticketValidationSchema,
  withdrawalCreateSchema,
} from "../src/validators/ticketing.validator.js";
import {
  ORDER_STATUS,
  PAYMENT_STATUS,
  TICKET_STATUS,
  TICKET_VALIDATION_OUTCOME,
} from "../src/constants/ticketing.constants.js";
import { EVENT_STATUS } from "../src/constants/eventStatus.constants.js";
import { USER_ROLES } from "../src/constants/roles.constants.js";
import * as ticketingService from "../src/services/ticketing.service.js";
import { buildPaymentCallbackUrl } from "../src/utils/payment.util.js";

const ids = {
  customer: "64b64b64b64b64b64b64b641",
  admin: "64b64b64b64b64b64b64b642",
  manager: "64b64b64b64b64b64b64b643",
  organization: "64b64b64b64b64b64b64b644",
  event: "64b64b64b64b64b64b64b645",
  ticketType: "64b64b64b64b64b64b64b646",
  order: "64b64b64b64b64b64b64b647",
  ticket: "64b64b64b64b64b64b64b648",
};

function createDependencies(overrides = {}) {
  const organization = {
    _id: ids.organization,
    status: "APPROVED",
    isDeleted: false,
    primaryAdmin: ids.admin,
  };
  const event = {
    _id: ids.event,
    eventName: "Launch Night",
    status: EVENT_STATUS.PUBLISHED,
    organization,
    startAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    endAt: new Date(Date.now() + 26 * 60 * 60 * 1000),
    capacity: 100,
  };
  const ticketType = {
    _id: ids.ticketType,
    event: ids.event,
    organization: ids.organization,
    name: "Regular",
    price: 2500,
    currency: "NGN",
    quantity: 10,
    soldQuantity: 2,
    maxPerOrder: 4,
    status: "ACTIVE",
    saleStartsAt: null,
    saleEndsAt: null,
  };
  let order = {
    _id: ids.order,
    reference: "ord_test",
    customer: ids.customer,
    organization: ids.organization,
    event: ids.event,
    items: [
      {
        ticketType: ids.ticketType,
        name: "Regular",
        quantity: 2,
        unitPrice: 2500,
        total: 5000,
      },
    ],
    subtotal: 5000,
    fees: 0,
    total: 5000,
    currency: "NGN",
    paymentStatus: PAYMENT_STATUS.PENDING,
    orderStatus: ORDER_STATUS.PENDING,
    paymentReference: "pay_test",
    customerInfo: {
      name: "Ada Buyer",
      phone: "+2348012345678",
      email: "ada@example.com",
    },
    metadata: {
      attendeeLines: [
        {
          ticketTypeId: ids.ticketType,
          attendees: [
            { name: "Ada One", phone: "+2348012345678", email: "ada1@example.com" },
            { name: "Ada Two", phone: "+2348012345679", email: "ada2@example.com" },
          ],
        },
      ],
    },
  };
  let tickets = [];
  let refunds = [];

  function hydrateTicket(ticket) {
    if (!ticket) {
      return null;
    }

    return {
      ...ticket,
      event,
      organization: ids.organization,
      ticketType,
      order,
    };
  }

  const dependencies = {
    mongoose: {
      connection: { readyState: 0 },
    },
    authRepository: {
      async findAuthUserById(userId) {
        if (userId === ids.customer) {
          return { _id: ids.customer, role: USER_ROLES.CUSTOMER };
        }

        if (userId === ids.admin) {
          return { _id: ids.admin, role: USER_ROLES.ADMIN, organization: ids.organization };
        }

        if (userId === ids.manager) {
          return { _id: ids.manager, role: USER_ROLES.MANAGER, organization: ids.organization };
        }

        return null;
      },
    },
    eventRepository: {
      async countEvents() {
        return 1;
      },
      async findPublicEventById() {
        return event;
      },
      async findEventByIdAndOrganization() {
        return event;
      },
      async findEvents() {
        return [event];
      },
    },
    ticketTypeRepository: {
      async createTicketType(data) {
        return { _id: ids.ticketType, soldQuantity: 0, ...data };
      },
      async findTicketTypes() {
        return [ticketType];
      },
      async countTicketTypes() {
        return 1;
      },
      async findTicketTypeByIdAndEvent() {
        return ticketType;
      },
      async reserveTicketInventory(ticketTypeId, eventId, organizationId, quantity) {
        if (quantity > 8) {
          return null;
        }

        ticketType.soldQuantity += quantity;
        return ticketType;
      },
      async releaseTicketInventory(ticketTypeId, quantity) {
        ticketType.soldQuantity -= quantity;
        return ticketType;
      },
      async updateTicketTypeByIdAndEvent(ticketTypeId, eventId, organizationId, data) {
        Object.assign(ticketType, data);
        return ticketType;
      },
    },
    orderRepository: {
      async createOrder(data) {
        order = { _id: ids.order, ...data };
        return order;
      },
      async findOrderByCustomerAndIdempotencyKey() {
        return null;
      },
      async findOrderByPaymentReference(reference) {
        return reference === order.paymentReference ? order : null;
      },
      async findOrderByReference(reference) {
        return reference === order.reference ? order : null;
      },
      async updateOrderByReference(reference, data) {
        if (reference !== order.reference) {
          return null;
        }

        order = { ...order, ...data };
        return order;
      },
      async updateOrderByPaymentReferenceAndStatus(reference, statuses, data) {
        if (reference !== order.paymentReference || !statuses.includes(order.paymentStatus)) {
          return null;
        }

        order = { ...order, ...data };
        return order;
      },
      async reserveOrderRefund(reference, amount) {
        const available = Number(order.total || 0) - Number(order.refundedAmount || 0) - Number(order.refundReservedAmount || 0);
        if (reference !== order.reference || ![PAYMENT_STATUS.PAID, PAYMENT_STATUS.PARTIALLY_REFUNDED].includes(order.paymentStatus) || amount > available) return null;
        order.refundReservedAmount = Number(order.refundReservedAmount || 0) + amount;
        return order;
      },
      async settleOrderRefund(reference, amount) {
        if (reference !== order.reference || Number(order.refundReservedAmount || 0) < amount) return null;
        order.refundReservedAmount -= amount;
        order.refundedAmount = Number(order.refundedAmount || 0) + amount;
        return order;
      },
      async releaseOrderRefund(reference, amount) {
        if (reference !== order.reference || Number(order.refundReservedAmount || 0) < amount) return null;
        order.refundReservedAmount -= amount;
        return order;
      },
      async findOrders() {
        return [order];
      },
      async countOrders() {
        return 1;
      },
      async getOrganizationFinancialAggregation() {
        return { grossSales: 5000, refundedAmount: 500, paidOrders: 1 };
      },
    },
    ticketRepository: {
      async findTickets(filter = {}) {
        if (filter.order) {
          return tickets.filter((ticket) => String(ticket.order) === String(filter.order));
        }

        return tickets;
      },
      async countTickets() {
        return tickets.length;
      },
      async findCustomerHistoryTickets(customerId, options = {}) {
        const historyTickets = tickets.filter((ticket) => {
          const historyStatus = ticket.checkedInAt
            ? "ATTENDED"
            : ticket.status === TICKET_STATUS.REFUNDED
              ? "REFUNDED"
              : ticket.status === TICKET_STATUS.CANCELED
                ? "CANCELED"
                : null;

          return historyStatus && (!options.historyStatus || options.historyStatus === historyStatus);
        });

        return { tickets: historyTickets, totalItems: historyTickets.length };
      },
      async createTickets(rows) {
        tickets = rows.map((row, index) => ({ _id: `${ids.ticket}${index}`, ...row }));
        return tickets;
      },
      async findTicketByReference(reference) {
        return hydrateTicket(tickets.find((ticket) => ticket.reference === reference));
      },
      async findTicketByTokenHash(tokenHash) {
        return hydrateTicket(tickets.find((ticket) => ticket.tokenHash === tokenHash));
      },
      async markTicketUsed(ticketId, actorUserId) {
        const ticket = tickets.find((item) => String(item._id) === String(ticketId));
        if (!ticket || ticket.status !== TICKET_STATUS.VALID || ticket.checkedInAt) {
          return null;
        }

        ticket.status = TICKET_STATUS.USED;
        ticket.checkedInAt = new Date();
        ticket.checkedInBy = actorUserId;
        return hydrateTicket(ticket);
      },
      async revertTicketCheckIn(ticketId, actorUserId, checkedInAt) {
        const ticket = tickets.find((item) => String(item._id) === String(ticketId));
        if (ticket?.checkedInBy === actorUserId && ticket?.checkedInAt === checkedInAt) {
          ticket.status = TICKET_STATUS.VALID;
          ticket.checkedInAt = null;
          ticket.checkedInBy = null;
        }

        return ticket;
      },
      async markTicketsByOrder() {
        return { modifiedCount: 0 };
      },
    },
    eventManagerAssignmentRepository: {
      async findActiveEventManagerAssignment() {
        return { event, user: ids.manager };
      },
    },
    eventAttendanceRepository: {
      records: [],
      async findAttendanceByEventAndEmail(eventId, email) {
        return this.records.find((record) => record.event === eventId && record.attendeeEmail === email) || null;
      },
      async findAttendanceByTicket(ticketId) {
        return this.records.find((record) => String(record.ticket) === String(ticketId)) || null;
      },
      async createEventAttendance(data) {
        const attendance = { _id: `att_${this.records.length}`, ...data };
        this.records.push(attendance);
        return attendance;
      },
      async countAttendanceByEvent() {
        return this.records.length;
      },
    },
    refundRepository: {
      async createRefund(data) {
        const refund = { _id: "64b64b64b64b64b64b64b649", ...data };
        refunds.push(refund);
        return refund;
      },
      async updateRefundByReference(reference, data) {
        const refund = refunds.find((item) => item.reference === reference);
        if (!refund) return null;
        Object.assign(refund, data);
        return refund;
      },
      async findRefundByOrderAndIdempotencyKey(orderId, idempotencyKey) {
        return refunds.find((item) => item.order === orderId && item.idempotencyKey === idempotencyKey) || null;
      },
    },
    withdrawalRepository: {
      async findWithdrawals() {
        return [
          {
            _id: "64b64b64b64b64b64b64b650",
            reference: "wd_test",
            organization: ids.organization,
            requestedBy: ids.admin,
            amount: 1000,
            status: "PENDING",
            createdAt: new Date(),
          },
        ];
      },
      async countWithdrawals() {
        return 1;
      },
      async createWithdrawal(data) {
        return { _id: "64b64b64b64b64b64b64b650", ...data };
      },
      async sumWithdrawals() {
        return 1000;
      },
      async findWithdrawalById() {
        return null;
      },
      async updateWithdrawalById(withdrawalId, data) {
        return {
          _id: withdrawalId,
          reference: "wd_test",
          organization: ids.organization,
          requestedBy: ids.admin,
          amount: 1000,
          ...data,
        };
      },
    },
    paymentEventRepository: {
      async createPaymentEvent(data) {
        return data;
      },
    },
    paystackService: {
      async initializeTransaction({ reference }) {
        return {
          configured: true,
          status: true,
          data: {
            authorization_url: "https://checkout.paystack.test",
            access_code: "access_code",
            reference,
          },
        };
      },
      async verifyTransaction() {
        return {
          configured: true,
          status: true,
          data: {
            status: "success",
            reference: order.paymentReference,
            amount: Math.round(order.total * 100),
            currency: order.currency,
          },
        };
      },
      verifyWebhookSignature() {
        return true;
      },
      async createRefund() {
        return {
          configured: true,
          status: true,
          data: {
            reference: "provider_refund",
          },
        };
      },
      async initiateTransfer() {
        return {
          configured: true,
          status: true,
          data: {
            reference: "provider_transfer",
          },
        };
      },
    },
    notificationService: {
      async sendPaymentSuccessNotification() {
        return { queued: false };
      },
      async sendTicketIssuedNotification() {
        return { queued: false };
      },
      async sendRefundStatusNotification() {
        return { queued: false };
      },
    },
    ...overrides,
  };

  return { dependencies, state: { event, ticketType, get order() { return order; }, get tickets() { return tickets; } } };
}

test("ticketing validators enforce ticket, checkout, refund, withdrawal, and validation payloads", () => {
  assert.equal(ticketTypeCreateSchema.safeParse({ name: "VIP", price: 1000, quantity: 20 }).success, true);
  assert.equal(ticketTypeCreateSchema.safeParse({ name: "VIP", price: -1, quantity: 20 }).success, false);
  assert.equal(
    checkoutSchema.safeParse({
      eventId: ids.event,
      customerInfo: { name: "Ada", phone: "+2348012345678", email: "ada@example.com" },
      items: [{ ticketTypeId: ids.ticketType, quantity: 1 }],
    }).success,
    true
  );
  assert.equal(ticketValidationSchema.safeParse({}).success, false);
  assert.equal(ticketValidationSchema.safeParse({ reference: "tkt_123" }).success, true);
  assert.equal(ticketValidationSchema.safeParse({ token: "short" }).success, false);
  assert.equal(ticketValidationSchema.safeParse({ reference: "tkt_123", token: "a".repeat(32) }).success, false);
  assert.equal(ticketTypeCreateSchema.safeParse({ name: "USD", price: 1000, quantity: 20, currency: "USD" }).success, false);
  assert.equal(refundCreateSchema.safeParse({ reason: "Event canceled" }).success, true);
  assert.equal(withdrawalCreateSchema.safeParse({ amount: 1000 }).success, true);
});

test("checkout creates server-priced orders and reserves ticket inventory", async () => {
  let initializationPayload;
  const { dependencies, state } = createDependencies({
    paystackService: {
      async initializeTransaction(payload) {
        initializationPayload = payload;
        return {
          configured: true,
          status: true,
          data: { authorization_url: "https://checkout.paystack.test", access_code: "access_code", reference: payload.reference },
        };
      },
    },
  });
  const result = await ticketingService.createCheckoutOrder(
    ids.customer,
    {
      eventId: ids.event,
      customerInfo: { name: "Ada Buyer", phone: "+2348012345678", email: "ada@example.com" },
      items: [{ ticketTypeId: ids.ticketType, quantity: 2 }],
      idempotencyKey: "checkout-key-1",
    },
    dependencies
  );

  assert.equal(result.error, undefined);
  assert.equal(result.order.total, 5000);
  assert.equal(result.order.items[0].unitPrice, 2500);
  assert.equal(result.payment.authorizationUrl, "https://checkout.paystack.test");
  assert.equal(initializationPayload.currency, "NGN");
  assert.equal(initializationPayload.callbackUrl, buildPaymentCallbackUrl());
  assert.equal(state.ticketType.soldQuantity, 4);
});

test("checkout rejects unavailable inventory without trusting client totals", async () => {
  const { dependencies } = createDependencies();
  const result = await ticketingService.createCheckoutOrder(
    ids.customer,
    {
      eventId: ids.event,
      customerInfo: { name: "Ada Buyer", phone: "+2348012345678", email: "ada@example.com" },
      items: [{ ticketTypeId: ids.ticketType, quantity: 9 }],
    },
    dependencies
  );

  assert.equal(result.statusCode, 409);
  assert.match(result.error, /unavailable|sold out/i);
});

test("checkout rejects a legacy unsupported currency before provider initialization", async () => {
  let initializationCalls = 0;
  const { dependencies, state } = createDependencies({
    paystackService: {
      async initializeTransaction() {
        initializationCalls += 1;
        return { configured: true, status: true, data: {} };
      },
    },
  });
  state.ticketType.currency = "USD";

  const result = await ticketingService.createCheckoutOrder(
    ids.customer,
    {
      eventId: ids.event,
      customerInfo: { name: "Ada Buyer", phone: "+2348012345678", email: "ada@example.com" },
      items: [{ ticketTypeId: ids.ticketType, quantity: 1 }],
      idempotencyKey: "checkout-unsupported-currency",
    },
    dependencies
  );

  assert.equal(result.statusCode, 400);
  assert.match(result.error, /unsupported payment currency/i);
  assert.equal(initializationCalls, 0);
  assert.equal(state.ticketType.soldQuantity, 2);
});

test("checkout returns a provider error and releases inventory when Paystack initialization fails", async () => {
  const { dependencies, state } = createDependencies({
    paystackService: {
      async initializeTransaction() {
        return { configured: true, status: false, message: "provider unavailable", data: null };
      },
    },
  });

  const result = await ticketingService.createCheckoutOrder(
    ids.customer,
    {
      eventId: ids.event,
      customerInfo: { name: "Ada Buyer", phone: "+2348012345678", email: "ada@example.com" },
      items: [{ ticketTypeId: ids.ticketType, quantity: 2 }],
      idempotencyKey: "checkout-provider-failure",
    },
    dependencies
  );

  assert.equal(result.statusCode, 502);
  assert.equal(state.order.paymentStatus, PAYMENT_STATUS.FAILED);
  assert.equal(state.ticketType.soldQuantity, 2);
});

test("checkout fails closed when the Paystack authorization state cannot be persisted", async () => {
  const { dependencies, state } = createDependencies();
  const updateOrderByReference = dependencies.orderRepository.updateOrderByReference;
  dependencies.orderRepository.updateOrderByReference = async (reference, data) => {
    if (data.paymentStatus === PAYMENT_STATUS.INITIALIZED) {
      throw new Error("database write failed");
    }

    return updateOrderByReference(reference, data);
  };

  const result = await ticketingService.createCheckoutOrder(
    ids.customer,
    {
      eventId: ids.event,
      customerInfo: { name: "Ada Buyer", phone: "+2348012345678", email: "ada@example.com" },
      items: [{ ticketTypeId: ids.ticketType, quantity: 2 }],
      idempotencyKey: "checkout-persistence-failure",
    },
    dependencies
  );

  assert.equal(result.statusCode, 500);
  assert.equal(state.order.paymentStatus, PAYMENT_STATUS.FAILED);
  assert.equal(state.ticketType.soldQuantity, 2);
});

test("checkout validation rejects duplicate lines and attendee count mismatches", () => {
  const customerInfo = { name: "Ada Buyer", phone: "+2348012345678", email: "ada@example.com" };
  const duplicateLines = checkoutSchema.safeParse({
    eventId: ids.event,
    customerInfo,
    items: [
      { ticketTypeId: ids.ticketType, quantity: 1 },
      { ticketTypeId: ids.ticketType, quantity: 1 },
    ],
  });
  const attendeeMismatch = checkoutSchema.safeParse({
    eventId: ids.event,
    customerInfo,
    items: [{ ticketTypeId: ids.ticketType, quantity: 2, attendees: [customerInfo] }],
  });

  assert.equal(duplicateLines.success, false);
  assert.equal(attendeeMismatch.success, false);
});

test("zero-total checkout issues tickets without calling Paystack", async () => {
  let initializationCalls = 0;
  const { dependencies, state } = createDependencies();
  state.ticketType.price = 0;
  dependencies.paystackService.initializeTransaction = async () => {
    initializationCalls += 1;
    throw new Error("Paystack should not be called for free orders");
  };

  const checkout = await ticketingService.createCheckoutOrder(
    ids.customer,
    {
      eventId: ids.event,
      customerInfo: { name: "Ada Buyer", phone: "+2348012345678", email: "ada@example.com" },
      items: [{ ticketTypeId: ids.ticketType, quantity: 1 }],
      idempotencyKey: "checkout-free-order",
    },
    dependencies
  );
  const verification = await ticketingService.verifyPayment(
    ids.customer,
    checkout.payment.reference,
    dependencies
  );

  assert.equal(initializationCalls, 0);
  assert.equal(checkout.payment.free, true);
  assert.equal(checkout.order.paymentStatus, PAYMENT_STATUS.PAID);
  assert.equal(verification.reused, true);
  assert.equal(state.tickets.length, 1);
});

test("payment verification marks an order paid and creates individual tickets once", async () => {
  const { dependencies, state } = createDependencies();
  const first = await ticketingService.verifyPayment(ids.customer, "pay_test", dependencies);
  const second = await ticketingService.verifyPayment(ids.customer, "pay_test", dependencies);

  assert.equal(first.error, undefined);
  assert.equal(first.order.paymentStatus, PAYMENT_STATUS.PAID);
  assert.equal(first.tickets.length, 2);
  assert.equal(second.reused, true);
  assert.equal(state.tickets.length, 2);
  assert.ok(first.tickets[0].qrToken);
});

test("payment verification enforces customer ownership and authoritative provider totals", async () => {
  let providerCalls = 0;
  const wrongCustomer = createDependencies({
    paystackService: {
      async verifyTransaction() {
        providerCalls += 1;
        return { configured: true, status: true, data: { status: "success" } };
      },
    },
  });
  const denied = await ticketingService.verifyPayment(ids.manager, "pay_test", wrongCustomer.dependencies);

  const amountMismatch = createDependencies({
    paystackService: {
      async verifyTransaction() {
        return {
          configured: true,
          status: true,
          data: { status: "success", reference: "pay_test", amount: 499999, currency: "NGN" },
        };
      },
    },
  });
  const rejected = await ticketingService.verifyPayment(ids.customer, "pay_test", amountMismatch.dependencies);

  assert.equal(denied.statusCode, 404);
  assert.equal(providerCalls, 0);
  assert.equal(rejected.statusCode, 400);
  assert.match(rejected.error, /amount/i);
  assert.equal(amountMismatch.state.order.paymentStatus, PAYMENT_STATUS.PENDING);
  assert.equal(amountMismatch.state.tickets.length, 0);
});

test("definitively failed payment verification releases inventory only once", async () => {
  const { dependencies, state } = createDependencies({
    paystackService: {
      async verifyTransaction() {
        return { configured: true, status: true, data: { status: "failed", reference: "pay_test" } };
      },
    },
  });

  const first = await ticketingService.verifyPayment(ids.customer, "pay_test", dependencies);
  const second = await ticketingService.verifyPayment(ids.customer, "pay_test", dependencies);

  assert.equal(first.verified, false);
  assert.equal(second.verified, false);
  assert.equal(state.ticketType.soldQuantity, 0);
});

test("non-final payment verification remains pending and can later complete", async () => {
  let providerStatus = "pending";
  const { dependencies, state } = createDependencies({
    paystackService: {
      async verifyTransaction() {
        return {
          configured: true,
          status: true,
          data: {
            status: providerStatus,
            reference: "pay_test",
            amount: 500000,
            currency: "NGN",
          },
        };
      },
    },
  });

  const pending = await ticketingService.verifyPayment(ids.customer, "pay_test", dependencies);
  assert.equal(pending.pending, true);
  assert.equal(state.order.paymentStatus, PAYMENT_STATUS.PENDING);
  assert.equal(state.ticketType.soldQuantity, 2);
  assert.equal(state.tickets.length, 0);

  providerStatus = "success";
  const completed = await ticketingService.verifyPayment(ids.customer, "pay_test", dependencies);
  assert.equal(completed.order.paymentStatus, PAYMENT_STATUS.PAID);
  assert.equal(state.tickets.length, 2);
});

test("manager ticket check-in validates event scope and records attendance once", async () => {
  const { dependencies, state } = createDependencies();
  await ticketingService.verifyPayment(ids.customer, "pay_test", dependencies);

  const ticket = state.tickets[0];
  const checkedIn = await ticketingService.checkInEventTicket(
    ids.organization,
    ids.manager,
    ids.event,
    { reference: ticket.reference },
    dependencies
  );
  const duplicate = await ticketingService.checkInEventTicket(
    ids.organization,
    ids.manager,
    ids.event,
    { reference: ticket.reference },
    dependencies
  );

  assert.equal(checkedIn.checkedIn, true);
  assert.equal(checkedIn.attendance.email, ticket.attendee.email);
  assert.equal(duplicate.valid, false);
  assert.match(duplicate.reason, /already/i);
  assert.equal(dependencies.eventAttendanceRepository.records.length, 1);
});

test("Phase 5 ticket validation returns stable outcomes without exposing QR secrets", async () => {
  const { dependencies, state } = createDependencies();
  await ticketingService.verifyPayment(ids.customer, "pay_test", dependencies);
  const ticket = state.tickets[0];

  const validReference = await ticketingService.validateEventTicket(
    ids.organization,
    ids.manager,
    ids.event,
    { reference: ticket.reference },
    dependencies
  );
  const validToken = await ticketingService.validateEventTicket(
    ids.organization,
    ids.manager,
    ids.event,
    { token: ticket.qrToken },
    dependencies
  );
  const missing = await ticketingService.validateEventTicket(
    ids.organization,
    ids.manager,
    ids.event,
    { reference: "tkt_missing" },
    dependencies
  );
  const wrongEvent = await ticketingService.validateEventTicket(
    ids.organization,
    ids.manager,
    "64b64b64b64b64b64b64b699",
    { reference: ticket.reference },
    dependencies
  );

  assert.equal(validReference.outcome, TICKET_VALIDATION_OUTCOME.VALID);
  assert.equal(validToken.outcome, TICKET_VALIDATION_OUTCOME.VALID);
  assert.equal(validReference.ticket.qrToken, undefined);
  assert.equal(validReference.ticket.qrCodeDataUrl, undefined);
  assert.equal(missing.outcome, TICKET_VALIDATION_OUTCOME.INVALID_TICKET);
  assert.equal(wrongEvent.outcome, TICKET_VALIDATION_OUTCOME.WRONG_EVENT);
  assert.equal(wrongEvent.ticket, undefined);
});

test("Phase 5 ticket validation rejects invalid ticket, order, type, and event states", async () => {
  const cases = [
    {
      expected: TICKET_VALIDATION_OUTCOME.CANCELED_TICKET,
      mutate(state) { state.tickets[0].status = TICKET_STATUS.CANCELED; },
    },
    {
      expected: TICKET_VALIDATION_OUTCOME.REFUNDED_TICKET,
      mutate(state) { state.tickets[0].status = TICKET_STATUS.REFUNDED; },
    },
    {
      expected: TICKET_VALIDATION_OUTCOME.ALREADY_CHECKED_IN,
      mutate(state) {
        state.tickets[0].status = TICKET_STATUS.USED;
        state.tickets[0].checkedInAt = new Date();
      },
    },
    {
      expected: TICKET_VALIDATION_OUTCOME.INACTIVE_TICKET,
      mutate(state) { state.ticketType.status = "INACTIVE"; },
    },
    {
      expected: TICKET_VALIDATION_OUTCOME.ORDER_NOT_PAID,
      mutate(state) {
        state.order.orderStatus = ORDER_STATUS.PENDING;
        state.order.paymentStatus = PAYMENT_STATUS.PENDING;
      },
    },
    {
      expected: TICKET_VALIDATION_OUTCOME.EVENT_NOT_CHECKIN_ELIGIBLE,
      mutate(state) { state.event.status = EVENT_STATUS.CANCELED; },
    },
  ];

  for (const validationCase of cases) {
    const { dependencies, state } = createDependencies();
    await ticketingService.verifyPayment(ids.customer, "pay_test", dependencies);
    validationCase.mutate(state);
    const result = await ticketingService.validateEventTicket(
      ids.organization,
      ids.manager,
      ids.event,
      { reference: state.tickets[0].reference },
      dependencies
    );

    assert.equal(result.valid, false);
    assert.equal(result.outcome, validationCase.expected);
  }
});

test("Phase 5 check-in enforces manager assignment, organization scope, and admin access", async () => {
  const unassigned = createDependencies();
  await ticketingService.verifyPayment(ids.customer, "pay_test", unassigned.dependencies);
  unassigned.dependencies.eventManagerAssignmentRepository.findActiveEventManagerAssignment = async () => null;
  const unassignedResult = await ticketingService.validateEventTicket(
    ids.organization,
    ids.manager,
    ids.event,
    { reference: unassigned.state.tickets[0].reference },
    unassigned.dependencies
  );

  const crossOrganization = await ticketingService.validateEventTicket(
    "64b64b64b64b64b64b64b698",
    ids.manager,
    ids.event,
    { reference: unassigned.state.tickets[0].reference },
    unassigned.dependencies
  );
  const unauthorized = await ticketingService.validateEventTicket(
    ids.organization,
    ids.customer,
    ids.event,
    { reference: unassigned.state.tickets[0].reference },
    unassigned.dependencies
  );
  const adminResult = await ticketingService.validateEventTicket(
    ids.organization,
    ids.admin,
    ids.event,
    { reference: unassigned.state.tickets[0].reference },
    unassigned.dependencies
  );

  assert.equal(unassignedResult.outcome, TICKET_VALIDATION_OUTCOME.MANAGER_NOT_ASSIGNED);
  assert.equal(crossOrganization.outcome, TICKET_VALIDATION_OUTCOME.ORGANIZATION_MISMATCH);
  assert.equal(unauthorized.outcome, TICKET_VALIDATION_OUTCOME.UNAUTHORIZED);
  assert.equal(adminResult.outcome, TICKET_VALIDATION_OUTCOME.VALID);
});

test("concurrent scans produce exactly one check-in and one attendance record", async () => {
  const { dependencies, state } = createDependencies();
  await ticketingService.verifyPayment(ids.customer, "pay_test", dependencies);
  const payload = { reference: state.tickets[0].reference };

  const results = await Promise.all([
    ticketingService.checkInEventTicket(ids.organization, ids.manager, ids.event, payload, dependencies),
    ticketingService.checkInEventTicket(ids.organization, ids.manager, ids.event, payload, dependencies),
  ]);

  assert.equal(results.filter((result) => result.checkedIn).length, 1);
  assert.equal(
    results.filter((result) => result.outcome === TICKET_VALIDATION_OUTCOME.ALREADY_CHECKED_IN).length,
    1
  );
  assert.equal(dependencies.eventAttendanceRepository.records.length, 1);
  assert.equal(state.tickets[0].status, TICKET_STATUS.USED);
  assert.equal(dependencies.eventAttendanceRepository.records[0].ticket, state.tickets[0]._id);
  assert.equal(dependencies.eventAttendanceRepository.records[0].order, ids.order);
  assert.equal(dependencies.eventAttendanceRepository.records[0].organization, ids.organization);
  assert.equal(dependencies.eventAttendanceRepository.records[0].customer, ids.customer);
  assert.equal(dependencies.eventAttendanceRepository.records[0].checkedInBy, ids.manager);
  assert.ok(dependencies.eventAttendanceRepository.records[0].checkedInAt);
});

test("multiple tickets with the same attendee email check in independently", async () => {
  const { dependencies, state } = createDependencies();
  await ticketingService.verifyPayment(ids.customer, "pay_test", dependencies);
  state.tickets[0].attendee.email = "shared@example.com";
  state.tickets[1].attendee.email = "shared@example.com";

  const first = await ticketingService.checkInEventTicket(
    ids.organization,
    ids.manager,
    ids.event,
    { reference: state.tickets[0].reference },
    dependencies
  );
  const second = await ticketingService.checkInEventTicket(
    ids.organization,
    ids.manager,
    ids.event,
    { reference: state.tickets[1].reference },
    dependencies
  );

  assert.equal(first.checkedIn, true);
  assert.equal(second.checkedIn, true);
  assert.equal(dependencies.eventAttendanceRepository.records.length, 2);
  assert.notEqual(
    dependencies.eventAttendanceRepository.records[0].ticket,
    dependencies.eventAttendanceRepository.records[1].ticket
  );
});

test("failed attendance persistence rolls back a standalone ticket update", async () => {
  const { dependencies, state } = createDependencies();
  await ticketingService.verifyPayment(ids.customer, "pay_test", dependencies);
  dependencies.eventAttendanceRepository.createEventAttendance = async () => {
    throw new Error("attendance write failed");
  };

  const result = await ticketingService.checkInEventTicket(
    ids.organization,
    ids.manager,
    ids.event,
    { reference: state.tickets[0].reference },
    dependencies
  );

  assert.equal(result.statusCode, 500);
  assert.equal(state.tickets[0].status, TICKET_STATUS.VALID);
  assert.equal(state.tickets[0].checkedInAt, null);
  assert.equal(dependencies.eventAttendanceRepository.records.length, 0);
});

test("customer history only marks actual checked-in tickets as attended", async () => {
  const { dependencies, state } = createDependencies();
  await ticketingService.verifyPayment(ids.customer, "pay_test", dependencies);

  await ticketingService.checkInEventTicket(
    ids.organization,
    ids.manager,
    ids.event,
    { reference: state.tickets[0].reference },
    dependencies
  );

  const result = await ticketingService.getCustomerHistory(ids.customer, {}, dependencies);

  assert.equal(result.history.length, 1);
  assert.equal(result.history[0].historyStatus, "ATTENDED");
  assert.ok(result.history[0].checkedInAt);
  assert.equal(result.pagination.totalItems, 1);
});

test("refunds preserve orders and reject excessive amounts", async () => {
  const { dependencies } = createDependencies();
  await ticketingService.verifyPayment(ids.customer, "pay_test", dependencies);
  const valid = await ticketingService.createOrderRefund(
    ids.organization,
    ids.admin,
    "ord_test",
    { amount: 1000, reason: "Event canceled" },
    dependencies
  );
  const excessive = await ticketingService.createOrderRefund(
    ids.organization,
    ids.admin,
    "ord_test",
    { amount: 9000, reason: "Too much" },
    dependencies
  );

  assert.equal(valid.refund.amount, 1000);
  assert.equal(valid.refund.status, "SUCCEEDED");
  assert.equal(excessive.statusCode, 400);
});

test("refund idempotency prevents duplicate provider requests", async () => {
  let providerCalls = 0;
  const { dependencies } = createDependencies();
  const originalCreateRefund = dependencies.paystackService.createRefund;
  dependencies.paystackService.createRefund = async (...args) => {
    providerCalls += 1;
    return originalCreateRefund(...args);
  };
  await ticketingService.verifyPayment(ids.customer, "pay_test", dependencies);

  const payload = { amount: 1000, reason: "Event canceled", idempotencyKey: "refund-same-request" };
  const first = await ticketingService.createOrderRefund(ids.organization, ids.admin, "ord_test", payload, dependencies);
  const second = await ticketingService.createOrderRefund(ids.organization, ids.admin, "ord_test", payload, dependencies);

  assert.equal(first.refund.status, "SUCCEEDED");
  assert.equal(second.reused, true);
  assert.equal(providerCalls, 1);
});

test("concurrent refunds cannot reserve more than the order balance", async () => {
  const { dependencies, state } = createDependencies();
  await ticketingService.verifyPayment(ids.customer, "pay_test", dependencies);

  const results = await Promise.all([
    ticketingService.createOrderRefund(
      ids.organization,
      ids.admin,
      "ord_test",
      { amount: 3000, reason: "Partial refund one", idempotencyKey: "refund-concurrent-one" },
      dependencies
    ),
    ticketingService.createOrderRefund(
      ids.organization,
      ids.admin,
      "ord_test",
      { amount: 3000, reason: "Partial refund two", idempotencyKey: "refund-concurrent-two" },
      dependencies
    ),
  ]);

  assert.equal(results.filter((result) => result.refund?.status === "SUCCEEDED").length, 1);
  assert.equal(results.filter((result) => [400, 409].includes(result.statusCode)).length, 1);
  assert.equal(state.order.refundedAmount, 3000);
});

test("withdrawals are limited by backend-calculated available balance", async () => {
  const { dependencies } = createDependencies();
  const valid = await ticketingService.requestWithdrawal(
    ids.organization,
    ids.admin,
    { amount: 1000 },
    dependencies
  );
  const excessive = await ticketingService.requestWithdrawal(
    ids.organization,
    ids.admin,
    { amount: 10000 },
    dependencies
  );

  assert.equal(valid.withdrawal.amount, 1000);
  assert.equal(excessive.statusCode, 400);
});

test("withdrawal balance and history are returned from backend financial data", async () => {
  const { dependencies } = createDependencies();
  const balance = await ticketingService.getOrganizationWithdrawalBalance(ids.organization, ids.admin, dependencies);
  const history = await ticketingService.getOrganizationWithdrawals(ids.organization, ids.admin, {}, dependencies);
  const platform = await ticketingService.getPlatformWithdrawals({ status: "PENDING" }, dependencies);

  assert.equal(balance.availableBalance, 3500);
  assert.equal(history.withdrawals.length, 1);
  assert.equal(history.balance.availableBalance, 3500);
  assert.equal(platform.withdrawals.length, 1);
});

test("withdrawal approval can record a Paystack transfer result", async () => {
  const { dependencies } = createDependencies({
    withdrawalRepository: {
      async findWithdrawalById() {
        return {
          _id: "64b64b64b64b64b64b64b650",
          reference: "wd_test",
          organization: ids.organization,
          requestedBy: ids.admin,
          amount: 1000,
          status: "PENDING",
        };
      },
      async updateWithdrawalById(withdrawalId, data) {
        return {
          _id: withdrawalId,
          reference: "wd_test",
          organization: ids.organization,
          requestedBy: ids.admin,
          amount: 1000,
          ...data,
        };
      },
    },
  });

  const result = await ticketingService.reviewWithdrawal(
    "64b64b64b64b64b64b64b650",
    ids.admin,
    "approve",
    { recipientCode: "RCP_test" },
    dependencies
  );

  assert.equal(result.withdrawal.status, "PAID");
  assert.equal(result.withdrawal.transferReference, "provider_transfer");
});

test("Paystack webhook processing is idempotent for duplicate provider events", async () => {
  let eventCount = 0;
  const { dependencies } = createDependencies({
    paymentEventRepository: {
      async createPaymentEvent(data) {
        eventCount += 1;

        if (eventCount > 1) {
          const error = new Error("duplicate");
          error.code = 11000;
          throw error;
        }

        return data;
      },
    },
  });
  const payload = {
    event: "charge.success",
    data: {
      reference: "pay_test",
      status: "success",
      amount: 500000,
      currency: "NGN",
    },
  };

  const first = await ticketingService.handlePaystackWebhook(Buffer.from("{}"), "sig", payload, dependencies);
  const second = await ticketingService.handlePaystackWebhook(Buffer.from("{}"), "sig", payload, dependencies);

  assert.equal(first.order.paymentStatus, PAYMENT_STATUS.PAID);
  assert.equal(second.duplicate, true);
  assert.equal(eventCount, 2);
});

test("failed charge webhook processing can be claimed and retried safely", async () => {
  let eventCreated = false;
  let updateAttempts = 0;
  let retryClaims = 0;
  let failedEvents = 0;
  let processedEvents = 0;
  const { dependencies } = createDependencies();
  const updateOrder = dependencies.orderRepository.updateOrderByPaymentReferenceAndStatus;
  dependencies.orderRepository.updateOrderByPaymentReferenceAndStatus = async (...args) => {
    updateAttempts += 1;
    if (updateAttempts === 1) throw new Error("temporary database failure");
    return updateOrder(...args);
  };
  dependencies.paymentEventRepository = {
    async createPaymentEvent(data) {
      if (eventCreated) {
        const error = new Error("duplicate");
        error.code = 11000;
        throw error;
      }
      eventCreated = true;
      return data;
    },
    async claimPaymentEventRetry() {
      retryClaims += 1;
      return { status: "PROCESSING" };
    },
    async markPaymentEventFailed() {
      failedEvents += 1;
    },
    async markPaymentEventProcessed() {
      processedEvents += 1;
    },
  };
  const payload = {
    event: "charge.success",
    data: { reference: "pay_test", status: "success", amount: 500000, currency: "NGN" },
  };

  await assert.rejects(
    ticketingService.handlePaystackWebhook(Buffer.from("{}"), "sig", payload, dependencies),
    /temporary database failure/
  );
  const retried = await ticketingService.handlePaystackWebhook(Buffer.from("{}"), "sig", payload, dependencies);

  assert.equal(retried.retried, true);
  assert.equal(retried.order.paymentStatus, PAYMENT_STATUS.PAID);
  assert.equal(retryClaims, 1);
  assert.equal(failedEvents, 1);
  assert.equal(processedEvents, 1);
});
