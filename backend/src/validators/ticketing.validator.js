import crypto from "node:crypto";
import { z } from "zod";
import {
  REFUND_STATUS,
  TICKET_TYPE_STATUS,
  WITHDRAWAL_STATUS,
} from "../constants/ticketing.constants.js";

const mongoIdSchema = z.string().trim().regex(/^[0-9a-fA-F]{24}$/, "Invalid id");
const optionalDateSchema = z.union([z.coerce.date(), z.null()]).optional();
const moneySchema = z.coerce.number().finite().nonnegative().max(1000000000).multipleOf(0.01);

export const eventTicketTypeParamSchema = z.object({ eventId: mongoIdSchema }).strict();
export const ticketTypeParamSchema = z.object({ eventId: mongoIdSchema, ticketTypeId: mongoIdSchema }).strict();
export const orderReferenceParamSchema = z.object({ reference: z.string().trim().min(1).max(80) }).strict();
export const ticketReferenceParamSchema = z.object({ reference: z.string().trim().min(1).max(80) }).strict();
export const withdrawalIdParamSchema = z.object({ withdrawalId: mongoIdSchema }).strict();

export const listQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    search: z.string().trim().max(120).optional(),
  })
  .strict();

export const customerHistoryQuerySchema = listQuerySchema.extend({
  status: z.enum(["ATTENDED", "CANCELED", "REFUNDED", "COMPLETED"]).optional(),
});

export const withdrawalListQuerySchema = listQuerySchema.extend({
  status: z.enum(Object.values(WITHDRAWAL_STATUS)).optional(),
});

const ticketTypeWriteShape = {
    name: z.string().trim().min(1, "Ticket name is required").max(80),
    description: z.string().trim().max(500).optional(),
    price: moneySchema,
    currency: z.string().trim().regex(/^[A-Za-z]{3}$/, "Invalid currency").transform((value) => value.toUpperCase()).optional(),
    quantity: z.coerce.number().int().min(0, "Quantity cannot be negative"),
    saleStartsAt: optionalDateSchema,
    saleEndsAt: optionalDateSchema,
    maxPerOrder: z.coerce.number().int().min(1).max(100).optional(),
    status: z.enum(Object.values(TICKET_TYPE_STATUS)).optional(),
    position: z.coerce.number().int().min(0).optional(),
};

export const ticketTypeCreateSchema = z
  .object(ticketTypeWriteShape)
  .strict()
  .refine((data) => !data.saleStartsAt || !data.saleEndsAt || data.saleEndsAt > data.saleStartsAt, {
    message: "Sale end must be after sale start",
    path: ["saleEndsAt"],
  });

export const ticketTypeUpdateSchema = z
  .object(ticketTypeWriteShape)
  .partial()
  .strict()
  .refine((data) => !data.saleStartsAt || !data.saleEndsAt || data.saleEndsAt > data.saleStartsAt, {
    message: "Sale end must be after sale start",
    path: ["saleEndsAt"],
  });

const checkoutAttendeeSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    phone: z.string().trim().min(5).max(30),
    email: z.string().trim().email(),
  })
  .strict();

export const checkoutSchema = z
  .object({
    eventId: mongoIdSchema,
    customerInfo: checkoutAttendeeSchema,
    items: z
      .array(
        z
          .object({
            ticketTypeId: mongoIdSchema,
            quantity: z.coerce.number().int().min(1).max(100),
            attendees: z.array(checkoutAttendeeSchema).optional(),
          })
          .strict()
      )
      .min(1, "At least one ticket type is required")
      .max(20, "Too many ticket lines"),
    idempotencyKey: z.string().trim().min(8).max(120).optional(),
  })
  .strict()
  .superRefine((data, context) => {
    const ticketTypeIds = data.items.map((item) => item.ticketTypeId);
    if (new Set(ticketTypeIds).size !== ticketTypeIds.length) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: "Duplicate ticket types are not allowed", path: ["items"] });
    }

    data.items.forEach((item, index) => {
      if (item.attendees && item.attendees.length !== item.quantity) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Attendee count must match ticket quantity",
          path: ["items", index, "attendees"],
        });
      }
    });
  });

export const paymentVerifySchema = z
  .object({
    reference: z.string().trim().min(1).max(120),
  })
  .strict();

export const ticketValidationSchema = z
  .object({
    reference: z.string().trim().min(3, "Invalid ticket reference").max(120).optional(),
    token: z.string().trim().min(16, "Invalid ticket token").max(500).optional(),
  })
  .strict()
  .refine((data) => Number(Boolean(data.reference)) + Number(Boolean(data.token)) === 1, {
    message: "Provide either a ticket reference or token",
  });

export const refundCreateSchema = z
  .object({
    amount: moneySchema.min(1, "Refund amount is required").optional(),
    reason: z.string().trim().min(1, "Reason is required").max(500),
    idempotencyKey: z.string().trim().min(8).max(120).optional(),
  })
  .strict();

export const withdrawalCreateSchema = z
  .object({
    amount: moneySchema.min(1, "Withdrawal amount is required"),
  })
  .strict();

export const withdrawalRejectSchema = z
  .object({
    reason: z.string().trim().min(1, "Reason is required").max(500),
  })
  .strict();

export const withdrawalApproveSchema = z
  .object({
    recipientCode: z.string().trim().min(1).max(120).optional(),
    reason: z.string().trim().max(500).optional(),
  })
  .strict();

export const webhookSignatureSchema = z.string().optional();

export function verifyPaystackSignature(rawBody, signature, secret) {
  if (!secret || !signature || !rawBody) {
    return false;
  }

  const expected = crypto.createHmac("sha512", secret).update(rawBody).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}
