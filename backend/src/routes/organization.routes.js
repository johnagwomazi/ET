import express from "express";
import * as organizationController from "../controllers/organization.controller.js";
import * as ticketingController from "../controllers/ticketing.controller.js";
import * as analyticsController from "../controllers/analytics.controller.js";
import * as financeController from "../controllers/finance.controller.js";
import eventRoutes from "./event.routes.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { requireOrganizationContext, requireOrganizationRole } from "../middleware/organization.middleware.js";
import { requireOrganizationPermission } from "../middleware/organizationPermission.middleware.js";
import {
  organizationProfileUpdateSchema,
  organizationMemberIdParamSchema,
  organizationMemberInviteSchema,
  organizationMemberListQuerySchema,
  organizationMemberRoleUpdateSchema,
  organizationSettingsUpdateSchema,
} from "../validators/admin.validator.js";
import {
  orderReferenceParamSchema,
  refundCreateSchema,
} from "../validators/ticketing.validator.js";
import { ORGANIZATION_PERMISSIONS } from "../constants/organizationPermissions.constants.js";
import { USER_ROLES } from "../constants/roles.constants.js";
import createRateLimiter from "../config/rateLimit.config.js";
import envConfig from "../config/env.config.js";
import {
  organizationWithdrawalListQuerySchema,
  payoutDetailsUpdateSchema,
  withdrawalCreateSchema as financeWithdrawalCreateSchema,
} from "../validators/finance.validator.js";
import {
  analyticsEventPerformanceQuerySchema,
  analyticsOverviewQuerySchema,
  analyticsSalesQuerySchema,
  analyticsTicketTypePerformanceQuerySchema,
} from "../validators/analytics.validator.js";

const organizationRouter = express.Router();
const financeMutationLimiter = createRateLimiter({ max: envConfig.financeMutationRateLimitMax });
const paymentMutationLimiter = createRateLimiter({ max: envConfig.paymentMutationRateLimitMax });

organizationRouter.use(protectRoute);
organizationRouter.use(requireOrganizationContext);
organizationRouter.use("/me/events", eventRoutes);

organizationRouter.get(
  "/context",
  requireOrganizationPermission(ORGANIZATION_PERMISSIONS.ORGANIZATION_CONTEXT_VIEW),
  organizationController.getOrganizationContext
);

organizationRouter.get(
  "/me",
  requireOrganizationPermission(ORGANIZATION_PERMISSIONS.ORGANIZATION_VIEW),
  organizationController.getMyOrganizationProfile
);

organizationRouter.patch(
  "/me",
  requireOrganizationPermission(ORGANIZATION_PERMISSIONS.ORGANIZATION_UPDATE),
  validate(organizationProfileUpdateSchema),
  organizationController.updateMyOrganizationProfile
);

organizationRouter.get(
  "/me/settings",
  requireOrganizationPermission(ORGANIZATION_PERMISSIONS.SETTINGS_VIEW),
  organizationController.getMyOrganizationSettings
);

organizationRouter.patch(
  "/me/settings",
  requireOrganizationPermission(ORGANIZATION_PERMISSIONS.SETTINGS_UPDATE),
  validate(organizationSettingsUpdateSchema),
  organizationController.updateMyOrganizationSettings
);

organizationRouter.get(
  "/me/dashboard",
  requireOrganizationPermission(ORGANIZATION_PERMISSIONS.DASHBOARD_VIEW),
  organizationController.getMyOrganizationDashboard
);

organizationRouter.get(
  "/me/analytics/overview",
  requireOrganizationRole(USER_ROLES.ADMIN),
  requireOrganizationPermission(ORGANIZATION_PERMISSIONS.ORGANIZATION_UPDATE),
  validate(analyticsOverviewQuerySchema, "query"),
  analyticsController.getOrganizationOverview
);

organizationRouter.get(
  "/me/analytics/sales",
  requireOrganizationRole(USER_ROLES.ADMIN),
  requireOrganizationPermission(ORGANIZATION_PERMISSIONS.ORGANIZATION_UPDATE),
  validate(analyticsSalesQuerySchema, "query"),
  analyticsController.getOrganizationSales
);

organizationRouter.get(
  "/me/analytics/events",
  requireOrganizationRole(USER_ROLES.ADMIN),
  requireOrganizationPermission(ORGANIZATION_PERMISSIONS.ORGANIZATION_UPDATE),
  validate(analyticsEventPerformanceQuerySchema, "query"),
  analyticsController.getOrganizationEventPerformance
);

organizationRouter.get(
  "/me/analytics/ticket-types",
  requireOrganizationRole(USER_ROLES.ADMIN),
  requireOrganizationPermission(ORGANIZATION_PERMISSIONS.ORGANIZATION_UPDATE),
  validate(analyticsTicketTypePerformanceQuerySchema, "query"),
  analyticsController.getOrganizationTicketTypePerformance
);

organizationRouter.post(
  "/me/orders/:reference/refunds",
  paymentMutationLimiter,
  requireOrganizationPermission(ORGANIZATION_PERMISSIONS.ORGANIZATION_UPDATE),
  validate(orderReferenceParamSchema, "params"),
  validate(refundCreateSchema),
  ticketingController.createOrderRefund
);

organizationRouter.post(
  "/me/withdrawals",
  financeMutationLimiter,
  requireOrganizationRole(USER_ROLES.ADMIN),
  requireOrganizationPermission(ORGANIZATION_PERMISSIONS.SETTINGS_UPDATE),
  validate(financeWithdrawalCreateSchema),
  financeController.requestWithdrawal
);

organizationRouter.get(
  "/me/withdrawals",
  requireOrganizationRole(USER_ROLES.ADMIN),
  requireOrganizationPermission(ORGANIZATION_PERMISSIONS.SETTINGS_VIEW),
  validate(organizationWithdrawalListQuerySchema, "query"),
  financeController.getOrganizationWithdrawals
);

organizationRouter.get(
  "/me/withdrawals/balance",
  requireOrganizationRole(USER_ROLES.ADMIN),
  requireOrganizationPermission(ORGANIZATION_PERMISSIONS.SETTINGS_VIEW),
  financeController.getOrganizationFinanceSummary
);

organizationRouter.get(
  "/me/finance/summary",
  requireOrganizationRole(USER_ROLES.ADMIN),
  requireOrganizationPermission(ORGANIZATION_PERMISSIONS.SETTINGS_VIEW),
  financeController.getOrganizationFinanceSummary
);

organizationRouter.put(
  "/me/finance/payout-details",
  financeMutationLimiter,
  requireOrganizationRole(USER_ROLES.ADMIN),
  requireOrganizationPermission(ORGANIZATION_PERMISSIONS.SETTINGS_UPDATE),
  validate(payoutDetailsUpdateSchema),
  financeController.updateOrganizationPayoutDetails
);

organizationRouter.get(
  "/me/members",
  requireOrganizationPermission(ORGANIZATION_PERMISSIONS.MEMBERS_VIEW),
  validate(organizationMemberListQuerySchema, "query"),
  organizationController.getMyOrganizationMembers
);

organizationRouter.post(
  "/me/members/invite",
  requireOrganizationPermission(ORGANIZATION_PERMISSIONS.MEMBERS_INVITE),
  validate(organizationMemberInviteSchema),
  organizationController.inviteOrganizationMember
);

organizationRouter.patch(
  "/me/members/:memberId/role",
  requireOrganizationPermission(ORGANIZATION_PERMISSIONS.MEMBERS_UPDATE_ROLE),
  validate(organizationMemberIdParamSchema, "params"),
  validate(organizationMemberRoleUpdateSchema),
  organizationController.updateOrganizationMemberRole
);

organizationRouter.delete(
  "/me/members/:memberId",
  requireOrganizationPermission(ORGANIZATION_PERMISSIONS.MEMBERS_REMOVE),
  validate(organizationMemberIdParamSchema, "params"),
  organizationController.removeOrganizationMember
);

export default organizationRouter;
