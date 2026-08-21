import express from "express";
import { authorizeRoles } from "../middleware/role.middleware.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import { requireOrganizationContext } from "../middleware/organization.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { USER_ROLES } from "../constants/roles.constants.js";
import * as eventManagerController from "../controllers/eventManager.controller.js";
import * as eventAttendanceController from "../controllers/eventAttendance.controller.js";
import {
  attendanceCreateSchema,
  attendanceEventIdParamSchema,
  attendanceListQuerySchema,
} from "../validators/attendance.validator.js";
import { eventIdParamSchema, eventManagerListQuerySchema } from "../validators/event.validator.js";

const managerRouter = express.Router();

managerRouter.use(protectRoute);
managerRouter.use(authorizeRoles(USER_ROLES.MANAGER));
managerRouter.use(requireOrganizationContext);

managerRouter.get(
  "/events",
  validate(eventManagerListQuerySchema, "query"),
  eventManagerController.getManagerAssignedEvents
);

managerRouter.get(
  "/events/:eventId",
  validate(eventIdParamSchema, "params"),
  eventManagerController.getManagerAssignedEventById
);

managerRouter.post(
  "/events/:eventId/attendance",
  validate(attendanceEventIdParamSchema, "params"),
  validate(attendanceCreateSchema),
  eventAttendanceController.recordEventAttendance
);

managerRouter.get(
  "/events/:eventId/attendance",
  validate(attendanceEventIdParamSchema, "params"),
  validate(attendanceListQuerySchema, "query"),
  eventAttendanceController.getEventAttendance
);

managerRouter.get(
  "/events/:eventId/attendance/count",
  validate(attendanceEventIdParamSchema, "params"),
  eventAttendanceController.getEventAttendanceCount
);

managerRouter.get(
  "/events/:eventId/attendance/export/pdf",
  validate(attendanceEventIdParamSchema, "params"),
  eventAttendanceController.exportAttendancePdf
);

managerRouter.get(
  "/events/:eventId/attendance/export/excel",
  validate(attendanceEventIdParamSchema, "params"),
  eventAttendanceController.exportAttendanceExcel
);

export default managerRouter;
