import { z } from "zod";

const positivePageSchema = z.coerce.number().int().min(1, "Page must be at least 1").optional();
const publicLimitSchema = z.coerce.number().int().min(1, "Limit must be at least 1").max(50, "Limit must be 50 or less").optional();
const publicSortSchema = z.enum(["upcoming", "newest", "dateAsc", "dateDesc", "featured", "trending"]).optional();
const publicDateFilterSchema = z.enum(["today", "tomorrow", "thisWeek", "thisWeekend", "thisMonth"]).optional();
const optionalTextSchema = z.string().trim().max(120, "Search query must be 120 characters or less").optional();
const locationTextSchema = z.string().trim().max(120, "Filter value must be 120 characters or less").optional();

const booleanQuerySchema = z
  .preprocess((value) => {
    if (value === true || value === "true" || value === 1 || value === "1") {
      return true;
    }

    if (value === false || value === "false" || value === 0 || value === "0") {
      return false;
    }

    return undefined;
  }, z.boolean().optional());

export const publicEventDiscoveryQuerySchema = z
  .object({
    page: positivePageSchema,
    limit: publicLimitSchema,
    search: optionalTextSchema,
    category: locationTextSchema,
    city: locationTextSchema,
    state: locationTextSchema,
    country: locationTextSchema,
    venue: locationTextSchema,
    dateFilter: publicDateFilterSchema,
    dateFrom: z.coerce.date().optional(),
    dateTo: z.coerce.date().optional(),
    sort: publicSortSchema,
    featured: booleanQuerySchema,
    trending: booleanQuerySchema,
  })
  .strict();
