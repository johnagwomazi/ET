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
} from "../src/constants/ticketing.constants.js";
import { EVENT_STATUS } from "../src/constants/eventStatus.constants.js";
import { USER_ROLES } from "../src/constants/roles.constants.js";
import * as ticketingService from "../src/services/ticketing.service.js";

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
      async createTickets(rows) {
        tickets = rows.map((row, index) => ({ _id: `${ids.ticket}${index}`, ...row }));
        return tickets;
      },
      async findTicketByReference(reference) {
        return tickets.find((ticket) => ticket.reference === reference) || null;
      },
      async findTicketByTokenHash(tokenHash) {
        return tickets.find((ticket) => ticket.tokenHash === tokenHash) || null;
      },
      async markTicketUsed(ticketId, actorUserId) {
        const ticket = tickets.find((item) => String(item._id) === String(ticketId));
        if (!ticket || ticket.status !== TICKET_STATUS.VALID || ticket.checkedInAt) {
          return null;
        }

        ticket.status = TICKET_STATUS.USED;
        ticket.checkedInAt = new Date();
        ticket.checkedInBy = actorUserId;
        return ticket;
      },
      async markTicketsByOrder() {
        return { modifiedCount: 0 };
      },
    },
    eventManagerAssignmentRepository: {
      async findActiveEventManagerAssignment() {
        return { event: ids.event, user: ids.manager };
      },
    },
    eventAttendanceRepository: {
      records: [],
      async findAttendanceByEventAndEmail(eventId, email) {
        return this.records.find((record) => record.event === eventId && record.attendeeEmail === email) || null;
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
        return { _id: "64b64b64b64b64b64b64b649", ...data };
      },
      async updateRefundByReference(reference, data) {
        return { _id: "64b64b64b64b64b64b64b649", reference, ...data };
      },
    },
    withdrawalRepository: {
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
          status: true,
          data: {
            status: "success",
            reference: order.paymentReference,
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
  assert.equal(refundCreateSchema.safeParse({ reason: "Event canceled" }).success, true);
  assert.equal(withdrawalCreateSchema.safeParse({ amount: 1000 }).success, true);
});

test("checkout creates server-priced orders and reserves ticket inventory", async () => {
  const { dependencies, state } = createDependencies();
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

test("payment verification marks an order paid and creates individual tickets once", async () => {
  const { dependencies, state } = createDependencies();
  const first = await ticketingService.verifyPayment("pay_test", dependencies);
  const second = await ticketingService.verifyPayment("pay_test", dependencies);

  assert.equal(first.error, undefined);
  assert.equal(first.order.paymentStatus, PAYMENT_STATUS.PAID);
  assert.equal(first.tickets.length, 2);
  assert.equal(second.reused, true);
  assert.equal(state.tickets.length, 2);
  assert.ok(first.tickets[0].qrToken);
});

test("manager ticket check-in validates event scope and records attendance once", async () => {
  const { dependencies, state } = createDependencies();
  await ticketingService.verifyPayment("pay_test", dependencies);

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

test("refunds preserve orders and reject excessive amounts", async () => {
  const { dependencies } = createDependencies();
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
    },
  };

  const first = await ticketingService.handlePaystackWebhook(Buffer.from("{}"), "sig", payload, dependencies);
  const second = await ticketingService.handlePaystackWebhook(Buffer.from("{}"), "sig", payload, dependencies);

  assert.equal(first.order.paymentStatus, PAYMENT_STATUS.PAID);
  assert.equal(second.duplicate, true);
  assert.equal(eventCount, 2);
});
