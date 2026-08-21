import { z } from "zod";
import { EVENT_STATUS } from "../constants/eventStatus.constants.js";

const urlOrEmptySchema = z.union([z.string().trim().url("Please provide a valid URL"), z.literal("")]).optional();
const mongoIdSchema = z.string().trim().regex(/^[0-9a-fA-F]{24}$/, "Invalid event id");
const mongoUserIdSchema = z.string().trim().regex(/^[0-9a-fA-F]{24}$/, "Invalid user id");

export const eventStatusSchema = z.enum(Object.values(EVENT_STATUS));
export const eventIdParamSchema = z
  .object({
    eventId: mongoIdSchema,
  })
  .strict();

export const eventManagerIdParamSchema = z
  .object({
    eventId: mongoIdSchema,
    userId: mongoUserIdSchema,
  })
  .strict();

export const eventManagerAssignSchema = z
  .object({
    userId: mongoUserIdSchema,
  })
  .strict();

export const eventBannerSchema = z
  .object({
    url: urlOrEmptySchema,
    publicId: z.string().trim().min(1, "Public ID is required").optional(),
  })
  .strict()
  .optional();

export const eventAddressSchema = z
  .object({
    line1: z.string().trim().min(1, "Address line 1 is required").optional(),
    line2: z.string().trim().optional(),
    city: z.string().trim().min(1, "City is required").optional(),
    state: z.string().trim().optional(),
    country: z.string().trim().min(1, "Country is required").optional(),
    postalCode: z.string().trim().optional(),
  })
  .strict()
  .optional();

export const eventVenueSchema = z
  .object({
    name: z.string().trim().min(1, "Venue name is required").optional(),
    address: eventAddressSchema,
    notes: z.string().trim().max(500, "Venue notes must be 500 characters or less").optional(),
  })
  .strict()
  .optional();

const eventNameSchema = z.string().trim().min(1, "Event name is required").max(120, "Event name must be 120 characters or less");
const descriptionSchema = z.string().trim().max(5000, "Description must be 5000 characters or less").optional();
const categorySchema = z.string().trim().max(80, "Category must be 80 characters or less").optional();
const slugSchema = z.string().trim().min(1, "Slug is required").max(160, "Slug must be 160 characters or less").optional();
const capacitySchema = z.coerce.number().int().min(0, "Capacity cannot be negative");
const startAtSchema = z.coerce.date();
const endAtSchema = z.coerce.date();
const sortOrderSchema = z.enum(["asc", "desc"]).optional();
const sortBySchema = z.enum(["createdAt", "updatedAt", "startAt", "endAt", "eventName", "status"]).optional();
const lifecycleReasonSchema = z.string().trim().min(1, "Reason is required").max(500, "Reason must be 500 characters or less");

function isValidLifecycleDateRange(data) {
  if (!data.newStartDateTime || !data.newEndDateTime) {
    return true;
  }

  return data.newEndDateTime > data.newStartDateTime;
}

export const eventListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    sortBy: sortBySchema,
    sortOrder: sortOrderSchema,
    search: z.string().trim().max(120, "Search query must be 120 characters or less").optional(),
    status: eventStatusSchema.optional(),
  })
  .strict();

export const eventHistoryQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  })
  .strict();

export const eventManagerListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  })
  .strict();

export const eventCreateSchema = z
  .object({
    eventName: eventNameSchema,
    slug: slugSchema,
    description: descriptionSchema,
    category: categorySchema,
    banner: eventBannerSchema,
    venue: eventVenueSchema,
    startAt: startAtSchema,
    endAt: endAtSchema,
    capacity: capacitySchema,
  })
  .strict()
  .refine((data) => data.endAt > data.startAt, {
    message: "End date and time must be after start date and time",
    path: ["endAt"],
  });

export const eventPostponeSchema = z
  .object({
    reason: lifecycleReasonSchema,
    newStartDateTime: startAtSchema,
    newEndDateTime: endAtSchema,
  })
  .strict()
  .refine(isValidLifecycleDateRange, {
    message: "New end date and time must be after new start date and time",
    path: ["newEndDateTime"],
  });

export const eventCancelSchema = z
  .object({
    reason: lifecycleReasonSchema,
  })
  .strict();

export const eventCompleteSchema = z
  .object({})
  .strict();

export const eventUpdateSchema = z
  .object({
    eventName: eventNameSchema.optional(),
    slug: slugSchema,
    description: descriptionSchema,
    category: categorySchema,
    banner: eventBannerSchema,
    venue: eventVenueSchema,
    capacity: capacitySchema.optional(),
  })
  .strict();
