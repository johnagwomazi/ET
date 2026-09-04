import express from "express";
import * as eventController from "../controllers/event.controller.js";
import { ORGANIZATION_PERMISSIONS } from "../constants/organizationPermissions.constants.js";
import { requireOrganizationPermission } from "../middleware/organizationPermission.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  attendanceCreateSchema,
  attendanceEventIdParamSchema,
  attendanceListQuerySchema,
  attendanceRecentQuerySchema,
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
import * as ticketingController from "../controllers/ticketing.controller.js";
import * as analyticsController from "../controllers/analytics.controller.js";
import {
  parseMultipartEventPayload,
  uploadEventBanner,
} from "../middleware/eventBannerUpload.middleware.js";
import {
  ticketTypeCreateSchema,
  ticketTypeParamSchema,
  ticketTypeUpdateSchema,
  ticketValidationSchema,
} from "../validators/ticketing.validator.js";
import { analyticsOverviewQuerySchema } from "../validators/analytics.validator.js";

const eventRouter = express.Router({ mergeParams: true });

eventRouter.use(requireOrganizationPermission(ORGANIZATION_PERMISSIONS.ORGANIZATION_UPDATE));

eventRouter.get(
  "/",
  validate(eventListQuerySchema, "query"),
  eventController.getOrganizationEvents
);

eventRouter.post(
  "/",
  uploadEventBanner,
  parseMultipartEventPayload,
  validate(eventCreateSchema),
  eventController.createOrganizationEvent
);

eventRouter.get(
  "/:eventId/ticket-types",
  validate(eventIdParamSchema, "params"),
  ticketingController.getEventTicketTypes
);

eventRouter.post(
  "/:eventId/ticket-types",
  validate(eventIdParamSchema, "params"),
  validate(ticketTypeCreateSchema),
  ticketingController.createEventTicketType
);

eventRouter.patch(
  "/:eventId/ticket-types/:ticketTypeId",
  validate(ticketTypeParamSchema, "params"),
  validate(ticketTypeUpdateSchema),
  ticketingController.updateEventTicketType
);

eventRouter.get(
  "/:eventId/financial-summary",
  validate(eventIdParamSchema, "params"),
  ticketingController.getEventFinancialSummary
);

eventRouter.get(
  "/:eventId/analytics",
  validate(eventIdParamSchema, "params"),
  validate(analyticsOverviewQuerySchema, "query"),
  analyticsController.getEventAnalytics
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
  "/:eventId/attendance/recent",
  validate(attendanceEventIdParamSchema, "params"),
  validate(attendanceRecentQuerySchema, "query"),
  eventAttendanceController.getRecentEventAttendance
);

eventRouter.post(
  "/:eventId/tickets/validate",
  validate(eventIdParamSchema, "params"),
  validate(ticketValidationSchema),
  ticketingController.validateEventTicket
);

eventRouter.post(
  "/:eventId/tickets/check-in",
  validate(eventIdParamSchema, "params"),
  validate(ticketValidationSchema),
  ticketingController.checkInEventTicket
);

eventRouter.get(
  "/:eventId/attendance/export/pdf",
  validate(attendanceEventIdParamSchema, "params"),
  validate(attendanceListQuerySchema, "query"),
  eventAttendanceController.exportAttendancePdf
);

eventRouter.get(
  "/:eventId/attendance/export/excel",
  validate(attendanceEventIdParamSchema, "params"),
  validate(attendanceListQuerySchema, "query"),
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
  uploadEventBanner,
  parseMultipartEventPayload,
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
