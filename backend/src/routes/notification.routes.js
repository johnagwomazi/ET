import express from "express";
import * as notificationController from "../controllers/notification.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  notificationIdParamSchema,
  notificationListQuerySchema,
} from "../validators/notification.validator.js";

const notificationRouter = express.Router();

notificationRouter.use(protectRoute);
notificationRouter.get("/", validate(notificationListQuerySchema, "query"), notificationController.listNotifications);
notificationRouter.get("/unread-count", notificationController.getUnreadCount);
notificationRouter.patch("/read-all", notificationController.markAllNotificationsRead);
notificationRouter.patch(
  "/:notificationId/read",
  validate(notificationIdParamSchema, "params"),
  notificationController.markNotificationRead
);

export default notificationRouter;
