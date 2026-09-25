import test from "node:test";
import assert from "node:assert/strict";

import * as organizationService from "../src/services/organization.service.js";
import adminRoutes from "../src/routes/admin.routes.js";
import { organizationDetailsQuerySchema } from "../src/validators/admin.validator.js";

const ids = {
  organization: "64b64b64b64b64b64b64b801",
  owner: "64b64b64b64b64b64b64b802",
  event: "64b64b64b64b64b64b64b803",
  order: "64b64b64b64b64b64b64b804",
  withdrawal: "64b64b64b64b64b64b64b805",
};

function dependencies() {
  const organization = {
    _id: ids.organization,
    organizationName: "Acme Events",
    businessEmail: "hello@acme.test",
    businessPhone: "+2348000000000",
    status: "APPROVED",
    createdAt: new Date("2026-01-01T10:00:00.000Z"),
    approvedAt: new Date("2026-01-02T10:00:00.000Z"),
    primaryAdmin: {
      _id: ids.owner,
      firstName: "Ada",
      lastName: "Owner",
      email: "ada@acme.test",
    },
  };
  const event = {
    _id: ids.event,
    eventName: "Launch Night",
    status: "PUBLISHED",
    startAt: new Date("2026-10-01T18:00:00.000Z"),
    endAt: new Date("2026-10-01T22:00:00.000Z"),
    createdAt: new Date("2026-08-01T10:00:00.000Z"),
  };
  const order = {
    _id: ids.order,
    reference: "ord_details",
    organization: ids.organization,
    event,
    items: [{ name: "General", quantity: 2, unitPrice: 2500, total: 5000 }],
    subtotal: 5000,
    total: 5000,
    currency: "NGN",
    paymentStatus: "PAID",
    orderStatus: "PAID",
    customerInfo: { name: "Buyer One", email: "buyer@test.dev", phone: "+2348111111111" },
    paidAt: new Date("2026-08-05T10:00:00.000Z"),
    createdAt: new Date("2026-08-05T10:00:00.000Z"),
  };
  const withdrawal = {
    _id: ids.withdrawal,
    reference: "wd_details",
    organization: ids.organization,
    requestedBy: organization.primaryAdmin,
    amount: 1000,
    amountMinor: 100000,
    currency: "NGN",
    status: "PENDING",
    createdAt: new Date("2026-08-06T10:00:00.000Z"),
  };
  const member = {
    _id: ids.owner,
    firstName: "Ada",
    lastName: "Owner",
    email: "ada@acme.test",
    role: "ADMIN",
    accountStatus: "ACTIVE",
    isEmailVerified: true,
    createdAt: new Date("2026-01-01T10:00:00.000Z"),
  };

  return {
    organizationRepository: { async findOrganizationDetailsById() { return organization; } },
    analyticsRepository: {
      async getScopeOverview() {
        return {
          orders: { grossSalesMinor: 500000, ticketsSold: 42, successfulOrders: 20, currencies: ["NGN"] },
          refunds: { refundsMinor: 50000, successfulRefunds: 1 },
          attendance: { attendance: 30, ticketLinkedAttendance: 30, legacyAttendance: 0 },
          inventory: { sellableInventory: 100, reservedInventory: 42 },
          orderStates: {},
          eventCount: 3,
        };
      },
      async getEventPerformance() {
        return { items: [{ ...event, grossSalesMinor: 500000, refundsMinor: 50000, netRevenueMinor: 450000, ticketsSold: 42, successfulOrders: 20, sellableInventory: 100, reservedInventory: 42 }], totalItems: 1 };
      },
    },
    eventRepository: {
      async countEvents() { return 2; },
      async findEvents() { return [event]; },
    },
    orderRepository: {
      async findOrders() { return [order]; },
      async countOrders() { return 1; },
    },
    withdrawalRepository: {
      async findWithdrawals() { return [withdrawal]; },
      async countWithdrawals() { return 1; },
    },
    userRepository: {
      async findOrganizationMembers() { return [member]; },
      async countUsers() { return 1; },
      async findOrganizationRecentMemberActivity() { return [member]; },
    },
    async calculateOrganizationFinancialPosition() {
      return {
        currency: "NGN",
        grossSalesMinor: 500000,
        refundsMinor: 50000,
        netRevenueMinor: 450000,
        completedWithdrawalsMinor: 100000,
        reservedWithdrawalsMinor: 50000,
        availableBalanceMinor: 300000,
        balanceDeficitMinor: 0,
      };
    },
  };
}

test("Super Admin organization details combines real profile, performance, finance, and section records", async () => {
  const result = await organizationService.getOrganizationDetails(
    ids.organization,
    { eventsPage: 1, salesPage: 1, withdrawalsPage: 1, membersPage: 1, limit: 10 },
    dependencies()
  );

  assert.equal(result.organization.organizationName, "Acme Events");
  assert.deepEqual(result.summary, {
    totalEvents: 3,
    currentEvents: 2,
    ticketsSold: 42,
    grossTicketSales: 5000,
    availableBalance: 3000,
    pendingWithdrawals: 500,
    totalWithdrawn: 1000,
    currency: "NGN",
  });
  assert.equal(result.events.items[0].netRevenue, 4500);
  assert.equal(result.ticketSales.items[0].customerInfo.name, "Buyer One");
  assert.equal(result.finance.withdrawals[0].reference, "wd_details");
  assert.equal(result.members.items[0].isOwner, true);
  assert.ok(result.activity.some((item) => item.type === "TICKET_ORDER_CREATED"));
});

test("organization details returns not found and validates bounded pagination", async () => {
  const missingDependencies = dependencies();
  missingDependencies.organizationRepository.findOrganizationDetailsById = async () => null;
  const result = await organizationService.getOrganizationDetails(ids.organization, {}, missingDependencies);

  assert.equal(result.statusCode, 404);
  assert.equal(organizationDetailsQuerySchema.safeParse({ limit: 50, eventsPage: 2 }).success, true);
  assert.equal(organizationDetailsQuerySchema.safeParse({ limit: 51 }).success, false);
});

test("Super Admin router exposes the protected organization details path", () => {
  const paths = adminRoutes.stack.filter((layer) => layer.route).map((layer) => layer.route.path);
  assert.ok(paths.includes("/organizations/:organizationId/details"));
  assert.equal(paths.includes("/organizations/:organizationId/approve"), false);
  assert.equal(paths.includes("/organizations/:organizationId/reject"), false);
});
