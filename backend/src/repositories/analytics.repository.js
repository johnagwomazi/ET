import mongoose from "mongoose";
import Event from "../models/event.model.js";
import EventAttendance from "../models/eventAttendance.model.js";
import Order from "../models/order.model.js";
import Organization from "../models/organization.model.js";
import Refund from "../models/refund.model.js";
import TicketType from "../models/ticketType.model.js";
import {
  ANALYTICS_SUCCESSFUL_PAYMENT_STATUSES,
  ANALYTICS_SUCCESSFUL_REFUND_STATUS,
} from "../constants/analytics.constants.js";
import { analyticsPeriodToMongoUnit, formatTimezoneOffset } from "../utils/analytics.util.js";

const ORDER_COLLECTION = Order.collection.name;
const REFUND_COLLECTION = Refund.collection.name;
const ATTENDANCE_COLLECTION = EventAttendance.collection.name;
const EVENT_COLLECTION = Event.collection.name;
const TICKET_TYPE_COLLECTION = TicketType.collection.name;

function toObjectId(value) {
  if (!value) {
    return null;
  }

  return value instanceof mongoose.Types.ObjectId ? value : new mongoose.Types.ObjectId(value);
}

function dateBounds(range) {
  if (!range?.start || !range?.end) {
    return null;
  }

  return { $gte: range.start, $lte: range.end };
}

function effectiveDateMatch(primaryField, fallbackField, range) {
  const bounds = dateBounds(range);

  if (!bounds) {
    return {};
  }

  return {
    $or: [
      { [primaryField]: bounds },
      { [primaryField]: null, [fallbackField]: bounds },
    ],
  };
}

function effectiveDateExpression(primaryField, fallbackField, range) {
  if (!range?.start || !range?.end) {
    return null;
  }

  const value = { $ifNull: [primaryField, fallbackField] };
  return {
    $and: [
      { $gte: [value, range.start] },
      { $lte: [value, range.end] },
    ],
  };
}

function moneyToMinorExpression(value) {
  return { $round: [{ $multiply: [{ $ifNull: [value, 0] }, 100] }, 0] };
}

function buildOrderMatch(scope, range, includeTicketType = true) {
  const match = {
    paymentStatus: { $in: ANALYTICS_SUCCESSFUL_PAYMENT_STATUSES },
    ...effectiveDateMatch("paidAt", "createdAt", range),
  };

  if (scope.organizationId) {
    match.organization = toObjectId(scope.organizationId);
  }

  if (scope.eventId) {
    match.event = toObjectId(scope.eventId);
  }

  if (includeTicketType && scope.ticketTypeId) {
    match["items.ticketType"] = toObjectId(scope.ticketTypeId);
  }

  return match;
}

function buildRefundMatch(scope, range) {
  const match = {
    status: ANALYTICS_SUCCESSFUL_REFUND_STATUS,
    ...effectiveDateMatch("processedAt", "createdAt", range),
  };

  if (scope.organizationId) {
    match.organization = toObjectId(scope.organizationId);
  }

  if (scope.eventId) {
    match.event = toObjectId(scope.eventId);
  }

  return match;
}

function buildAttendanceMatch(scope, range) {
  const match = {};

  if (scope.organizationId) {
    match.organization = toObjectId(scope.organizationId);
  }

  if (scope.eventId) {
    match.event = toObjectId(scope.eventId);
  }

  const bounds = dateBounds(range);
  if (bounds) {
    match.checkedInAt = bounds;
  }

  return match;
}

function eventScopeMatch(scope) {
  const match = {};
  if (scope.organizationId) match.organization = toObjectId(scope.organizationId);
  if (scope.eventId) match._id = toObjectId(scope.eventId);
  return match;
}

async function aggregateOrderSummary(scope, range) {
  const selectedItems = scope.ticketTypeId
    ? {
        $filter: {
          input: "$items",
          as: "item",
          cond: { $eq: ["$$item.ticketType", toObjectId(scope.ticketTypeId)] },
        },
      }
    : "$items";

  const [summary] = await Order.aggregate([
    { $match: buildOrderMatch(scope, range) },
    { $project: { currency: 1, selectedItems } },
    {
      $project: {
        currency: 1,
        grossSalesMinor: {
          $sum: { $map: { input: "$selectedItems", as: "item", in: moneyToMinorExpression("$$item.total") } },
        },
        ticketsSold: { $sum: { $map: { input: "$selectedItems", as: "item", in: "$$item.quantity" } } },
      },
    },
    {
      $group: {
        _id: null,
        grossSalesMinor: { $sum: "$grossSalesMinor" },
        ticketsSold: { $sum: "$ticketsSold" },
        successfulOrders: { $sum: 1 },
        currencies: { $addToSet: "$currency" },
      },
    },
  ]);

  return summary || { grossSalesMinor: 0, ticketsSold: 0, successfulOrders: 0, currencies: [] };
}

async function aggregateRefundSummary(scope, range) {
  const [summary] = await Refund.aggregate([
    { $match: buildRefundMatch(scope, range) },
    { $group: { _id: null, refundsMinor: { $sum: moneyToMinorExpression("$amount") }, successfulRefunds: { $sum: 1 } } },
  ]);
  return summary || { refundsMinor: 0, successfulRefunds: 0 };
}

async function aggregateAttendanceSummary(scope, range) {
  const [summary] = await EventAttendance.aggregate([
    { $match: buildAttendanceMatch(scope, range) },
    {
      $group: {
        _id: null,
        attendance: { $sum: 1 },
        ticketLinkedAttendance: { $sum: { $cond: [{ $ne: ["$ticket", null] }, 1, 0] } },
        legacyAttendance: { $sum: { $cond: [{ $eq: ["$ticket", null] }, 1, 0] } },
      },
    },
  ]);
  return summary || { attendance: 0, ticketLinkedAttendance: 0, legacyAttendance: 0 };
}

async function aggregateInventorySummary(scope) {
  const match = {};
  if (scope.organizationId) match.organization = toObjectId(scope.organizationId);
  if (scope.eventId) match.event = toObjectId(scope.eventId);
  if (scope.ticketTypeId) match._id = toObjectId(scope.ticketTypeId);

  const [summary] = await TicketType.aggregate([
    { $match: match },
    { $group: { _id: null, sellableInventory: { $sum: "$quantity" }, reservedInventory: { $sum: "$soldQuantity" } } },
  ]);
  return summary || { sellableInventory: 0, reservedInventory: 0 };
}

async function aggregateOrderStateSummary(scope, range) {
  const match = { ...effectiveDateMatch("createdAt", "createdAt", range) };
  if (scope.organizationId) match.organization = toObjectId(scope.organizationId);
  if (scope.eventId) match.event = toObjectId(scope.eventId);

  const rows = await Order.aggregate([
    { $match: match },
    { $group: { _id: "$paymentStatus", count: { $sum: 1 } } },
  ]);
  return Object.fromEntries(rows.map((row) => [row._id, row.count]));
}

async function countScopedEvents(scope, range) {
  const match = eventScopeMatch(scope);
  const bounds = dateBounds(range);
  if (bounds) match.startAt = bounds;
  return Event.countDocuments(match);
}

export async function getScopeOverview(scope = {}, range = {}) {
  const [orders, refunds, attendance, inventory, orderStates, eventCount] = await Promise.all([
    aggregateOrderSummary(scope, range),
    scope.ticketTypeId ? { refundsMinor: 0, successfulRefunds: 0 } : aggregateRefundSummary(scope, range),
    aggregateAttendanceSummary(scope, range),
    aggregateInventorySummary(scope),
    aggregateOrderStateSummary(scope, range),
    countScopedEvents(scope, range),
  ]);

  return { orders, refunds, attendance, inventory, orderStates, eventCount };
}

function dateTruncExpression(dateExpression, period, timezoneOffsetMinutes) {
  const expression = {
    date: dateExpression,
    unit: analyticsPeriodToMongoUnit(period),
    timezone: formatTimezoneOffset(timezoneOffsetMinutes),
  };
  if (period === "weekly") expression.startOfWeek = "monday";
  return { $dateTrunc: expression };
}

export async function getSalesTimeSeries(scope = {}, range = {}, period = "daily") {
  const selectedItems = scope.ticketTypeId
    ? { $filter: { input: "$items", as: "item", cond: { $eq: ["$$item.ticketType", toObjectId(scope.ticketTypeId)] } } }
    : "$items";
  const paidDate = { $ifNull: ["$paidAt", "$createdAt"] };
  const sales = await Order.aggregate([
    { $match: buildOrderMatch(scope, range) },
    { $project: { effectiveDate: paidDate, selectedItems } },
    { $unwind: "$selectedItems" },
    {
      $group: {
        _id: dateTruncExpression("$effectiveDate", period, range.timezoneOffsetMinutes),
        grossSalesMinor: { $sum: moneyToMinorExpression("$selectedItems.total") },
        ticketsSold: { $sum: "$selectedItems.quantity" },
        orderIds: { $addToSet: "$_id" },
      },
    },
    { $project: { _id: 0, periodStart: "$_id", grossSalesMinor: 1, ticketsSold: 1, successfulOrders: { $size: "$orderIds" } } },
    { $sort: { periodStart: 1 } },
  ]);

  if (scope.ticketTypeId) {
    return { sales, refunds: [], refundsAllocated: false };
  }

  const refundDate = { $ifNull: ["$processedAt", "$createdAt"] };
  const refunds = await Refund.aggregate([
    { $match: buildRefundMatch(scope, range) },
    {
      $group: {
        _id: dateTruncExpression(refundDate, period, range.timezoneOffsetMinutes),
        refundsMinor: { $sum: moneyToMinorExpression("$amount") },
      },
    },
    { $project: { _id: 0, periodStart: "$_id", refundsMinor: 1 } },
    { $sort: { periodStart: 1 } },
  ]);
  return { sales, refunds, refundsAllocated: true };
}

function lookupDateConditions(primary, fallback, range) {
  const dateExpression = effectiveDateExpression(primary, fallback, range);
  return dateExpression ? [dateExpression] : [];
}

function eventAnalyticsLookups(range) {
  return [
    {
      $lookup: {
        from: ORDER_COLLECTION,
        let: { eventId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$event", "$$eventId"] },
                  { $in: ["$paymentStatus", ANALYTICS_SUCCESSFUL_PAYMENT_STATUSES] },
                  ...lookupDateConditions("$paidAt", "$createdAt", range),
                ],
              },
            },
          },
          {
            $project: {
              grossSalesMinor: { $sum: { $map: { input: "$items", as: "item", in: moneyToMinorExpression("$$item.total") } } },
              ticketsSold: { $sum: { $map: { input: "$items", as: "item", in: "$$item.quantity" } } },
            },
          },
          { $group: { _id: null, grossSalesMinor: { $sum: "$grossSalesMinor" }, ticketsSold: { $sum: "$ticketsSold" }, successfulOrders: { $sum: 1 } } },
        ],
        as: "sales",
      },
    },
    {
      $lookup: {
        from: REFUND_COLLECTION,
        let: { eventId: "$_id" },
        pipeline: [
          { $match: { $expr: { $and: [
            { $eq: ["$event", "$$eventId"] },
            { $eq: ["$status", ANALYTICS_SUCCESSFUL_REFUND_STATUS] },
            ...lookupDateConditions("$processedAt", "$createdAt", range),
          ] } } },
          { $group: { _id: null, refundsMinor: { $sum: moneyToMinorExpression("$amount") } } },
        ],
        as: "refunds",
      },
    },
    {
      $lookup: {
        from: ATTENDANCE_COLLECTION,
        let: { eventId: "$_id" },
        pipeline: [
          { $match: { $expr: { $and: [
            { $eq: ["$event", "$$eventId"] },
            ...lookupDateConditions("$checkedInAt", "$checkedInAt", range),
          ] } } },
          { $group: { _id: null, attendance: { $sum: 1 }, ticketLinkedAttendance: { $sum: { $cond: [{ $ne: ["$ticket", null] }, 1, 0] } }, legacyAttendance: { $sum: { $cond: [{ $eq: ["$ticket", null] }, 1, 0] } } } },
        ],
        as: "attendanceData",
      },
    },
    {
      $lookup: {
        from: TICKET_TYPE_COLLECTION,
        localField: "_id",
        foreignField: "event",
        pipeline: [{ $group: { _id: null, sellableInventory: { $sum: "$quantity" }, reservedInventory: { $sum: "$soldQuantity" } } }],
        as: "inventoryData",
      },
    },
    {
      $set: {
        grossSalesMinor: { $ifNull: [{ $first: "$sales.grossSalesMinor" }, 0] },
        ticketsSold: { $ifNull: [{ $first: "$sales.ticketsSold" }, 0] },
        successfulOrders: { $ifNull: [{ $first: "$sales.successfulOrders" }, 0] },
        refundsMinor: { $ifNull: [{ $first: "$refunds.refundsMinor" }, 0] },
        attendance: { $ifNull: [{ $first: "$attendanceData.attendance" }, 0] },
        ticketLinkedAttendance: { $ifNull: [{ $first: "$attendanceData.ticketLinkedAttendance" }, 0] },
        legacyAttendance: { $ifNull: [{ $first: "$attendanceData.legacyAttendance" }, 0] },
        sellableInventory: { $ifNull: [{ $first: "$inventoryData.sellableInventory" }, 0] },
        reservedInventory: { $ifNull: [{ $first: "$inventoryData.reservedInventory" }, 0] },
      },
    },
    {
      $set: {
        netRevenueMinor: { $subtract: ["$grossSalesMinor", "$refundsMinor"] },
        attendanceRateValue: {
          $cond: [
            { $gt: ["$ticketsSold", 0] },
            { $divide: ["$ticketLinkedAttendance", "$ticketsSold"] },
            0,
          ],
        },
        salesRateValue: {
          $cond: [
            { $gt: ["$sellableInventory", 0] },
            { $divide: ["$ticketsSold", "$sellableInventory"] },
            0,
          ],
        },
      },
    },
    { $unset: ["sales", "refunds", "attendanceData", "inventoryData", "description", "lifecycle", "createdBy"] },
  ];
}

const EVENT_SORT_FIELDS = {
  netRevenue: "netRevenueMinor",
  grossSales: "grossSalesMinor",
  ticketsSold: "ticketsSold",
  attendance: "attendance",
  attendanceRate: "attendanceRateValue",
  salesRate: "salesRateValue",
  eventName: "eventName",
};

export async function getEventPerformance(scope = {}, range = {}, pagination = {}) {
  const match = eventScopeMatch(scope);
  const sortField = EVENT_SORT_FIELDS[pagination.sortBy] || "netRevenueMinor";
  const direction = pagination.sortOrder === "asc" ? 1 : -1;
  const [result] = await Event.aggregate([
    { $match: match },
    ...eventAnalyticsLookups(range),
    { $sort: { [sortField]: direction, _id: 1 } },
    { $facet: { items: [{ $skip: pagination.skip || 0 }, { $limit: pagination.limit || 20 }], total: [{ $count: "count" }] } },
  ]);
  return { items: result?.items || [], totalItems: result?.total?.[0]?.count || 0 };
}

const TICKET_TYPE_SORT_FIELDS = { grossSales: "grossSalesMinor", ticketsSold: "ticketsSold", salesRate: "salesRateValue", name: "name" };

export async function getTicketTypePerformance(scope = {}, range = {}, pagination = {}) {
  const match = {};
  if (scope.organizationId) match.organization = toObjectId(scope.organizationId);
  if (scope.eventId) match.event = toObjectId(scope.eventId);
  if (scope.ticketTypeId) match._id = toObjectId(scope.ticketTypeId);
  const dateConditions = lookupDateConditions("$paidAt", "$createdAt", range);
  const sortField = TICKET_TYPE_SORT_FIELDS[pagination.sortBy] || "grossSalesMinor";
  const direction = pagination.sortOrder === "asc" ? 1 : -1;

  const [result] = await TicketType.aggregate([
    { $match: match },
    {
      $lookup: {
        from: ORDER_COLLECTION,
        let: { ticketTypeId: "$_id", eventId: "$event" },
        pipeline: [
          { $match: { $expr: { $and: [
            { $eq: ["$event", "$$eventId"] },
            { $in: ["$paymentStatus", ANALYTICS_SUCCESSFUL_PAYMENT_STATUSES] },
            ...dateConditions,
          ] } } },
          { $unwind: "$items" },
          { $match: { $expr: { $eq: ["$items.ticketType", "$$ticketTypeId"] } } },
          { $group: { _id: null, grossSalesMinor: { $sum: moneyToMinorExpression("$items.total") }, ticketsSold: { $sum: "$items.quantity" } } },
        ],
        as: "sales",
      },
    },
    {
      $set: {
        grossSalesMinor: { $ifNull: [{ $first: "$sales.grossSalesMinor" }, 0] },
        ticketsSold: { $ifNull: [{ $first: "$sales.ticketsSold" }, 0] },
      },
    },
    {
      $set: {
        salesRateValue: {
          $cond: [
            { $gt: ["$quantity", 0] },
            { $divide: ["$ticketsSold", "$quantity"] },
            0,
          ],
        },
      },
    },
    { $unset: ["sales", "description", "createdBy"] },
    { $sort: { [sortField]: direction, _id: 1 } },
    { $facet: { items: [{ $skip: pagination.skip || 0 }, { $limit: pagination.limit || 20 }], total: [{ $count: "count" }] } },
  ]);
  return { items: result?.items || [], totalItems: result?.total?.[0]?.count || 0 };
}

const ORGANIZATION_SORT_FIELDS = {
  netRevenue: "netRevenueMinor",
  grossSales: "grossSalesMinor",
  ticketsSold: "ticketsSold",
  attendance: "attendance",
  eventCount: "eventCount",
  organizationName: "organizationName",
};

export async function getOrganizationPerformance(range = {}, pagination = {}) {
  const orderDateConditions = lookupDateConditions("$paidAt", "$createdAt", range);
  const refundDateConditions = lookupDateConditions("$processedAt", "$createdAt", range);
  const attendanceDateConditions = lookupDateConditions("$checkedInAt", "$checkedInAt", range);
  const eventDateConditions = lookupDateConditions("$startAt", "$startAt", range);
  const sortField = ORGANIZATION_SORT_FIELDS[pagination.sortBy] || "netRevenueMinor";
  const direction = pagination.sortOrder === "asc" ? 1 : -1;

  const [result] = await Organization.aggregate([
    { $match: { isDeleted: false } },
    { $lookup: { from: EVENT_COLLECTION, let: { organizationId: "$_id" }, pipeline: [
      { $match: { $expr: { $and: [{ $eq: ["$organization", "$$organizationId"] }, ...eventDateConditions] } } },
      { $count: "count" },
    ], as: "events" } },
    { $lookup: { from: ORDER_COLLECTION, let: { organizationId: "$_id" }, pipeline: [
      { $match: { $expr: { $and: [
        { $eq: ["$organization", "$$organizationId"] },
        { $in: ["$paymentStatus", ANALYTICS_SUCCESSFUL_PAYMENT_STATUSES] },
        ...orderDateConditions,
      ] } } },
      { $project: { grossSalesMinor: { $sum: { $map: { input: "$items", as: "item", in: moneyToMinorExpression("$$item.total") } } }, ticketsSold: { $sum: { $map: { input: "$items", as: "item", in: "$$item.quantity" } } } } },
      { $group: { _id: null, grossSalesMinor: { $sum: "$grossSalesMinor" }, ticketsSold: { $sum: "$ticketsSold" }, successfulOrders: { $sum: 1 } } },
    ], as: "sales" } },
    { $lookup: { from: REFUND_COLLECTION, let: { organizationId: "$_id" }, pipeline: [
      { $match: { $expr: { $and: [
        { $eq: ["$organization", "$$organizationId"] },
        { $eq: ["$status", ANALYTICS_SUCCESSFUL_REFUND_STATUS] },
        ...refundDateConditions,
      ] } } },
      { $group: { _id: null, refundsMinor: { $sum: moneyToMinorExpression("$amount") } } },
    ], as: "refunds" } },
    { $lookup: { from: ATTENDANCE_COLLECTION, let: { organizationId: "$_id" }, pipeline: [
      { $match: { $expr: { $and: [{ $eq: ["$organization", "$$organizationId"] }, ...attendanceDateConditions] } } },
      { $count: "attendance" },
    ], as: "attendanceData" } },
    { $set: {
      eventCount: { $ifNull: [{ $first: "$events.count" }, 0] },
      grossSalesMinor: { $ifNull: [{ $first: "$sales.grossSalesMinor" }, 0] },
      ticketsSold: { $ifNull: [{ $first: "$sales.ticketsSold" }, 0] },
      successfulOrders: { $ifNull: [{ $first: "$sales.successfulOrders" }, 0] },
      refundsMinor: { $ifNull: [{ $first: "$refunds.refundsMinor" }, 0] },
      attendance: { $ifNull: [{ $first: "$attendanceData.attendance" }, 0] },
    } },
    { $set: { netRevenueMinor: { $subtract: ["$grossSalesMinor", "$refundsMinor"] } } },
    { $project: { organizationName: 1, status: 1, eventCount: 1, grossSalesMinor: 1, refundsMinor: 1, netRevenueMinor: 1, ticketsSold: 1, successfulOrders: 1, attendance: 1 } },
    { $sort: { [sortField]: direction, _id: 1 } },
    { $facet: { items: [{ $skip: pagination.skip || 0 }, { $limit: pagination.limit || 20 }], total: [{ $count: "count" }] } },
  ]);
  return { items: result?.items || [], totalItems: result?.total?.[0]?.count || 0 };
}
