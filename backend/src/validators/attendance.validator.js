import { z } from "zod";

const mongoIdSchema = z.string().trim().regex(/^[0-9a-fA-F]{24}$/, "Invalid event id");

export const attendanceEventIdParamSchema = z
  .object({
    eventId: mongoIdSchema,
  })
  .strict();

export const attendanceCreateSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(120, "Name must be 120 characters or less"),
    phone: z.string().trim().min(5, "Phone number is required").max(30, "Phone number must be 30 characters or less"),
    email: z.string().trim().email("Please provide a valid email address"),
  })
  .strict();

export const attendanceListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    search: z.string().trim().max(120, "Search query must be 120 characters or less").optional(),
  })
  .strict();

export const attendanceRecentQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(50).optional(),
  })
  .strict();
