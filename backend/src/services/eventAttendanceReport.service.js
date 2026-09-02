import mongoose from "mongoose";
import { EVENT_STATUS } from "../constants/eventStatus.constants.js";
import { HTTP_STATUS } from "../constants/httpStatus.constants.js";
import { ORGANIZATION_PERMISSIONS } from "../constants/organizationPermissions.constants.js";
import { USER_ROLES } from "../constants/roles.constants.js";
import * as authRepository from "../repositories/auth.repository.js";
import * as eventAttendanceRepository from "../repositories/eventAttendance.repository.js";
import * as eventManagerAssignmentRepository from "../repositories/eventManagerAssignment.repository.js";
import * as eventRepository from "../repositories/event.repository.js";
import * as organizationRepository from "../repositories/organization.repository.js";
import * as ticketRepository from "../repositories/ticket.repository.js";
import { buildAttendanceExcelBuffer, buildAttendancePdfBuffer, sanitizeAttendanceFilename } from "../utils/attendanceExport.util.js";
import { buildAttendanceReportRows, buildAttendanceReportSummary } from "../utils/attendanceExport.util.js";
import { hasOrganizationPermission } from "../utils/organizationPermission.util.js";
import { escapeRegex } from "../utils/query.util.js";

const defaultDependencies = {
  authRepository,
  eventAttendanceRepository,
  eventManagerAssignmentRepository,
  eventRepository,
  organizationRepository,
  ticketRepository,
  mongoose,
};

function getDocumentId(document) {
  if (!document) {
    return null;
  }

  if (typeof document === "string") {
    return document;
  }

  if (document._id) {
    return document._id.toString();
  }

  return document.toString();
}

async function getActorContext(actorUserId, organizationId, dependencies = defaultDependencies) {
  const [actorUser, organization] = await Promise.all([
    dependencies.authRepository.findAuthUserById(actorUserId),
    dependencies.organizationRepository.findOrganizationDetailsById(organizationId),
  ]);

  if (!actorUser) {
    return {
      error: "Not authorized",
      statusCode: HTTP_STATUS.UNAUTHORIZED,
    };
  }

  if (!organization) {
    return {
      error: "Organization not found",
      statusCode: HTTP_STATUS.NOT_FOUND,
    };
  }

  if (getDocumentId(actorUser.organization) !== getDocumentId(organizationId)) {
    return {
      error: "You cannot access another organization",
      statusCode: HTTP_STATUS.FORBIDDEN,
    };
  }

  return {
    actorUser,
    organization,
  };
}

async function resolveReportAccess({
  actorUser,
  organization,
  organizationId,
  eventId,
  dependencies,
}) {
  const event = await dependencies.eventRepository.findEventByIdAndOrganization(eventId, organizationId);

  if (!event) {
    return {
      error: "Event not found",
      statusCode: HTTP_STATUS.NOT_FOUND,
    };
  }

  if (getDocumentId(event.organization) !== getDocumentId(organizationId)) {
    return {
      error: "You cannot access another organization",
      statusCode: HTTP_STATUS.FORBIDDEN,
    };
  }

  const isAdminActor = hasOrganizationPermission(actorUser, ORGANIZATION_PERMISSIONS.ORGANIZATION_UPDATE, organization);
  let assignment = null;

  if (!isAdminActor) {
    if (actorUser.role !== USER_ROLES.MANAGER) {
      return {
        error: "You do not have access to this resource",
        statusCode: HTTP_STATUS.FORBIDDEN,
      };
    }

    assignment = await dependencies.eventManagerAssignmentRepository.findActiveEventManagerAssignment(
      eventId,
      actorUser._id
    );

    if (!assignment || !assignment.event) {
      return {
        error: "You do not have access to this resource",
        statusCode: HTTP_STATUS.FORBIDDEN,
      };
    }
  }

  return {
    actorUser,
    organization,
    event,
    assignment,
  };
}

async function buildAttendanceFilter(eventId, query = {}, dependencies = defaultDependencies) {
  const filter = {
    event: eventId,
  };

  if (query.search) {
    const searchExpression = new RegExp(escapeRegex(query.search), "i");

    filter.$or = [
      { attendeeName: searchExpression },
      { attendeePhone: searchExpression },
      { attendeeEmail: searchExpression },
    ];

    if (dependencies.ticketRepository?.findTicketIdsByEventAndReference) {
      const ticketIds = await dependencies.ticketRepository.findTicketIdsByEventAndReference(
        eventId,
        query.search,
        { limit: 50 }
      );

      if (ticketIds.length > 0) {
        filter.$or.push({ ticket: { $in: ticketIds } });
      }
    }
  }

  return filter;
}

async function getAttendanceReport(organizationId, actorUserId, eventId, query = {}, dependencies = defaultDependencies) {
  const actorContext = await getActorContext(actorUserId, organizationId, dependencies);

  if (actorContext.error) {
    return actorContext;
  }

  const accessContext = await resolveReportAccess({
    actorUser: actorContext.actorUser,
    organization: actorContext.organization,
    organizationId,
    eventId,
    dependencies,
  });

  if (accessContext.error) {
    return accessContext;
  }

  const filter = await buildAttendanceFilter(eventId, query, dependencies);
  const [attendanceRecords, totalAttendees] = await Promise.all([
    dependencies.eventAttendanceRepository.findEventAttendance(filter, {
      sortBy: "checkedInAt",
      sortOrder: -1,
    }),
    dependencies.eventAttendanceRepository.countEventAttendance(filter),
  ]);

  return {
    event: accessContext.event,
    attendanceRecords,
    totalAttendees,
    summary: buildAttendanceReportSummary(accessContext.event, totalAttendees),
    rows: buildAttendanceReportRows(attendanceRecords),
  };
}

export async function exportAttendancePdf(
  organizationId,
  actorUserId,
  eventId,
  query = {},
  dependencies = defaultDependencies
) {
  const report = await getAttendanceReport(organizationId, actorUserId, eventId, query, dependencies);

  if (report.error) {
    return report;
  }

  const buffer = buildAttendancePdfBuffer(report.event, report.attendanceRecords, report.totalAttendees);

  return {
    ...report,
    buffer,
    filename: `${sanitizeAttendanceFilename(report.event.eventName)}-attendance.pdf`,
    contentType: "application/pdf",
  };
}

export async function exportAttendanceExcel(
  organizationId,
  actorUserId,
  eventId,
  query = {},
  dependencies = defaultDependencies
) {
  const report = await getAttendanceReport(organizationId, actorUserId, eventId, query, dependencies);

  if (report.error) {
    return report;
  }

  const buffer = buildAttendanceExcelBuffer(report.event, report.attendanceRecords, report.totalAttendees);

  return {
    ...report,
    buffer,
    filename: `${sanitizeAttendanceFilename(report.event.eventName)}-attendance.xlsx`,
    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  };
}
