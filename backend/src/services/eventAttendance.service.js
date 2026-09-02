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
import { buildPaginationMeta, buildPaginationOptions, escapeRegex } from "../utils/query.util.js";
import { hasOrganizationPermission } from "../utils/organizationPermission.util.js";
import { mapEventAttendanceResponse } from "../utils/eventAttendanceResponse.util.js";

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

function normalizeString(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function normalizeEmail(value) {
  return normalizeString(value).toLowerCase();
}

function canUseTransactions(dependencies) {
  return Boolean(
    dependencies?.mongoose &&
    dependencies.mongoose.connection &&
    dependencies.mongoose.connection.readyState === 1 &&
    typeof dependencies.mongoose.startSession === "function"
  );
}

async function runInTransaction(dependencies, executor) {
  if (!canUseTransactions(dependencies)) {
    return executor(null);
  }

  const session = await dependencies.mongoose.startSession();

  try {
    let result;

    await session.withTransaction(async () => {
      result = await executor(session);
    });

    return result;
  } finally {
    await session.endSession();
  }
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

async function resolveAttendanceAccess({
  actorUser,
  organization,
  organizationId,
  eventId,
  dependencies,
  session = null,
  requirePublished = false,
}) {
  const event = await dependencies.eventRepository.findEventByIdAndOrganization(eventId, organizationId, {
    session,
  });

  if (!event) {
    return {
      error: "Event not found",
      statusCode: HTTP_STATUS.NOT_FOUND,
    };
  }

  const eventOrganizationId = getDocumentId(event.organization);

  if (eventOrganizationId !== getDocumentId(organizationId)) {
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
      actorUser._id,
      {
        session,
      }
    );

    if (!assignment || !assignment.event) {
      return {
        error: "You do not have access to this resource",
        statusCode: HTTP_STATUS.FORBIDDEN,
      };
    }
  }

  if (requirePublished && event.status !== EVENT_STATUS.PUBLISHED) {
    return {
      error: "Only published events can accept attendance",
      statusCode: HTTP_STATUS.BAD_REQUEST,
    };
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

export async function recordEventAttendance(
  organizationId,
  actorUserId,
  eventId,
  payload,
  dependencies = defaultDependencies
) {
  const actorContext = await getActorContext(actorUserId, organizationId, dependencies);

  if (actorContext.error) {
    return actorContext;
  }

  try {
    return await runInTransaction(dependencies, async (session) => {
      const accessContext = await resolveAttendanceAccess({
        actorUser: actorContext.actorUser,
        organization: actorContext.organization,
        organizationId,
        eventId,
        dependencies,
        session,
        requirePublished: true,
      });

      if (accessContext.error) {
        return accessContext;
      }

      const normalizedName = normalizeString(payload.name);
      const normalizedPhone = normalizeString(payload.phone);
      const normalizedEmail = normalizeEmail(payload.email);

      const existingAttendance = await dependencies.eventAttendanceRepository.findAttendanceByEventAndEmail(
        eventId,
        normalizedEmail,
        {
          session,
        }
      );

      if (existingAttendance) {
        return {
          error: "This attendee is already checked in",
          statusCode: HTTP_STATUS.CONFLICT,
        };
      }

      const currentAttendanceCount = await dependencies.eventAttendanceRepository.countAttendanceByEvent(eventId, {
        session,
      });

      if (
        Number.isFinite(Number(accessContext.event.capacity)) &&
        currentAttendanceCount >= Number(accessContext.event.capacity)
      ) {
        return {
          error: "Event capacity has been reached",
          statusCode: HTTP_STATUS.CONFLICT,
        };
      }

      const attendance = await dependencies.eventAttendanceRepository.createEventAttendance(
        {
          event: eventId,
          organization: organizationId,
          attendeeName: normalizedName,
          attendeePhone: normalizedPhone,
          attendeeEmail: normalizedEmail,
          checkedInBy: actorUserId,
          checkedInAt: new Date(),
        },
        {
          session,
        }
      );

      const createdAttendance = await dependencies.eventAttendanceRepository.findAttendanceByEventAndEmail(
        eventId,
        normalizedEmail,
        {
          session,
        }
      );

      return {
        attendance: mapEventAttendanceResponse(createdAttendance || attendance),
        totalAttendees: currentAttendanceCount + 1,
      };
    });
  } catch (error) {
    if (error?.code === 11000) {
      return {
        error: "This attendee is already checked in",
        statusCode: HTTP_STATUS.CONFLICT,
      };
    }

    return {
      error: "Something went wrong",
      statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    };
  }
}

export async function getEventAttendance(organizationId, actorUserId, eventId, query, dependencies = defaultDependencies) {
  const actorContext = await getActorContext(actorUserId, organizationId, dependencies);

  if (actorContext.error) {
    return actorContext;
  }

  const accessContext = await resolveAttendanceAccess({
    actorUser: actorContext.actorUser,
    organization: actorContext.organization,
    organizationId,
    eventId,
    dependencies,
    requirePublished: false,
  });

  if (accessContext.error) {
    return accessContext;
  }

  const pagination = buildPaginationOptions(query, {
    page: 1,
    limit: 20,
    sortBy: "checkedInAt",
    sortOrder: -1,
  });
  const filter = await buildAttendanceFilter(eventId, query, dependencies);

  const [attendanceRecords, totalItems] = await Promise.all([
    dependencies.eventAttendanceRepository.findEventAttendance(filter, pagination),
    dependencies.eventAttendanceRepository.countEventAttendance(filter),
  ]);

  return {
    attendance: attendanceRecords.map(mapEventAttendanceResponse),
    totalAttendees: totalItems,
    pagination: buildPaginationMeta(totalItems, pagination),
  };
}

export async function getRecentEventAttendance(
  organizationId,
  actorUserId,
  eventId,
  query = {},
  dependencies = defaultDependencies
) {
  const result = await getEventAttendance(
    organizationId,
    actorUserId,
    eventId,
    { page: 1, limit: query.limit || 20 },
    dependencies
  );

  if (result.error) {
    return result;
  }

  return {
    recentCheckIns: result.attendance,
    totalAttendees: result.totalAttendees,
  };
}

export async function getEventAttendanceCount(
  organizationId,
  actorUserId,
  eventId,
  dependencies = defaultDependencies
) {
  const actorContext = await getActorContext(actorUserId, organizationId, dependencies);

  if (actorContext.error) {
    return actorContext;
  }

  const accessContext = await resolveAttendanceAccess({
    actorUser: actorContext.actorUser,
    organization: actorContext.organization,
    organizationId,
    eventId,
    dependencies,
    requirePublished: false,
  });

  if (accessContext.error) {
    return accessContext;
  }

  const totalAttendees = await dependencies.eventAttendanceRepository.countAttendanceByEvent(eventId);

  return {
    totalAttendees,
  };
}
