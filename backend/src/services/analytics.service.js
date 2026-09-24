import { HTTP_STATUS } from "../constants/httpStatus.constants.js";
import { DEFAULT_CURRENCY, PAYMENT_STATUS } from "../constants/ticketing.constants.js";
import { USER_ROLES } from "../constants/roles.constants.js";
import { ANALYTICS_DEFINITIONS } from "../constants/analytics.constants.js";
import * as analyticsRepository from "../repositories/analytics.repository.js";
import * as authRepository from "../repositories/auth.repository.js";
import * as eventRepository from "../repositories/event.repository.js";
import * as organizationRepository from "../repositories/organization.repository.js";
import * as ticketTypeRepository from "../repositories/ticketType.repository.js";
import { buildPaginationMeta } from "../utils/query.util.js";
import {
  calculateRate,
  fromMinorUnits,
  mapAnalyticsRange,
  resolveAnalyticsDateRange,
} from "../utils/analytics.util.js";
import { getEffectiveTicketTypeStatus } from "../utils/ticketTypeAvailability.util.js";

const defaultDependencies = {
  analyticsRepository,
  authRepository,
  eventRepository,
  organizationRepository,
  ticketTypeRepository,
};

function getId(value) {
  if (!value) return null;
  if (typeof value === "string") return value;
  return String(value._id || value);
}

function forbidden(message = "You do not have access to this resource") {
  return { error: message, statusCode: HTTP_STATUS.FORBIDDEN };
}

async function requireOrganizationAdmin(organizationId, actorUserId, dependencies) {
  const actor = await dependencies.authRepository.findAuthUserById(actorUserId);
  if (!actor) return { error: "Not authorized", statusCode: HTTP_STATUS.UNAUTHORIZED };
  if (actor.role !== USER_ROLES.ADMIN) return forbidden();
  if (getId(actor.organization) !== getId(organizationId)) return forbidden("You cannot access another organization");
  return { actor };
}

async function requireSuperAdmin(actorUserId, dependencies) {
  const actor = await dependencies.authRepository.findAuthUserById(actorUserId);
  if (!actor) return { error: "Not authorized", statusCode: HTTP_STATUS.UNAUTHORIZED };
  if (actor.role !== USER_ROLES.SUPER_ADMIN) return forbidden();
  return { actor };
}

async function validateOrganizationFilters(organizationId, query, dependencies) {
  let event = null;
  if (query.eventId) {
    event = await dependencies.eventRepository.findEventByIdAndOrganization(query.eventId, organizationId);
    if (!event) return { error: "Event not found", statusCode: HTTP_STATUS.NOT_FOUND };
  }

  if (query.ticketTypeId) {
    const rows = await dependencies.ticketTypeRepository.findTicketTypes({
      _id: query.ticketTypeId,
      organization: organizationId,
      ...(query.eventId ? { event: query.eventId } : {}),
    }, { limit: 1 });
    if (!rows.length) return { error: "Ticket type not found", statusCode: HTTP_STATUS.NOT_FOUND };
  }
  return { event };
}

function paginationFrom(query) {
  return {
    page: query.page || 1,
    limit: query.limit || 20,
    skip: ((query.page || 1) - 1) * (query.limit || 20),
    sortBy: query.sortBy,
    sortOrder: query.sortOrder || "desc",
  };
}

export function buildAnalyticsSummary(raw = {}) {
  const grossSales = fromMinorUnits(raw.orders?.grossSalesMinor);
  const refunds = fromMinorUnits(raw.refunds?.refundsMinor);
  const ticketsSold = Number(raw.orders?.ticketsSold || 0);
  const attendance = Number(raw.attendance?.attendance || 0);
  const ticketLinkedAttendance = Number(raw.attendance?.ticketLinkedAttendance || 0);
  const legacyAttendance = Number(raw.attendance?.legacyAttendance || 0);
  const sellableInventory = Number(raw.inventory?.sellableInventory || 0);
  const reservedInventory = Number(raw.inventory?.reservedInventory || 0);
  const statusCounts = raw.orderStates || {};
  const currencies = raw.orders?.currencies || [];

  return {
    currency: currencies.length === 1 ? currencies[0] : currencies.length > 1 ? "MIXED" : DEFAULT_CURRENCY,
    grossSales,
    refunds,
    netRevenue: fromMinorUnits((raw.orders?.grossSalesMinor || 0) - (raw.refunds?.refundsMinor || 0)),
    ticketsSold,
    successfulOrders: Number(raw.orders?.successfulOrders || 0),
    successfulRefunds: Number(raw.refunds?.successfulRefunds || 0),
    failedPayments: Number(statusCounts[PAYMENT_STATUS.FAILED] || 0),
    pendingPayments: Number(statusCounts[PAYMENT_STATUS.PENDING] || 0) + Number(statusCounts[PAYMENT_STATUS.INITIALIZED] || 0),
    events: Number(raw.eventCount || 0),
    attendance,
    ticketLinkedAttendance,
    legacyAttendance,
    attendanceRate: calculateRate(ticketLinkedAttendance, ticketsSold),
    sellableInventory,
    ticketsRemaining: Math.max(0, sellableInventory - reservedInventory),
    salesRate: calculateRate(ticketsSold, sellableInventory),
  };
}

function mapEvent(row) {
  const ticketsSold = Number(row.ticketsSold || 0);
  const inventory = Number(row.sellableInventory || 0);
  const ticketLinked = Number(row.ticketLinkedAttendance || 0);
  return {
    event: {
      id: getId(row),
      name: row.eventName,
      status: row.status,
      startAt: row.startAt,
      endAt: row.endAt,
      capacity: Number(row.capacity || 0),
    },
    currency: DEFAULT_CURRENCY,
    grossSales: fromMinorUnits(row.grossSalesMinor),
    refunds: fromMinorUnits(row.refundsMinor),
    netRevenue: fromMinorUnits(row.netRevenueMinor),
    ticketsSold,
    successfulOrders: Number(row.successfulOrders || 0),
    sellableInventory: inventory,
    ticketsRemaining: Math.max(0, inventory - Number(row.reservedInventory || 0)),
    attendance: Number(row.attendance || 0),
    ticketLinkedAttendance: ticketLinked,
    legacyAttendance: Number(row.legacyAttendance || 0),
    attendanceRate: calculateRate(ticketLinked, ticketsSold),
    salesRate: calculateRate(ticketsSold, inventory),
  };
}

function mapTicketType(row, event = null, now = new Date()) {
  const sold = Number(row.ticketsSold || 0);
  const quantity = Number(row.quantity || 0);
  const configuredStatus = row.status;
  const eventContext = event || { status: row.eventStatus };
  return {
    ticketType: {
      id: getId(row),
      eventId: getId(row.event),
      name: row.name,
      status: getEffectiveTicketTypeStatus(row, eventContext, now),
      configuredStatus,
      saleStartsAt: row.saleStartsAt || null,
      saleEndsAt: row.saleEndsAt || null,
    },
    currency: row.currency || DEFAULT_CURRENCY,
    grossSales: fromMinorUnits(row.grossSalesMinor),
    ticketsSold: sold,
    sellableInventory: quantity,
    ticketsRemaining: Math.max(0, quantity - Number(row.soldQuantity || 0)),
    salesRate: calculateRate(sold, quantity),
  };
}

function mapOrganization(row) {
  return {
    organization: { id: getId(row), name: row.organizationName, status: row.status },
    currency: DEFAULT_CURRENCY,
    grossSales: fromMinorUnits(row.grossSalesMinor),
    refunds: fromMinorUnits(row.refundsMinor),
    netRevenue: fromMinorUnits(row.netRevenueMinor),
    ticketsSold: Number(row.ticketsSold || 0),
    successfulOrders: Number(row.successfulOrders || 0),
    events: Number(row.eventCount || 0),
    attendance: Number(row.attendance || 0),
  };
}

function mapSeries(raw) {
  const periods = new Map();
  for (const row of raw.sales || []) {
    const key = new Date(row.periodStart).toISOString();
    periods.set(key, {
      periodStart: key,
      grossSales: fromMinorUnits(row.grossSalesMinor),
      refunds: 0,
      netRevenue: fromMinorUnits(row.grossSalesMinor),
      ticketsSold: Number(row.ticketsSold || 0),
      successfulOrders: Number(row.successfulOrders || 0),
      attendance: 0,
    });
  }
  for (const row of raw.refunds || []) {
    const key = new Date(row.periodStart).toISOString();
    const item = periods.get(key) || { periodStart: key, grossSales: 0, refunds: 0, netRevenue: 0, ticketsSold: 0, successfulOrders: 0, attendance: 0 };
    item.refunds = fromMinorUnits(row.refundsMinor);
    item.netRevenue = fromMinorUnits(Math.round(item.grossSales * 100) - Number(row.refundsMinor || 0));
    periods.set(key, item);
  }
  for (const row of raw.attendance || []) {
    const key = new Date(row.periodStart).toISOString();
    const item = periods.get(key) || { periodStart: key, grossSales: 0, refunds: 0, netRevenue: 0, ticketsSold: 0, successfulOrders: 0, attendance: 0 };
    item.attendance = Number(row.attendance || 0);
    periods.set(key, item);
  }
  return [...periods.values()].sort((a, b) => a.periodStart.localeCompare(b.periodStart));
}

async function organizationContext(organizationId, actorUserId, query, dependencies) {
  const access = await requireOrganizationAdmin(organizationId, actorUserId, dependencies);
  if (access.error) return access;
  const filters = await validateOrganizationFilters(organizationId, query, dependencies);
  if (filters.error) return filters;
  return { range: resolveAnalyticsDateRange(query), scope: { organizationId, eventId: query.eventId, ticketTypeId: query.ticketTypeId }, event: filters.event };
}

export async function getOrganizationOverview(organizationId, actorUserId, query = {}, dependencies = defaultDependencies) {
  const context = await organizationContext(organizationId, actorUserId, query, dependencies);
  if (context.error) return context;
  const raw = await dependencies.analyticsRepository.getScopeOverview(context.scope, context.range);
  return { range: mapAnalyticsRange(context.range), definitions: ANALYTICS_DEFINITIONS, summary: buildAnalyticsSummary(raw) };
}

export async function getEventAnalytics(organizationId, actorUserId, eventId, query = {}, dependencies = defaultDependencies) {
  const context = await organizationContext(organizationId, actorUserId, { ...query, eventId }, dependencies);
  if (context.error) return context;
  const [raw, ticketTypes] = await Promise.all([
    dependencies.analyticsRepository.getScopeOverview(context.scope, context.range),
    dependencies.analyticsRepository.getTicketTypePerformance(context.scope, context.range, { page: 1, limit: 100, skip: 0, sortBy: "grossSales", sortOrder: "desc" }),
  ]);
  return {
    range: mapAnalyticsRange(context.range),
    definitions: ANALYTICS_DEFINITIONS,
    event: { id: getId(context.event), name: context.event.eventName, status: context.event.status, startAt: context.event.startAt, endAt: context.event.endAt, capacity: Number(context.event.capacity || 0) },
    summary: buildAnalyticsSummary(raw),
    ticketTypes: ticketTypes.items.map((ticketType) => mapTicketType(ticketType, context.event)),
  };
}

export async function getOrganizationSales(organizationId, actorUserId, query = {}, dependencies = defaultDependencies) {
  const context = await organizationContext(organizationId, actorUserId, query, dependencies);
  if (context.error) return context;
  const raw = await dependencies.analyticsRepository.getSalesTimeSeries(context.scope, context.range, query.period);
  return { range: mapAnalyticsRange(context.range), period: query.period, currency: DEFAULT_CURRENCY, refundsAllocated: raw.refundsAllocated, series: mapSeries(raw) };
}

export async function getOrganizationEventPerformance(organizationId, actorUserId, query = {}, dependencies = defaultDependencies) {
  const context = await organizationContext(organizationId, actorUserId, query, dependencies);
  if (context.error) return context;
  const page = paginationFrom(query);
  const result = await dependencies.analyticsRepository.getEventPerformance(context.scope, context.range, page);
  return { range: mapAnalyticsRange(context.range), events: result.items.map(mapEvent), pagination: buildPaginationMeta(result.totalItems, page) };
}

export async function getOrganizationTicketTypePerformance(organizationId, actorUserId, query = {}, dependencies = defaultDependencies) {
  const context = await organizationContext(organizationId, actorUserId, query, dependencies);
  if (context.error) return context;
  const page = paginationFrom(query);
  const result = await dependencies.analyticsRepository.getTicketTypePerformance(context.scope, context.range, page);
  return { range: mapAnalyticsRange(context.range), ticketTypes: result.items.map(mapTicketType), pagination: buildPaginationMeta(result.totalItems, page) };
}

async function platformContext(actorUserId, query, dependencies) {
  const access = await requireSuperAdmin(actorUserId, dependencies);
  if (access.error) return access;
  return { range: resolveAnalyticsDateRange(query), scope: { eventId: query.eventId, ticketTypeId: query.ticketTypeId } };
}

export async function getPlatformOverview(actorUserId, query = {}, dependencies = defaultDependencies) {
  const context = await platformContext(actorUserId, query, dependencies);
  if (context.error) return context;
  const topPage = { page: 1, limit: 5, skip: 0, sortBy: "netRevenue", sortOrder: "desc" };
  const [raw, topEvents, topOrganizations, totalOrganizations] = await Promise.all([
    dependencies.analyticsRepository.getScopeOverview(context.scope, context.range),
    dependencies.analyticsRepository.getEventPerformance(context.scope, context.range, topPage),
    dependencies.analyticsRepository.getOrganizationPerformance(context.range, topPage),
    dependencies.organizationRepository.countOrganizations({ isDeleted: false }),
  ]);
  return {
    range: mapAnalyticsRange(context.range),
    definitions: ANALYTICS_DEFINITIONS,
    summary: { ...buildAnalyticsSummary(raw), organizations: Number(totalOrganizations || 0) },
    topEvents: topEvents.items.map(mapEvent),
    topOrganizations: topOrganizations.items.map(mapOrganization),
  };
}

export async function getPlatformSales(actorUserId, query = {}, dependencies = defaultDependencies) {
  const context = await platformContext(actorUserId, query, dependencies);
  if (context.error) return context;
  const raw = await dependencies.analyticsRepository.getSalesTimeSeries(context.scope, context.range, query.period);
  return { range: mapAnalyticsRange(context.range), period: query.period, currency: DEFAULT_CURRENCY, refundsAllocated: raw.refundsAllocated, series: mapSeries(raw) };
}

export async function getPlatformEventPerformance(actorUserId, query = {}, dependencies = defaultDependencies) {
  const context = await platformContext(actorUserId, query, dependencies);
  if (context.error) return context;
  const page = paginationFrom(query);
  const result = await dependencies.analyticsRepository.getEventPerformance(context.scope, context.range, page);
  return { range: mapAnalyticsRange(context.range), events: result.items.map(mapEvent), pagination: buildPaginationMeta(result.totalItems, page) };
}

export async function getPlatformOrganizationPerformance(actorUserId, query = {}, dependencies = defaultDependencies) {
  const context = await platformContext(actorUserId, query, dependencies);
  if (context.error) return context;
  const page = paginationFrom(query);
  const result = await dependencies.analyticsRepository.getOrganizationPerformance(context.range, page);
  return { range: mapAnalyticsRange(context.range), organizations: result.items.map(mapOrganization), pagination: buildPaginationMeta(result.totalItems, page) };
}
