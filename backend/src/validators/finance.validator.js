import { z } from "zod";
import { DEFAULT_CURRENCY, WITHDRAWAL_STATUS } from "../constants/ticketing.constants.js";

const mongoIdSchema = z.string().trim().regex(/^[0-9a-fA-F]{24}$/, "Invalid id");
const dateSchema = z.coerce.date();

export const withdrawalIdParamSchema = z.object({ withdrawalId: mongoIdSchema }).strict();

export const withdrawalCreateSchema = z
  .object({
    amount: z.coerce.number().positive("Withdrawal amount must be greater than zero").refine(
      (value) => Math.abs(Math.round(value * 100) - value * 100) < Number.EPSILON * 100,
      "Withdrawal amount cannot have more than two decimal places"
    ),
    currency: z.literal(DEFAULT_CURRENCY).optional(),
  })
  .strict();

export const payoutDetailsUpdateSchema = z
  .object({
    accountNumber: z.string().trim().regex(/^\d{10}$/, "Account number must contain exactly 10 digits"),
    bankCode: z.string().trim().regex(/^\d{3,10}$/, "Invalid bank code"),
  })
  .strict();

export const withdrawalRejectSchema = z
  .object({ reason: z.string().trim().min(1, "Reason is required").max(500) })
  .strict();

export const withdrawalApproveSchema = z
  .object({ reason: z.string().trim().max(500).optional() })
  .strict();

const withdrawalQueryShape = {
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  status: z.enum(Object.values(WITHDRAWAL_STATUS)).optional(),
  startDate: dateSchema.optional(),
  endDate: dateSchema.optional(),
};

function withValidDateRange(schema) {
  return schema.refine((query) => !query.startDate || !query.endDate || query.startDate <= query.endDate, {
    message: "Start date must be before end date",
    path: ["startDate"],
  });
}

export const organizationWithdrawalListQuerySchema = withValidDateRange(
  z.object(withdrawalQueryShape).strict()
);

export const platformWithdrawalListQuerySchema = withValidDateRange(
  z.object({ ...withdrawalQueryShape, organizationId: mongoIdSchema.optional() }).strict()
);
