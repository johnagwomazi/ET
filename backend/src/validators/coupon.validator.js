import { z } from "zod";
import { COUPON_FUNDING_TYPES, COUPON_STATUS } from "../constants/coupon.constants.js";

const objectIdSchema = z.string().trim().regex(/^[0-9a-fA-F]{24}$/, "Invalid ID");
const dateSchema = z.coerce.date().optional().nullable();
const codeSchema = z
  .string()
  .trim()
  .min(4)
  .max(40)
  .regex(/^[A-Za-z0-9_-]+$/, "Coupon code may contain only letters, numbers, underscores, and hyphens")
  .transform((value) => value.toUpperCase());

export const couponIdParamSchema = z.object({ couponId: objectIdSchema }).strict();

export const couponCreateSchema = z
  .object({
    code: codeSchema.optional(),
    fundingType: z.enum(Object.values(COUPON_FUNDING_TYPES)),
    discountPercent: z.coerce.number().finite().min(1).max(100),
    eventId: objectIdSchema.optional().nullable(),
    ticketTypeIds: z.array(objectIdSchema).max(100).optional(),
    customerIds: z.array(objectIdSchema).max(100).optional(),
    startsAt: dateSchema,
    endsAt: dateSchema,
    status: z.enum(Object.values(COUPON_STATUS)).optional(),
    maxRedemptions: z.coerce.number().int().positive().optional().nullable(),
    maxRedemptionsPerCustomer: z.coerce.number().int().positive().optional().nullable(),
    rewardRule: z
      .object({
        qualifyingTicketCount: z.coerce.number().int().positive(),
        nextPurchaseOnly: z.boolean().optional(),
      })
      .strict()
      .optional()
      .nullable(),
  })
  .strict()
  .superRefine((data, context) => {
    if (data.startsAt && data.endsAt && data.endsAt <= data.startsAt) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["endsAt"], message: "End date must be after start date" });
    }
    const ticketTypeIds = data.ticketTypeIds || [];
    const customerIds = data.customerIds || [];
    if (new Set(ticketTypeIds).size !== ticketTypeIds.length) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["ticketTypeIds"], message: "Duplicate ticket types are not allowed" });
    }
    if (new Set(customerIds).size !== customerIds.length) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["customerIds"], message: "Duplicate customers are not allowed" });
    }
  });

export const couponListQuerySchema = z.object({
  status: z.enum(Object.values(COUPON_STATUS)).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
}).strict();
