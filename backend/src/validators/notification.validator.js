import { z } from "zod";
import { NOTIFICATION_DEFAULTS, NOTIFICATION_TYPE } from "../constants/notification.constants.js";

const mongoIdSchema = z.string().trim().regex(/^[0-9a-fA-F]{24}$/, "Invalid notification id");
const booleanQuerySchema = z.preprocess((value) => {
  if (value === "true" || value === true) return true;
  if (value === "false" || value === false) return false;
  return value;
}, z.boolean());

export const notificationIdParamSchema = z.object({ notificationId: mongoIdSchema }).strict();

export const notificationListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(NOTIFICATION_DEFAULTS.MAX_PAGE_SIZE).optional(),
  isRead: booleanQuerySchema.optional(),
  type: z.enum(Object.values(NOTIFICATION_TYPE)).optional(),
}).strict();
