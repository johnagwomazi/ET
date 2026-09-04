import { z } from "zod";
import {
  ANALYTICS_DATE_PRESET,
  ANALYTICS_DEFAULT_PAGE_SIZE,
  ANALYTICS_MAX_PAGE_SIZE,
  ANALYTICS_PERIOD,
} from "../constants/analytics.constants.js";

const objectIdSchema = z.string().trim().regex(/^[a-f\d]{24}$/i, "Invalid identifier");
const dateSchema = z.string().trim().refine((value) => {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isNaN(Date.parse(value));
}, "Invalid date");

const dateFields = {
  preset: z.enum(Object.values(ANALYTICS_DATE_PRESET)).default(ANALYTICS_DATE_PRESET.THIS_MONTH),
  startDate: dateSchema.optional(),
  endDate: dateSchema.optional(),
  timezoneOffsetMinutes: z.coerce.number().int().min(-840).max(840).default(0),
};

function validateDateRange(value, context) {
  if (value.preset === ANALYTICS_DATE_PRESET.CUSTOM && (!value.startDate || !value.endDate)) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Custom range requires startDate and endDate" });
    return;
  }

  if (value.startDate && value.endDate && new Date(value.startDate) > new Date(value.endDate)) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "startDate must be before or equal to endDate" });
  }
}

const paginationFields = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(ANALYTICS_MAX_PAGE_SIZE).default(ANALYTICS_DEFAULT_PAGE_SIZE),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
};

export const analyticsOverviewQuerySchema = z.object({
  ...dateFields,
  eventId: objectIdSchema.optional(),
}).superRefine(validateDateRange);

export const analyticsSalesQuerySchema = z.object({
  ...dateFields,
  eventId: objectIdSchema.optional(),
  ticketTypeId: objectIdSchema.optional(),
  period: z.enum(Object.values(ANALYTICS_PERIOD)).default(ANALYTICS_PERIOD.DAILY),
}).superRefine(validateDateRange);

export const analyticsEventPerformanceQuerySchema = z.object({
  ...dateFields,
  ...paginationFields,
  eventId: objectIdSchema.optional(),
  sortBy: z.enum(["netRevenue", "grossSales", "ticketsSold", "attendance", "attendanceRate", "salesRate", "eventName"]).default("netRevenue"),
}).superRefine(validateDateRange);

export const analyticsTicketTypePerformanceQuerySchema = z.object({
  ...dateFields,
  ...paginationFields,
  eventId: objectIdSchema.optional(),
  ticketTypeId: objectIdSchema.optional(),
  sortBy: z.enum(["grossSales", "ticketsSold", "salesRate", "name"]).default("grossSales"),
}).superRefine(validateDateRange);

export const analyticsOrganizationPerformanceQuerySchema = z.object({
  ...dateFields,
  ...paginationFields,
  sortBy: z.enum(["netRevenue", "grossSales", "ticketsSold", "attendance", "eventCount", "organizationName"]).default("netRevenue"),
}).superRefine(validateDateRange);

