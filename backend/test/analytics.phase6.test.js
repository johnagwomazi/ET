import test from "node:test";
import assert from "node:assert/strict";

import * as analyticsService from "../src/services/analytics.service.js";
import {
  analyticsEventPerformanceQuerySchema,
  analyticsOrganizationPerformanceQuerySchema,
  analyticsOverviewQuerySchema,
  analyticsSalesQuerySchema,
  analyticsTicketTypePerformanceQuerySchema,
} from "../src/validators/analytics.validator.js";
import { resolveAnalyticsDateRange } from "../src/utils/analytics.util.js";
import Order from "../src/models/order.model.js";
import Refund from "../src/models/refund.model.js";
import organizationRoutes from "../src/routes/organization.routes.js";
import adminRoutes from "../src/routes/admin.routes.js";
import eventRoutes from "../src/routes/event.routes.js";
import { USER_ROLES } from "../src/constants/roles.constants.js";
import { EVENT_STATUS } from "../src/constants/eventStatus.constants.js";

const ids = {
  admin: "64b64b64b64b64b64b64b601",
  manager: "64b64b64b64b64b64b64b602",
  customer: "64b64b64b64b64b64b64b603",
  superAdmin: "64b64b64b64b64b64b64b604",
  organization: "64b64b64b64b64b64b64b605",
  otherOrganization: "64b64b64b64b64b64b64b606",
  event: "64b64b64b64b64b64b64b607",
  otherEvent: "64b64b64b64b64b64b64b608",
  ticketType: "64b64b64b64b64b64b64b609",
};

const rawOverview = {
  orders: { grossSalesMinor: 500050, ticketsSold: 4, successfulOrders: 2, currencies: ["NGN"] },
  refunds: { refundsMinor: 50050, successfulRefunds: 1 },
  attendance: { attendance: 5, ticketLinkedAttendance: 3, legacyAttendance: 2 },
  inventory: { sellableInventory: 10, reservedInventory: 4 },
  orderStates: { FAILED: 2, PENDING: 1, INITIALIZED: 1 },
  eventCount: 1,
};

function createDependencies(role = USER_ROLES.ADMIN, overrides = {}) {
  const event = {
    _id: ids.event,
    organization: ids.organization,
    eventName: "Launch Night",
    status: "PUBLISHED",
    startAt: new Date("2026-09-10T18:00:00.000Z"),
    endAt: new Date("2026-09-10T22:00:00.000Z"),
    capacity: 100,
  };

  return {
    authRepository: {
      async findAuthUserById() {
        return {
          _id: role === USER_ROLES.SUPER_ADMIN ? ids.superAdmin : ids.admin,
          role,
          organization: role === USER_ROLES.SUPER_ADMIN ? null : ids.organization,
        };
      },
    },
    eventRepository: {
      async findEventByIdAndOrganization(eventId, organizationId) {
        return eventId === ids.event && organizationId === ids.organization ? event : null;
      },
    },
    organizationRepository: {
      async countOrganizations() { return 3; },
    },
    ticketTypeRepository: {
      async findTicketTypes(filter) {
        return filter._id === ids.ticketType ? [{ _id: ids.ticketType }] : [];
      },
    },
    analyticsRepository: {
      async getScopeOverview() { return rawOverview; },
      async getSalesTimeSeries() {
        return {
          sales: [{ periodStart: new Date("2026-09-01T00:00:00.000Z"), grossSalesMinor: 500050, ticketsSold: 4, successfulOrders: 2 }],
          refunds: [{ periodStart: new Date("2026-09-01T00:00:00.000Z"), refundsMinor: 50050 }],
          attendance: [{ periodStart: new Date("2026-09-01T00:00:00.000Z"), attendance: 3 }],
          refundsAllocated: true,
        };
      },
      async getEventPerformance() {
        return {
          items: [{ ...event, grossSalesMinor: 500050, refundsMinor: 50050, netRevenueMinor: 450000, ticketsSold: 4, successfulOrders: 2, sellableInventory: 10, reservedInventory: 4, attendance: 5, ticketLinkedAttendance: 3, legacyAttendance: 2 }],
          totalItems: 1,
        };
      },
      async getTicketTypePerformance() {
        return {
          items: [{ _id: ids.ticketType, event: ids.event, name: "VIP", status: "ACTIVE", currency: "NGN", quantity: 10, soldQuantity: 4, grossSalesMinor: 500050, ticketsSold: 4 }],
          totalItems: 1,
        };
      },
      async getOrganizationPerformance() {
        return {
          items: [{ _id: ids.organization, organizationName: "Acme Events", status: "APPROVED", grossSalesMinor: 500050, refundsMinor: 50050, netRevenueMinor: 450000, ticketsSold: 4, successfulOrders: 2, eventCount: 1, attendance: 5 }],
          totalItems: 1,
        };
      },
    },
    ...overrides,
  };
}

test("Phase 6 validators allowlist ranges, aggregation periods, sorting, and pagination", () => {
  assert.equal(analyticsOverviewQuerySchema.safeParse({ preset: "today", timezoneOffsetMinutes: 60 }).success, true);
  assert.equal(analyticsSalesQuerySchema.safeParse({ preset: "this_week", period: "weekly" }).success, true);
  assert.equal(analyticsEventPerformanceQuerySchema.safeParse({ sortBy: "netRevenue", limit: 100 }).success, true);
  assert.equal(analyticsTicketTypePerformanceQuerySchema.safeParse({ ticketTypeId: ids.ticketType }).success, true);
  assert.equal(analyticsOrganizationPerformanceQuerySchema.safeParse({ sortBy: "eventCount" }).success, true);
  assert.equal(analyticsSalesQuerySchema.safeParse({ period: "$where", eventId: { $ne: null } }).success, false);
  assert.equal(analyticsEventPerformanceQuerySchema.safeParse({ limit: 101 }).success, false);
});

test("custom analytics ranges require both valid boundaries in chronological order", () => {
  assert.equal(analyticsOverviewQuerySchema.safeParse({ preset: "custom", startDate: "2026-09-01", endDate: "2026-09-30" }).success, true);
  assert.equal(analyticsOverviewQuerySchema.safeParse({ preset: "custom", startDate: "2026-09-01" }).success, false);
  assert.equal(analyticsOverviewQuerySchema.safeParse({ preset: "custom", startDate: "2026-10-01", endDate: "2026-09-30" }).success, false);
  assert.equal(analyticsOverviewQuerySchema.safeParse({ preset: "custom", startDate: "not-a-date", endDate: "2026-09-30" }).success, false);
});

test("timezone-aware day and custom-date boundaries are converted consistently to UTC", () => {
  const today = resolveAnalyticsDateRange({ preset: "today", timezoneOffsetMinutes: 60 }, new Date("2026-09-04T00:30:00.000Z"));
  assert.equal(today.start.toISOString(), "2026-09-03T23:00:00.000Z");
  assert.equal(today.end.toISOString(), "2026-09-04T00:30:00.000Z");

  const custom = resolveAnalyticsDateRange({ preset: "custom", startDate: "2026-09-04", endDate: "2026-09-04", timezoneOffsetMinutes: 60 });
  assert.equal(custom.start.toISOString(), "2026-09-03T23:00:00.000Z");
  assert.equal(custom.end.toISOString(), "2026-09-04T22:59:59.999Z");
});

test("canonical summary preserves decimal money precision and excludes legacy attendance from rate", () => {
  const summary = analyticsService.buildAnalyticsSummary(rawOverview);
  assert.equal(summary.grossSales, 5000.5);
  assert.equal(summary.refunds, 500.5);
  assert.equal(summary.netRevenue, 4500);
  assert.equal(summary.attendance, 5);
  assert.equal(summary.attendanceRate, 75);
  assert.equal(summary.legacyAttendance, 2);
  assert.equal(summary.ticketsRemaining, 6);
  assert.equal(summary.failedPayments, 2);
  assert.equal(summary.pendingPayments, 2);
});

test("zero-price paid tickets count as sales volume without creating revenue", () => {
  const summary = analyticsService.buildAnalyticsSummary({
    orders: { grossSalesMinor: 0, ticketsSold: 5, successfulOrders: 1, currencies: ["NGN"] },
    refunds: {}, attendance: { attendance: 2, ticketLinkedAttendance: 2, legacyAttendance: 0 },
    inventory: { sellableInventory: 20, reservedInventory: 5 }, orderStates: {}, eventCount: 1,
  });
  assert.equal(summary.grossSales, 0);
  assert.equal(summary.ticketsSold, 5);
  assert.equal(summary.attendanceRate, 40);
  assert.equal(summary.salesRate, 25);
});

test("zero-data analytics never divide by zero", () => {
  const summary = analyticsService.buildAnalyticsSummary({});
  assert.equal(summary.netRevenue, 0);
  assert.equal(summary.attendanceRate, 0);
  assert.equal(summary.salesRate, 0);
  assert.equal(summary.ticketsRemaining, 0);
});

test("organization overview is scoped to the authenticated admin organization", async () => {
  let capturedScope;
  const dependencies = createDependencies(USER_ROLES.ADMIN);
  dependencies.analyticsRepository.getScopeOverview = async (scope) => { capturedScope = scope; return rawOverview; };
  const result = await analyticsService.getOrganizationOverview(ids.organization, ids.admin, { preset: "all", eventId: ids.event }, dependencies);
  assert.equal(result.error, undefined);
  assert.equal(capturedScope.organizationId, ids.organization);
  assert.equal(capturedScope.eventId, ids.event);
  assert.equal(result.summary.netRevenue, 4500);
  assert.match(result.definitions.grossSales, /order-item totals/i);
});

test("manager, customer, and cross-organization admins cannot read organization financials", async () => {
  const manager = await analyticsService.getOrganizationOverview(ids.organization, ids.manager, {}, createDependencies(USER_ROLES.MANAGER));
  const customer = await analyticsService.getOrganizationOverview(ids.organization, ids.customer, {}, createDependencies(USER_ROLES.CUSTOMER));
  const cross = await analyticsService.getOrganizationOverview(ids.otherOrganization, ids.admin, {}, createDependencies(USER_ROLES.ADMIN));
  assert.equal(manager.statusCode, 403);
  assert.equal(customer.statusCode, 403);
  assert.equal(cross.statusCode, 403);
});

test("organization event and ticket-type filters enforce ownership", async () => {
  const dependencies = createDependencies();
  const badEvent = await analyticsService.getOrganizationOverview(ids.organization, ids.admin, { eventId: ids.otherEvent }, dependencies);
  const badTicket = await analyticsService.getOrganizationSales(ids.organization, ids.admin, { preset: "all", period: "daily", ticketTypeId: "64b64b64b64b64b64b64b699" }, dependencies);
  assert.equal(badEvent.statusCode, 404);
  assert.equal(badTicket.statusCode, 404);
});

test("event analytics use historical order totals rather than the current ticket price", async () => {
  const dependencies = createDependencies();
  dependencies.ticketTypeRepository.findTicketTypes = async () => [{ _id: ids.ticketType, price: 7000 }];
  const result = await analyticsService.getEventAnalytics(ids.organization, ids.admin, ids.event, { preset: "all" }, dependencies);
  assert.equal(result.summary.grossSales, 5000.5);
  assert.equal(result.ticketTypes[0].grossSales, 5000.5);
  assert.equal(result.ticketTypes[0].ticketsRemaining, 6);
  assert.equal(result.ticketTypes[0].ticketType.status, "ACTIVE");
});

test("event analytics derives ticket status from lifecycle and sales dates", async () => {
  const dependencies = createDependencies();
  const findEvent = dependencies.eventRepository.findEventByIdAndOrganization;
  const getTicketTypes = dependencies.analyticsRepository.getTicketTypePerformance;
  const event = await findEvent(ids.event, ids.organization);

  dependencies.eventRepository.findEventByIdAndOrganization = async () => ({
    ...event,
    status: EVENT_STATUS.COMPLETED,
  });
  const completed = await analyticsService.getEventAnalytics(
    ids.organization,
    ids.admin,
    ids.event,
    { preset: "all" },
    dependencies
  );
  assert.equal(completed.ticketTypes[0].ticketType.status, "INACTIVE");

  dependencies.eventRepository.findEventByIdAndOrganization = async () => ({
    ...event,
    status: EVENT_STATUS.POSTPONED,
  });
  dependencies.analyticsRepository.getTicketTypePerformance = async () => {
    const result = await getTicketTypes();
    return {
      ...result,
      items: result.items.map((ticketType) => ({
        ...ticketType,
        saleStartsAt: new Date(Date.now() - 60_000),
        saleEndsAt: new Date(Date.now() - 1_000),
      })),
    };
  };
  const expired = await analyticsService.getEventAnalytics(
    ids.organization,
    ids.admin,
    ids.event,
    { preset: "all" },
    dependencies
  );
  assert.equal(expired.ticketTypes[0].ticketType.status, "INACTIVE");

  dependencies.analyticsRepository.getTicketTypePerformance = async () => {
    const result = await getTicketTypes();
    return {
      ...result,
      items: result.items.map((ticketType) => ({
        ...ticketType,
        saleStartsAt: new Date(Date.now() - 60_000),
        saleEndsAt: new Date(Date.now() + 60_000),
      })),
    };
  };
  const extended = await analyticsService.getEventAnalytics(
    ids.organization,
    ids.admin,
    ids.event,
    { preset: "all" },
    dependencies
  );
  assert.equal(extended.ticketTypes[0].ticketType.status, "ACTIVE");
});

test("sales series merges successful sales and refunds into frontend-ready net values", async () => {
  const result = await analyticsService.getOrganizationSales(ids.organization, ids.admin, { preset: "all", period: "monthly" }, createDependencies());
  assert.equal(result.series.length, 1);
  assert.equal(result.series[0].grossSales, 5000.5);
  assert.equal(result.series[0].refunds, 500.5);
  assert.equal(result.series[0].netRevenue, 4500);
  assert.equal(result.series[0].ticketsSold, 4);
  assert.equal(result.series[0].attendance, 3);
});

test("event and ticket-type performance return bounded pagination metadata", async () => {
  const dependencies = createDependencies();
  const events = await analyticsService.getOrganizationEventPerformance(ids.organization, ids.admin, { preset: "all", page: 2, limit: 1, sortBy: "netRevenue" }, dependencies);
  const types = await analyticsService.getOrganizationTicketTypePerformance(ids.organization, ids.admin, { preset: "all", page: 1, limit: 1, sortBy: "grossSales" }, dependencies);
  assert.deepEqual(events.pagination, { page: 2, limit: 1, totalItems: 1, totalPages: 1 });
  assert.equal(events.events[0].attendanceRate, 75);
  assert.equal(types.pagination.limit, 1);
  assert.equal(types.ticketTypes[0].salesRate, 40);
});

test("only Super Admin can retrieve platform-wide analytics and rankings", async () => {
  const denied = await analyticsService.getPlatformOverview(ids.admin, { preset: "all" }, createDependencies(USER_ROLES.ADMIN));
  const allowed = await analyticsService.getPlatformOverview(ids.superAdmin, { preset: "all" }, createDependencies(USER_ROLES.SUPER_ADMIN));
  assert.equal(denied.statusCode, 403);
  assert.equal(allowed.summary.organizations, 3);
  assert.equal(allowed.topEvents.length, 1);
  assert.equal(allowed.topOrganizations[0].organization.name, "Acme Events");
});

test("analytics indexes cover paid dates, organization/event scope, and successful refunds", () => {
  const orderIndexes = Order.schema.indexes().map(([fields]) => fields);
  const refundIndexes = Refund.schema.indexes().map(([fields]) => fields);
  assert.ok(orderIndexes.some((fields) => fields.paymentStatus === 1 && fields.paidAt === -1));
  assert.ok(orderIndexes.some((fields) => fields.organization === 1 && fields.event === 1 && fields.paymentStatus === 1));
  assert.ok(refundIndexes.some((fields) => fields.status === 1 && fields.processedAt === -1));
  assert.ok(refundIndexes.some((fields) => fields.organization === 1 && fields.event === 1 && fields.status === 1));
});

test("all Phase 6 routes are registered under existing protected route hierarchies", () => {
  const paths = (router) => router.stack.filter((layer) => layer.route).map((layer) => layer.route.path);
  assert.ok(paths(organizationRoutes).includes("/me/analytics/overview"));
  assert.ok(paths(organizationRoutes).includes("/me/analytics/ticket-types"));
  assert.ok(paths(eventRoutes).includes("/:eventId/analytics"));
  assert.ok(paths(adminRoutes).includes("/analytics/overview"));
  assert.ok(paths(adminRoutes).includes("/analytics/organizations"));
});
