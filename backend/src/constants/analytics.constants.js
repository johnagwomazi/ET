import { PAYMENT_STATUS, REFUND_STATUS } from "./ticketing.constants.js";

export const ANALYTICS_DATE_PRESET = Object.freeze({
  ALL: "all",
  TODAY: "today",
  THIS_WEEK: "this_week",
  THIS_MONTH: "this_month",
  CUSTOM: "custom",
});

export const ANALYTICS_PERIOD = Object.freeze({
  DAILY: "daily",
  WEEKLY: "weekly",
  MONTHLY: "monthly",
});

export const ANALYTICS_SUCCESSFUL_PAYMENT_STATUSES = Object.freeze([
  PAYMENT_STATUS.PAID,
  PAYMENT_STATUS.PARTIALLY_REFUNDED,
  PAYMENT_STATUS.REFUNDED,
]);

export const ANALYTICS_SUCCESSFUL_REFUND_STATUS = REFUND_STATUS.SUCCEEDED;

export const ANALYTICS_DEFINITIONS = Object.freeze({
  grossSales: "Sum of immutable order-item totals for successfully paid orders before refunds.",
  refunds: "Sum of successful refund records only.",
  netTicketRevenue: "Gross sales minus successful refunds.",
  ticketsSold: "Sum of ticket quantities on successfully paid orders, including zero-price orders.",
  attendance: "Count of persisted attendance records.",
  attendanceRate: "Ticket-linked attendance divided by tickets sold; legacy manual attendance is excluded.",
  salesRate: "Tickets sold divided by current total ticket-type inventory.",
  moneyStorage: "Order and refund amounts are stored in NGN major units; analytics rounds through two-decimal minor units.",
});

export const ANALYTICS_DEFAULT_PAGE_SIZE = 20;
export const ANALYTICS_MAX_PAGE_SIZE = 100;

