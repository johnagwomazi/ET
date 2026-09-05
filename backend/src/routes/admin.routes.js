import express from "express";
import * as adminController from "../controllers/admin.controller.js";
import * as organizationController from "../controllers/organization.controller.js";
import * as userController from "../controllers/user.controller.js";
import * as analyticsController from "../controllers/analytics.controller.js";
import * as financeController from "../controllers/finance.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { USER_ROLES } from "../constants/roles.constants.js";
import {
  adminLoginSchema,
  organizationIdParamSchema,
  organizationListQuerySchema,
  reactivateOrganizationSchema,
  rejectOrganizationBodySchema,
  suspendOrganizationBodySchema,
  reactivateUserSchema,
  suspendUserSchema,
  userIdParamSchema,
  userListQuerySchema,
} from "../validators/admin.validator.js";
import {
  platformWithdrawalListQuerySchema,
  withdrawalApproveSchema,
  withdrawalIdParamSchema,
  withdrawalRejectSchema,
} from "../validators/finance.validator.js";
import createRateLimiter from "../config/rateLimit.config.js";
import envConfig from "../config/env.config.js";
import {
  analyticsEventPerformanceQuerySchema,
  analyticsOrganizationPerformanceQuerySchema,
  analyticsOverviewQuerySchema,
  analyticsSalesQuerySchema,
} from "../validators/analytics.validator.js";

const adminRouter = express.Router();
const financeMutationLimiter = createRateLimiter({ max: envConfig.financeMutationRateLimitMax });
const adminLoginLimiter = createRateLimiter({ max: envConfig.authRateLimitMax, skipSuccessfulRequests: true });

adminRouter.post("/login", adminLoginLimiter, validate(adminLoginSchema), adminController.login);

adminRouter.use(protectRoute);
adminRouter.use(authorizeRoles(USER_ROLES.SUPER_ADMIN));

adminRouter.get("/dashboard/overview", adminController.getDashboardOverview);

adminRouter.get(
  "/analytics/overview",
  validate(analyticsOverviewQuerySchema, "query"),
  analyticsController.getPlatformOverview
);
adminRouter.get(
  "/analytics/sales",
  validate(analyticsSalesQuerySchema, "query"),
  analyticsController.getPlatformSales
);
adminRouter.get(
  "/analytics/events",
  validate(analyticsEventPerformanceQuerySchema, "query"),
  analyticsController.getPlatformEventPerformance
);
adminRouter.get(
  "/analytics/organizations",
  validate(analyticsOrganizationPerformanceQuerySchema, "query"),
  analyticsController.getPlatformOrganizationPerformance
);

adminRouter.get("/organizations", validate(organizationListQuerySchema, "query"), organizationController.getOrganizations);
adminRouter.get(
  "/organizations/:organizationId",
  validate(organizationIdParamSchema, "params"),
  organizationController.getOrganizationById
);
adminRouter.patch(
  "/organizations/:organizationId/approve",
  validate(organizationIdParamSchema, "params"),
  organizationController.approveOrganization
);
adminRouter.patch(
  "/organizations/:organizationId/reject",
  validate(organizationIdParamSchema, "params"),
  validate(rejectOrganizationBodySchema),
  organizationController.rejectOrganization
);
adminRouter.patch(
  "/organizations/:organizationId/suspend",
  validate(organizationIdParamSchema, "params"),
  validate(suspendOrganizationBodySchema),
  organizationController.suspendOrganization
);
adminRouter.patch(
  "/organizations/:organizationId/reactivate",
  validate(organizationIdParamSchema, "params"),
  validate(reactivateOrganizationSchema),
  organizationController.reactivateOrganization
);
adminRouter.delete(
  "/organizations/:organizationId",
  validate(organizationIdParamSchema, "params"),
  organizationController.deleteOrganization
);

adminRouter.get("/users", validate(userListQuerySchema, "query"), userController.getUsers);
adminRouter.get("/users/:userId", validate(userIdParamSchema, "params"), userController.getUserById);
adminRouter.patch(
  "/users/:userId/suspend",
  validate(userIdParamSchema, "params"),
  validate(suspendUserSchema),
  userController.suspendUser
);
adminRouter.patch(
  "/users/:userId/reactivate",
  validate(userIdParamSchema, "params"),
  validate(reactivateUserSchema),
  userController.reactivateUser
);
adminRouter.delete("/users/:userId", validate(userIdParamSchema, "params"), userController.deleteUser);

adminRouter.get(
  "/withdrawals",
  validate(platformWithdrawalListQuerySchema, "query"),
  financeController.getPlatformWithdrawals
);

adminRouter.get(
  "/withdrawals/:withdrawalId",
  validate(withdrawalIdParamSchema, "params"),
  financeController.getPlatformWithdrawalDetails
);

adminRouter.patch(
  "/withdrawals/:withdrawalId/approve",
  financeMutationLimiter,
  validate(withdrawalIdParamSchema, "params"),
  validate(withdrawalApproveSchema),
  financeController.approveWithdrawal
);

adminRouter.patch(
  "/withdrawals/:withdrawalId/reject",
  financeMutationLimiter,
  validate(withdrawalIdParamSchema, "params"),
  validate(withdrawalRejectSchema),
  financeController.rejectWithdrawal
);

adminRouter.post(
  "/withdrawals/:withdrawalId/reconcile",
  financeMutationLimiter,
  validate(withdrawalIdParamSchema, "params"),
  financeController.reconcileWithdrawal
);

export default adminRouter;
