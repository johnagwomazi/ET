import { z } from "zod";
import { ACCOUNT_STATUS } from "../constants/accountStatus.constants.js";
import { USER_ROLES } from "../constants/roles.constants.js";
import { adminLoginSchema } from "./auth.validator.js";

const objectIdSchema = z.string().trim().min(1, "ID is required");
const pageSchema = z.coerce.number().int().positive().optional();
const limitSchema = z.coerce.number().int().positive().max(1000).optional();
const sortOrderSchema = z.enum(["asc", "desc"]).optional();
const urlOrEmptySchema = z.union([z.string().trim().url("Please provide a valid URL"), z.literal("")]).optional();
const logoSchema = z
  .object({
    url: z.string().trim().url("Please provide a valid URL").optional(),
    publicId: z.string().trim().min(1, "Public ID is required").optional(),
  })
  .strict()
  .optional();
const socialLinksSchema = z
  .object({
    website: urlOrEmptySchema,
    facebook: urlOrEmptySchema,
    instagram: urlOrEmptySchema,
    x: urlOrEmptySchema,
    linkedin: urlOrEmptySchema,
  })
  .strict()
  .optional();
const organizationMemberRoleSchema = z.enum([
  USER_ROLES.ADMIN,
  USER_ROLES.MANAGER,
  USER_ROLES.CUSTOMER,
]);
const organizationMemberAccountStatusSchema = z.enum([
  ACCOUNT_STATUS.ACTIVE,
  ACCOUNT_STATUS.INACTIVE,
  ACCOUNT_STATUS.SUSPENDED,
  ACCOUNT_STATUS.PENDING_VERIFICATION,
]);

export const organizationListQuerySchema = z.object({
  search: z.string().trim().optional(),
  status: z.string().trim().optional(),
  page: pageSchema,
  limit: limitSchema,
  sortBy: z.string().trim().optional(),
  sortOrder: sortOrderSchema,
});

export const userListQuerySchema = z.object({
  search: z.string().trim().optional(),
  role: z.string().trim().optional(),
  status: z.string().trim().optional(),
  page: pageSchema,
  limit: limitSchema,
  sortBy: z.string().trim().optional(),
  sortOrder: sortOrderSchema,
});

export const organizationIdParamSchema = z.object({
  organizationId: objectIdSchema,
});

export const userIdParamSchema = z.object({
  userId: objectIdSchema,
});

export const rejectOrganizationBodySchema = z.object({
  rejectionReason: z.string().trim().min(1, "Rejection reason is required"),
});

export const suspendOrganizationBodySchema = z.object({
  suspensionReason: z.string().trim().min(1, "Suspension reason is required"),
});

export const reactivateOrganizationSchema = z.object({});

export const suspendUserSchema = z.object({
  suspensionReason: z.string().trim().min(1, "Suspension reason is required"),
});

export const reactivateUserSchema = z.object({});

export const organizationProfileUpdateSchema = z
  .object({
    organizationName: z.string().trim().min(1, "Organization name is required").max(120).optional(),
    businessEmail: z.string().trim().email("Please provide a valid email").optional(),
    businessPhone: z.string().trim().min(1, "Business phone is required").max(30).optional(),
    website: urlOrEmptySchema,
    address: z.string().trim().max(255, "Address must be 255 characters or less").optional(),
    logo: logoSchema,
  })
  .strict();

export const organizationSettingsUpdateSchema = z
  .object({
    socialLinks: socialLinksSchema,
  })
  .strict();

export const organizationMemberListQuerySchema = z.object({
  search: z.string().trim().optional(),
  role: organizationMemberRoleSchema.optional(),
  status: organizationMemberAccountStatusSchema.optional(),
  page: pageSchema,
  limit: limitSchema,
  sortBy: z.string().trim().optional(),
  sortOrder: sortOrderSchema,
});

export const organizationMemberIdParamSchema = z.object({
  memberId: objectIdSchema,
});

export const organizationMemberInviteSchema = z
  .object({
    email: z.string().trim().min(1, "Email is required").email("Please provide a valid email"),
    role: organizationMemberRoleSchema,
  })
  .strict();

export const organizationMemberRoleUpdateSchema = z
  .object({
    role: organizationMemberRoleSchema,
  })
  .strict();

export { adminLoginSchema };
