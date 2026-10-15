import express from "express";
import * as couponController from "../controllers/coupon.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";
import { requireOrganizationContext } from "../middleware/organization.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { USER_ROLES } from "../constants/roles.constants.js";
import {
  couponCreateSchema,
  couponIdParamSchema,
  couponListQuerySchema,
} from "../validators/coupon.validator.js";

const couponRouter = express.Router();

couponRouter.use(protectRoute);

couponRouter.get("/rewards", authorizeRoles(USER_ROLES.CUSTOMER), couponController.listCustomerRewards);

couponRouter.post(
  "/platform",
  authorizeRoles(USER_ROLES.SUPER_ADMIN),
  validate(couponCreateSchema),
  couponController.createPlatformCoupon
);
couponRouter.get(
  "/platform",
  authorizeRoles(USER_ROLES.SUPER_ADMIN),
  validate(couponListQuerySchema, "query"),
  couponController.listPlatformCoupons
);
couponRouter.get(
  "/platform/:couponId",
  authorizeRoles(USER_ROLES.SUPER_ADMIN),
  validate(couponIdParamSchema, "params"),
  couponController.getPlatformCoupon
);
couponRouter.patch(
  "/platform/:couponId/disable",
  authorizeRoles(USER_ROLES.SUPER_ADMIN),
  validate(couponIdParamSchema, "params"),
  couponController.disablePlatformCoupon
);

couponRouter.use(requireOrganizationContext);
couponRouter.use(authorizeRoles(USER_ROLES.ADMIN));

couponRouter.post(
  "/organization",
  validate(couponCreateSchema),
  couponController.createOrganizerCoupon
);
couponRouter.get(
  "/organization",
  validate(couponListQuerySchema, "query"),
  couponController.listOrganizerCoupons
);
couponRouter.get(
  "/organization/:couponId",
  validate(couponIdParamSchema, "params"),
  couponController.getOrganizerCoupon
);
couponRouter.patch(
  "/organization/:couponId/disable",
  validate(couponIdParamSchema, "params"),
  couponController.disableOrganizerCoupon
);

export default couponRouter;
