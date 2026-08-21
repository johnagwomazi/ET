import express from "express";
import * as organizationController from "../controllers/organization.controller.js";
import eventRoutes from "./event.routes.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { requireOrganizationContext } from "../middleware/organization.middleware.js";
import { requireOrganizationPermission } from "../middleware/organizationPermission.middleware.js";
import {
  organizationProfileUpdateSchema,
  organizationMemberIdParamSchema,
  organizationMemberInviteSchema,
  organizationMemberListQuerySchema,
  organizationMemberRoleUpdateSchema,
  organizationSettingsUpdateSchema,
} from "../validators/admin.validator.js";
import { ORGANIZATION_PERMISSIONS } from "../constants/organizationPermissions.constants.js";

const organizationRouter = express.Router();

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
