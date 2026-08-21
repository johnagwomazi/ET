import express from "express";
import * as eventController from "../controllers/event.controller.js";
import { ORGANIZATION_PERMISSIONS } from "../constants/organizationPermissions.constants.js";
import { requireOrganizationPermission } from "../middleware/organizationPermission.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  attendanceCreateSchema,
  attendanceEventIdParamSchema,
  attendanceListQuerySchema,
} from "../validators/attendance.validator.js";
import {
  eventCancelSchema,
  eventManagerAssignSchema,
  eventManagerIdParamSchema,
  eventManagerListQuerySchema,
  eventCreateSchema,
  eventCompleteSchema,
  eventIdParamSchema,
  eventHistoryQuerySchema,
  eventListQuerySchema,
  eventPostponeSchema,
  eventUpdateSchema,
} from "../validators/event.validator.js";
import * as eventManagerController from "../controllers/eventManager.controller.js";
import * as eventAttendanceController from "../controllers/eventAttendance.controller.js";

const eventRouter = express.Router({ mergeParams: true });

eventRouter.use(requireOrganizationPermission(ORGANIZATION_PERMISSIONS.ORGANIZATION_UPDATE));

eventRouter.get(
  "/",
  validate(eventListQuerySchema, "query"),
  eventController.getOrganizationEvents
);

eventRouter.post(
  "/",
  validate(eventCreateSchema),
  eventController.createOrganizationEvent
);

eventRouter.get(
  "/:eventId",
  validate(eventIdParamSchema, "params"),
  eventController.getOrganizationEventById
);

eventRouter.get(
  "/:eventId/history",
  validate(eventIdParamSchema, "params"),
  validate(eventHistoryQuerySchema, "query"),
  eventController.getOrganizationEventHistory
);

eventRouter.post(
  "/:eventId/attendance",
  validate(attendanceEventIdParamSchema, "params"),
  validate(attendanceCreateSchema),
  eventAttendanceController.recordEventAttendance
);

eventRouter.get(
  "/:eventId/attendance",
  validate(attendanceEventIdParamSchema, "params"),
  validate(attendanceListQuerySchema, "query"),
  eventAttendanceController.getEventAttendance
);

eventRouter.get(
  "/:eventId/attendance/count",
  validate(attendanceEventIdParamSchema, "params"),
  eventAttendanceController.getEventAttendanceCount
);

eventRouter.get(
  "/:eventId/attendance/export/pdf",
  validate(attendanceEventIdParamSchema, "params"),
  eventAttendanceController.exportAttendancePdf
);

eventRouter.get(
  "/:eventId/attendance/export/excel",
  validate(attendanceEventIdParamSchema, "params"),
  eventAttendanceController.exportAttendanceExcel
);

eventRouter.get(
  "/:eventId/managers",
  validate(eventIdParamSchema, "params"),
  validate(eventManagerListQuerySchema, "query"),
  eventManagerController.getEventManagers
);

eventRouter.post(
  "/:eventId/managers",
  validate(eventIdParamSchema, "params"),
  validate(eventManagerAssignSchema),
  eventManagerController.assignManagerToEvent
);

eventRouter.delete(
  "/:eventId/managers/:userId",
  validate(eventManagerIdParamSchema, "params"),
  eventManagerController.removeManagerFromEvent
);

eventRouter.patch(
  "/:eventId",
  validate(eventIdParamSchema, "params"),
  validate(eventUpdateSchema),
  eventController.updateOrganizationEvent
);

eventRouter.delete(
  "/:eventId",
  validate(eventIdParamSchema, "params"),
  eventController.deleteOrganizationEvent
);

eventRouter.post(
  "/:eventId/publish",
  validate(eventIdParamSchema, "params"),
  eventController.publishOrganizationEvent
);

eventRouter.post(
  "/:eventId/postpone",
  validate(eventIdParamSchema, "params"),
  validate(eventPostponeSchema),
  eventController.postponeOrganizationEvent
);

eventRouter.post(
  "/:eventId/resume",
  validate(eventIdParamSchema, "params"),
  eventController.resumeOrganizationEvent
);

eventRouter.post(
  "/:eventId/cancel",
  validate(eventIdParamSchema, "params"),
  validate(eventCancelSchema),
  eventController.cancelOrganizationEvent
);

eventRouter.post(
  "/:eventId/complete",
  validate(eventIdParamSchema, "params"),
  validate(eventCompleteSchema),
  eventController.completeOrganizationEvent
);

export default eventRouter;
