import test from "node:test";
import assert from "node:assert/strict";
import dns from "node:dns";
import mongoose from "mongoose";

import envConfig from "../src/config/env.config.js";
import { EVENT_STATUS } from "../src/constants/eventStatus.constants.js";
import {
  ORDER_STATUS,
  PAYMENT_STATUS,
  TICKET_STATUS,
  WITHDRAWAL_STATUS,
} from "../src/constants/ticketing.constants.js";
import Event from "../src/models/event.model.js";
import Order from "../src/models/order.model.js";
import Organization from "../src/models/organization.model.js";
import PaymentEvent from "../src/models/paymentEvent.model.js";
import Refund from "../src/models/refund.model.js";
import Ticket from "../src/models/ticket.model.js";
import TicketType from "../src/models/ticketType.model.js";
import User from "../src/models/user.model.js";
import Withdrawal from "../src/models/withdrawal.model.js";
import * as authRepository from "../src/repositories/auth.repository.js";
import * as eventRepository from "../src/repositories/event.repository.js";
import * as orderRepository from "../src/repositories/order.repository.js";
import * as organizationRepository from "../src/repositories/organization.repository.js";
import * as paymentEventRepository from "../src/repositories/paymentEvent.repository.js";
import * as refundRepository from "../src/repositories/refund.repository.js";
import * as ticketRepository from "../src/repositories/ticket.repository.js";
import * as ticketTypeRepository from "../src/repositories/ticketType.repository.js";
import * as withdrawalRepository from "../src/repositories/withdrawal.repository.js";
import * as ticketingService from "../src/services/ticketing.service.js";

const databaseName = `evt_pay_test_${process.pid}_${Date.now().toString(36)}`;
const collections = [Event, Order, Organization, PaymentEvent, Refund, Ticket, TicketType, User, Withdrawal];

function ids() {
  return {
    organization: new mongoose.Types.ObjectId(),
    event: new mongoose.Types.ObjectId(),
    user: new mongoose.Types.ObjectId(),
    ticketType: new mongoose.Types.ObjectId(),
  };
}

async function createTicketType(overrides = {}) {
  const values = ids();
  return TicketType.create({
    _id: values.ticketType,
    event: values.event,
    organization: values.organization,
    createdBy: values.user,
    name: `Ticket ${values.ticketType}`,
    price: 2500,
    currency: "NGN",
    quantity: 5,
    soldQuantity: 0,
    maxPerOrder: 5,
    status: "ACTIVE",
    ...overrides,
  });
}

async function createOrder(overrides = {}) {
  const values = ids();
  return Order.create({
    reference: `ord_${new mongoose.Types.ObjectId()}`,
    paymentReference: `pay_${new mongoose.Types.ObjectId()}`,
    customer: values.user,
    organization: values.organization,
    event: values.event,
    items: [{ ticketType: values.ticketType, name: "Regular", quantity: 1, unitPrice: 1000, total: 1000 }],
    subtotal: 1000,
    total: 1000,
    currency: "NGN",
    paymentStatus: PAYMENT_STATUS.PENDING,
    orderStatus: ORDER_STATUS.PENDING,
    customerInfo: { name: "Integration Buyer", email: "buyer@example.com", phone: "+2348012345678" },
    ...overrides,
  });
}

test.before(async () => {
  assert.ok(envConfig.mongoUri, "MONGODB_URI is required for repository integration tests");
  mongoose.set("sanitizeFilter", true);
  if (envConfig.dnsServers.length > 0) dns.setServers(envConfig.dnsServers);
  await mongoose.connect(envConfig.mongoUri, { dbName: databaseName });
  await Promise.all(collections.map((model) => model.createIndexes()));
});

test.beforeEach(async () => {
  await Promise.all(collections.map((model) => model.deleteMany({})));
});

test.after(async () => {
  if (mongoose.connection.readyState === 1) {
    assert.match(mongoose.connection.name, /^evt_pay_test_/);
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
});

test("inventory reservation and release execute atomically with sanitizeFilter enabled", async () => {
  const ticketType = await createTicketType({ quantity: 3 });
  const first = await ticketTypeRepository.reserveTicketInventory(
    ticketType._id,
    ticketType.event,
    ticketType.organization,
    2
  );
  assert.equal(first.soldQuantity, 2);

  const insufficient = await ticketTypeRepository.reserveTicketInventory(
    ticketType._id,
    ticketType.event,
    ticketType.organization,
    2
  );
  assert.equal(insufficient, null);

  const released = await ticketTypeRepository.releaseTicketInventory(ticketType._id, 2);
  assert.equal(released.soldQuantity, 0);
  assert.equal(await ticketTypeRepository.releaseTicketInventory(ticketType._id, 2), null);
  assert.equal((await TicketType.findById(ticketType._id)).soldQuantity, 0);
});

test("concurrent inventory reservations cannot oversell", async () => {
  const ticketType = await createTicketType({ quantity: 3 });
  const reservations = await Promise.all([
    ticketTypeRepository.reserveTicketInventory(ticketType._id, ticketType.event, ticketType.organization, 2),
    ticketTypeRepository.reserveTicketInventory(ticketType._id, ticketType.event, ticketType.organization, 2),
  ]);

  assert.equal(reservations.filter(Boolean).length, 1);
  assert.equal((await TicketType.findById(ticketType._id)).soldQuantity, 2);
});

test("payment and refund transitions retain their conditional guards", async () => {
  const order = await createOrder();
  const paid = await orderRepository.updateOrderByPaymentReferenceAndStatus(
    order.paymentReference,
    [PAYMENT_STATUS.PENDING, PAYMENT_STATUS.INITIALIZED],
    { paymentStatus: PAYMENT_STATUS.PAID, orderStatus: ORDER_STATUS.PAID }
  );
  assert.equal(paid.paymentStatus, PAYMENT_STATUS.PAID);
  assert.equal(
    await orderRepository.updateOrderByPaymentReferenceAndStatus(
      order.paymentReference,
      [PAYMENT_STATUS.PENDING],
      { paymentStatus: PAYMENT_STATUS.PAID }
    ),
    null
  );

  const reserved = await orderRepository.reserveOrderRefund(order.reference, 700);
  assert.equal(reserved.refundReservedAmount, 700);
  assert.equal(await orderRepository.reserveOrderRefund(order.reference, 400), null);
  const settled = await orderRepository.settleOrderRefund(order.reference, 700);
  assert.equal(settled.refundReservedAmount, 0);
  assert.equal(settled.refundedAmount, 700);
  assert.equal(await orderRepository.settleOrderRefund(order.reference, 700), null);
});

test("refund idempotency index and withdrawal status transitions execute against MongoDB", async () => {
  const order = await createOrder({ paymentStatus: PAYMENT_STATUS.PAID, orderStatus: ORDER_STATUS.PAID });
  await Ticket.create([
    {
      reference: "tkt_refund_valid",
      tokenHash: "hash_refund_valid",
      qrToken: "token_refund_valid",
      order: order._id,
      event: order.event,
      organization: order.organization,
      ticketType: order.items[0].ticketType,
      purchaser: order.customer,
      status: TICKET_STATUS.VALID,
    },
    {
      reference: "tkt_refund_used",
      tokenHash: "hash_refund_used",
      qrToken: "token_refund_used",
      order: order._id,
      event: order.event,
      organization: order.organization,
      ticketType: order.items[0].ticketType,
      purchaser: order.customer,
      status: TICKET_STATUS.USED,
      checkedInAt: new Date(),
      checkedInBy: order.customer,
    },
  ]);

  const refundedTickets = await ticketRepository.markTicketsByOrder(order._id, TICKET_STATUS.REFUNDED);
  assert.equal(refundedTickets.modifiedCount, 1);
  assert.equal((await Ticket.findOne({ reference: "tkt_refund_valid" })).status, TICKET_STATUS.REFUNDED);
  assert.equal((await Ticket.findOne({ reference: "tkt_refund_used" })).status, TICKET_STATUS.USED);

  const refundData = {
    reference: "ref_integration_one",
    idempotencyKey: "refund-integration-key",
    order: order._id,
    organization: order.organization,
    event: order.event,
    requestedBy: order.customer,
    amount: 250,
    reason: "Integration refund",
  };
  await refundRepository.createRefund(refundData);
  await assert.rejects(
    refundRepository.createRefund({ ...refundData, reference: "ref_integration_two" }),
    (error) => error?.code === 11000
  );

  const withdrawal = await withdrawalRepository.createWithdrawal({
    reference: "wd_integration",
    organization: order.organization,
    requestedBy: order.customer,
    amount: 500,
    amountMinor: 50000,
    currency: "NGN",
  });
  const claimed = await withdrawalRepository.updateWithdrawalByStatus(
    withdrawal._id,
    [WITHDRAWAL_STATUS.PENDING],
    { status: WITHDRAWAL_STATUS.PROCESSING }
  );
  assert.equal(claimed.status, WITHDRAWAL_STATUS.PROCESSING);
  assert.equal(
    await withdrawalRepository.updateWithdrawalByStatus(
      withdrawal._id,
      [WITHDRAWAL_STATUS.PENDING],
      { status: WITHDRAWAL_STATUS.REJECTED }
    ),
    null
  );
});

test("organization finance locks and payment-event retries remain duplicate-safe", async () => {
  const organization = await Organization.create({
    organizationName: "Integration Organization",
    businessEmail: "finance-integration@example.com",
  });
  const expiresAt = new Date(Date.now() + 60000);
  const locks = await Promise.all([
    organizationRepository.acquireOrganizationFinanceLock(organization._id, "token-one", expiresAt),
    organizationRepository.acquireOrganizationFinanceLock(organization._id, "token-two", expiresAt),
  ]);
  assert.equal(locks.filter(Boolean).length, 1);

  const eventData = {
    provider: "paystack",
    event: "charge.success",
    reference: "pay_event_integration",
    status: "FAILED",
    processingStartedAt: new Date(Date.now() - 300000),
  };
  await paymentEventRepository.createPaymentEvent(eventData);
  await assert.rejects(paymentEventRepository.createPaymentEvent(eventData), (error) => error?.code === 11000);
  const claimed = await paymentEventRepository.claimPaymentEventRetry(
    eventData.provider,
    eventData.event,
    eventData.reference
  );
  assert.equal(claimed.status, "PROCESSING");
  assert.equal(claimed.attempts, 2);
  assert.equal(
    await paymentEventRepository.claimPaymentEventRetry(eventData.provider, eventData.event, eventData.reference),
    null
  );
});

test("failed Paystack initialization releases real inventory exactly once", async () => {
  const customer = await User.create({
    firstName: "Failed",
    lastName: "Checkout",
    email: "failed-checkout@example.com",
    password: "not-used-in-this-test",
    role: "CUSTOMER",
    isEmailVerified: true,
    accountStatus: "ACTIVE",
  });
  const organization = await Organization.create({
    organizationName: "Failed Checkout Organization",
    businessEmail: "failed-checkout-organization@example.com",
  });
  const event = await Event.create({
    eventName: "Failed Checkout Event",
    slug: "failed-checkout-event",
    startAt: new Date(Date.now() + 86400000),
    endAt: new Date(Date.now() + 90000000),
    capacity: 20,
    status: EVENT_STATUS.PUBLISHED,
    organization: organization._id,
    createdBy: customer._id,
  });
  const ticketType = await createTicketType({
    event: event._id,
    organization: organization._id,
    createdBy: customer._id,
    quantity: 4,
  });
  const dependencies = {
    mongoose,
    authRepository,
    eventRepository,
    orderRepository,
    ticketTypeRepository,
    paystackService: {
      async initializeTransaction() {
        return { configured: true, status: false, message: "Provider unavailable", data: null };
      },
    },
  };

  const result = await ticketingService.createCheckoutOrder(customer._id, {
    eventId: event._id.toString(),
    customerInfo: { name: "Failed Checkout", phone: "+2348012345678", email: customer.email },
    items: [{ ticketTypeId: ticketType._id.toString(), quantity: 2 }],
    idempotencyKey: "failed-checkout-integration-key",
  }, dependencies);
  const order = await Order.findOne({ idempotencyKey: "failed-checkout-integration-key" });

  assert.equal(result.statusCode, 502);
  assert.equal(order.paymentStatus, PAYMENT_STATUS.FAILED);
  assert.equal((await TicketType.findById(ticketType._id)).soldQuantity, 0);
});

test("browser verification and webhook race issue tickets and notifications exactly once", async () => {
  const customer = await User.create({
    firstName: "Integration",
    lastName: "Customer",
    email: "integration-customer@example.com",
    password: "not-used-in-this-test",
    role: "CUSTOMER",
    isEmailVerified: true,
    accountStatus: "ACTIVE",
  });
  const organization = await Organization.create({
    organizationName: "Checkout Integration Organization",
    businessEmail: "checkout-integration@example.com",
  });
  const event = await Event.create({
    eventName: "Checkout Integration Event",
    slug: "checkout-integration-event",
    startAt: new Date(Date.now() + 86400000),
    endAt: new Date(Date.now() + 90000000),
    capacity: 20,
    status: EVENT_STATUS.PUBLISHED,
    organization: organization._id,
    createdBy: customer._id,
  });
  const ticketType = await createTicketType({
    event: event._id,
    organization: organization._id,
    createdBy: customer._id,
    quantity: 4,
  });
  let paymentReference;
  let notificationCount = 0;
  const paystackService = {
    async initializeTransaction(payload) {
      paymentReference = payload.reference;
      assert.equal(payload.currency, "NGN");
      assert.equal(payload.callbackUrl, "http://localhost:5173/payment/confirmation");
      return {
        configured: true,
        status: true,
        data: { authorization_url: "https://checkout.paystack.test/integration", access_code: "integration" },
      };
    },
    async verifyTransaction(reference) {
      return {
        configured: true,
        status: true,
        data: { status: "success", reference, amount: 500000, currency: "NGN" },
      };
    },
    verifyWebhookSignature() {
      return true;
    },
  };
  const dependencies = {
    mongoose,
    authRepository,
    eventRepository,
    orderRepository,
    paymentEventRepository,
    ticketRepository,
    ticketTypeRepository,
    paystackService,
    notificationService: {
      async sendPaymentSuccessNotification() { notificationCount += 1; },
      async sendTicketIssuedNotification() { notificationCount += 1; },
    },
  };

  const checkout = await ticketingService.createCheckoutOrder(customer._id, {
    eventId: event._id.toString(),
    customerInfo: { name: "Integration Customer", phone: "+2348012345678", email: customer.email },
    items: [{ ticketTypeId: ticketType._id.toString(), quantity: 2 }],
    idempotencyKey: "checkout-integration-key",
  }, dependencies);
  assert.equal(checkout.payment.authorizationUrl, "https://checkout.paystack.test/integration");
  assert.equal((await TicketType.findById(ticketType._id)).soldQuantity, 2);

  const providerData = { status: "success", reference: paymentReference, amount: 500000, currency: "NGN" };
  const [first, webhook] = await Promise.all([
    ticketingService.verifyPayment(customer._id, paymentReference, dependencies),
    ticketingService.handlePaystackWebhook(
      Buffer.from(JSON.stringify({ event: "charge.success", data: providerData })),
      "valid-signature",
      { event: "charge.success", data: providerData },
      dependencies
    ),
  ]);
  const second = await ticketingService.verifyPayment(customer._id, paymentReference, dependencies);
  assert.equal(first.order.paymentStatus, PAYMENT_STATUS.PAID);
  assert.equal(webhook.error, undefined);
  assert.equal(second.reused, true);
  assert.equal(await Ticket.countDocuments({ order: first.order.id }), 2);
  assert.equal(await PaymentEvent.countDocuments({ reference: paymentReference }), 1);
  assert.equal(notificationCount, 2);
});
