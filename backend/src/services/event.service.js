import mongoose from "mongoose";
import { HTTP_STATUS } from "../constants/httpStatus.constants.js";
import { EVENT_STATUS } from "../constants/eventStatus.constants.js";
import { ORGANIZATION_PERMISSIONS } from "../constants/organizationPermissions.constants.js";
import * as authRepository from "../repositories/auth.repository.js";
import * as eventAttendanceRepository from "../repositories/eventAttendance.repository.js";
import * as eventRepository from "../repositories/event.repository.js";
import * as eventManagerAssignmentRepository from "../repositories/eventManagerAssignment.repository.js";
import * as eventStatusHistoryRepository from "../repositories/eventStatusHistory.repository.js";
import * as organizationRepository from "../repositories/organization.repository.js";
import * as notificationService from "./notification.service.js";
import { buildPaginationMeta, buildPaginationOptions, escapeRegex } from "../utils/query.util.js";
import { hasOrganizationPermission } from "../utils/organizationPermission.util.js";
import { buildEventSlug } from "../utils/event.util.js";
import { mapEventResponse } from "../utils/eventResponse.util.js";
import { mapEventStatusHistoryResponse } from "../utils/eventStatusHistoryResponse.util.js";

const defaultDependencies = {
  authRepository,
  eventAttendanceRepository,
  eventRepository,
  eventManagerAssignmentRepository,
  eventStatusHistoryRepository,
  organizationRepository,
  notificationService,
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

function isValidDateValue(value) {
  return value instanceof Date && !Number.isNaN(value.getTime());
}

function buildEventFilter(organizationId, query = {}) {
  const filter = {
    organization: organizationId,
  };

  if (query.status) {
    filter.status = query.status;
  }

  if (query.search) {
    const searchExpression = new RegExp(escapeRegex(query.search), "i");

    filter.$or = [
      { eventName: searchExpression },
      { slug: searchExpression },
      { description: searchExpression },
      { category: searchExpression },
      { "venue.name": searchExpression },
    ];
  }

  return filter;
}

function buildEventCreateData(organizationId, actorUserId, payload) {
  const eventName = normalizeString(payload.eventName);
  const providedSlug = normalizeString(payload.slug);
  const slugSource = providedSlug || eventName;

  return {
    eventName,
    slug: buildEventSlug(slugSource),
    description: payload.description || "",
    category: payload.category || "",
    banner: payload.banner || {},
    venue: payload.venue || {},
    startAt: payload.startAt,
    endAt: payload.endAt,
    capacity: payload.capacity,
    status: EVENT_STATUS.DRAFT,
    organization: organizationId,
    createdBy: actorUserId,
  };
}

function buildEventUpdateData(payload) {
  if (payload.startAt !== undefined || payload.endAt !== undefined) {
    return {
      error: "Event date and time changes must use lifecycle operations",
      statusCode: HTTP_STATUS.BAD_REQUEST,
    };
  }

  const updateData = {};

  if (payload.eventName !== undefined) {
    updateData.eventName = normalizeString(payload.eventName);
  }

  if (payload.slug !== undefined) {
    updateData.slug = buildEventSlug(payload.slug);
  } else if (payload.eventName !== undefined) {
    updateData.slug = buildEventSlug(payload.eventName);
  }

  if (payload.description !== undefined) {
    updateData.description = payload.description || "";
  }

  if (payload.category !== undefined) {
    updateData.category = payload.category || "";
  }

  if (payload.banner !== undefined) {
    updateData.banner = payload.banner;
  }

  if (payload.venue !== undefined) {
    updateData.venue = payload.venue;
  }

  if (payload.startAt !== undefined) {
    updateData.startAt = payload.startAt;
  }

  if (payload.endAt !== undefined) {
    updateData.endAt = payload.endAt;
  }

  if (payload.capacity !== undefined) {
    updateData.capacity = payload.capacity;
  }

  if (
    updateData.startAt !== undefined &&
    updateData.endAt !== undefined &&
    updateData.endAt <= updateData.startAt
  ) {
    return {
      error: "End date and time must be after start date and time",
      statusCode: HTTP_STATUS.BAD_REQUEST,
    };
  }

  return updateData;
}

function hasRequiredPublishData(event) {
  if (!event) {
    return false;
  }

  if (!normalizeString(event.eventName)) {
    return false;
  }

  if (!(event.startAt instanceof Date) || Number.isNaN(event.startAt.getTime())) {
    return false;
  }

  if (!(event.endAt instanceof Date) || Number.isNaN(event.endAt.getTime())) {
    return false;
  }

  if (event.endAt <= event.startAt) {
    return false;
  }

  if (event.capacity === undefined || event.capacity === null) {
    return false;
  }

  return Number.isFinite(Number(event.capacity));
}

function validateLifecycleReason(reason) {
  const normalizedReason = normalizeString(reason);

  if (!normalizedReason) {
    return {
      error: "Reason is required",
      statusCode: HTTP_STATUS.BAD_REQUEST,
    };
  }

  return {
    reason: normalizedReason,
  };
}

function validatePostponementPayload(payload) {
  const reasonResult = validateLifecycleReason(payload?.reason);

  if (reasonResult.error) {
    return reasonResult;
  }

  if (!isValidDateValue(payload?.newStartDateTime) || !isValidDateValue(payload?.newEndDateTime)) {
    return {
      error: "Valid new start and end date times are required",
      statusCode: HTTP_STATUS.BAD_REQUEST,
    };
  }

  if (payload.newEndDateTime <= payload.newStartDateTime) {
    return {
      error: "New end date and time must be after new start date and time",
      statusCode: HTTP_STATUS.BAD_REQUEST,
    };
  }

  return {
    reason: reasonResult.reason,
  };
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

function buildStatusHistoryRecord({
  currentEvent,
  actorUserId,
  nextStatus,
  reason = "",
  nextStartAt = null,
  nextEndAt = null,
}) {
  return {
    event: currentEvent._id,
    previousStatus: currentEvent.status,
    newStatus: nextStatus,
    reason: normalizeString(reason),
    previousStartAt: currentEvent.startAt || null,
    previousEndAt: currentEvent.endAt || null,
    newStartAt: nextStartAt,
    newEndAt: nextEndAt,
    changedBy: actorUserId || null,
    changedAt: new Date(),
  };
}

function buildLifecycleSnapshot({
  action,
  actorUserId,
  currentEvent,
  reason = "",
  nextStatus,
  nextStartAt = null,
  nextEndAt = null,
}) {
  return {
    action,
    reason: normalizeString(reason),
    performedBy: actorUserId,
    performedAt: new Date(),
    previousStatus: currentEvent.status,
    previousStartAt: currentEvent.startAt || null,
    previousEndAt: currentEvent.endAt || null,
    nextStartAt,
    nextEndAt,
    nextStatus,
  };
}

function buildLifecycleUpdateData({
  action,
  actorUserId,
  currentEvent,
  nextStatus,
  reason = "",
  nextStartAt = null,
  nextEndAt = null,
}) {
  return {
    status: nextStatus,
    ...(nextStartAt !== null ? { startAt: nextStartAt } : {}),
    ...(nextEndAt !== null ? { endAt: nextEndAt } : {}),
    lifecycle: buildLifecycleSnapshot({
      action,
      actorUserId,
      currentEvent,
      reason,
      nextStatus,
      nextStartAt,
      nextEndAt,
    }),
  };
}

function isCompletedEvent(currentEvent) {
  if (!currentEvent?.endAt) {
    return false;
  }

  const completionDeadline = new Date(currentEvent.endAt).getTime();
  return Number.isFinite(completionDeadline) && completionDeadline <= Date.now();
}

async function transitionOrganizationEvent({
  organizationId,
  actorUserId,
  eventId,
  allowedStatuses,
  nextStatus,
  action,
  failureMessage = "",
  reason = "",
  nextStartAt = null,
  nextEndAt = null,
  dependencies = defaultDependencies,
  validateCurrentEvent = null,
  validateCurrentEventMessage = "",
}) {
  const accessContext = await getEventAccessContext(
    actorUserId,
    organizationId,
    ORGANIZATION_PERMISSIONS.ORGANIZATION_UPDATE,
    dependencies
  );

  if (accessContext.error) {
    return accessContext;
  }

  try {
    const result = await runInTransaction(dependencies, async (session) => {
      const currentEvent = await dependencies.eventRepository.findEventByIdAndOrganization(eventId, organizationId, {
        session,
      });

      if (!currentEvent) {
        return {
          error: "Event not found",
          statusCode: HTTP_STATUS.NOT_FOUND,
        };
      }

      if (!allowedStatuses.includes(currentEvent.status)) {
        return {
          error: failureMessage || `Only ${allowedStatuses.map((status) => status.toLowerCase()).join(" or ")} events can be ${action.toLowerCase()}`,
          statusCode: HTTP_STATUS.BAD_REQUEST,
        };
      }

      if (validateCurrentEvent && !validateCurrentEvent(currentEvent)) {
        return {
          error: validateCurrentEventMessage || "Event is not ready for this action",
          statusCode: HTTP_STATUS.BAD_REQUEST,
        };
      }

      const updateData = buildLifecycleUpdateData({
        action,
        actorUserId,
        currentEvent,
        nextStatus,
        reason,
        nextStartAt,
        nextEndAt,
      });

      const updatedEvent = await dependencies.eventRepository.updateEventByIdAndOrganizationAndStatus(
        eventId,
        organizationId,
        currentEvent.status,
        updateData,
        { session }
      );

      if (!updatedEvent) {
        return {
          error: "Event status changed before the operation could be completed",
          statusCode: HTTP_STATUS.CONFLICT,
        };
      }

      await dependencies.eventStatusHistoryRepository.createEventStatusHistory(
        buildStatusHistoryRecord({
          currentEvent,
          actorUserId,
          nextStatus,
          reason,
          nextStartAt,
          nextEndAt,
        }),
        { session }
      );

      return {
        event: mapEventResponse(updatedEvent),
      };
    });

    if (!result?.error && result?.event) {
      await dependencies.notificationService?.sendEventLifecycleNotifications(
        result.event,
        { action, reason }
      ).catch(() => {});
    }

    return result;
  } catch (error) {
    return {
      error: "Something went wrong",
      statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    };
  }
}

async function getEventAccessContext(actorUserId, organizationId, requiredPermission, dependencies = defaultDependencies) {
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

  const actorOrganizationId = getDocumentId(actorUser.organization);

  if (actorOrganizationId !== getDocumentId(organizationId)) {
    return {
      error: "You cannot access another organization",
      statusCode: HTTP_STATUS.FORBIDDEN,
    };
  }

  if (!hasOrganizationPermission(actorUser, requiredPermission, organization)) {
    return {
      error: "You do not have access to this resource",
      statusCode: HTTP_STATUS.FORBIDDEN,
    };
  }

  return {
    actorUser,
    organization,
  };
}

function mapEventListResponse(eventDocuments) {
  return eventDocuments.map(mapEventResponse);
}

export async function getOrganizationEvents(organizationId, actorUserId, query, dependencies = defaultDependencies) {
  const accessContext = await getEventAccessContext(
    actorUserId,
    organizationId,
    ORGANIZATION_PERMISSIONS.ORGANIZATION_UPDATE,
    dependencies
  );

  if (accessContext.error) {
    return accessContext;
  }

  const pagination = buildPaginationOptions(query, {
    page: 1,
    limit: 10,
    sortBy: "createdAt",
  });
  const filter = buildEventFilter(organizationId, query);
  const [events, totalItems] = await Promise.all([
    dependencies.eventRepository.findEvents(filter, pagination),
    dependencies.eventRepository.countEvents(filter),
  ]);

  return {
    events: mapEventListResponse(events),
    pagination: buildPaginationMeta(totalItems, pagination),
  };
}

export async function getOrganizationEventById(organizationId, actorUserId, eventId, dependencies = defaultDependencies) {
  const accessContext = await getEventAccessContext(
    actorUserId,
    organizationId,
    ORGANIZATION_PERMISSIONS.ORGANIZATION_UPDATE,
    dependencies
  );

  if (accessContext.error) {
    return accessContext;
  }

  const event = await dependencies.eventRepository.findEventByIdAndOrganization(eventId, organizationId);

  if (!event) {
    return {
      error: "Event not found",
      statusCode: HTTP_STATUS.NOT_FOUND,
    };
  }

  return {
    event: mapEventResponse(event),
  };
}

export async function createOrganizationEvent(organizationId, actorUserId, payload, dependencies = defaultDependencies) {
  const accessContext = await getEventAccessContext(
    actorUserId,
    organizationId,
    ORGANIZATION_PERMISSIONS.ORGANIZATION_UPDATE,
    dependencies
  );

  if (accessContext.error) {
    return accessContext;
  }

  const createData = buildEventCreateData(organizationId, actorUserId, payload);
  const existingEvent = await dependencies.eventRepository.findEventByOrganizationAndSlug(organizationId, createData.slug);

  if (existingEvent) {
    return {
      error: "An event with this slug already exists in this organization",
      statusCode: HTTP_STATUS.CONFLICT,
    };
  }

  const event = await dependencies.eventRepository.createEvent(createData);
  const createdEvent = event?._id
    ? await dependencies.eventRepository.findEventByIdAndOrganization(event._id, organizationId)
    : event;

  return {
    event: mapEventResponse(createdEvent || event),
  };
}

export async function updateOrganizationEvent(
  organizationId,
  actorUserId,
  eventId,
  payload,
  dependencies = defaultDependencies
) {
  const accessContext = await getEventAccessContext(
    actorUserId,
    organizationId,
    ORGANIZATION_PERMISSIONS.ORGANIZATION_UPDATE,
    dependencies
  );

  if (accessContext.error) {
    return accessContext;
  }

  const currentEvent = await dependencies.eventRepository.findEventByIdAndOrganization(eventId, organizationId);

  if (!currentEvent) {
    return {
      error: "Event not found",
      statusCode: HTTP_STATUS.NOT_FOUND,
    };
  }

  const updateData = buildEventUpdateData(payload);

  if (updateData.error) {
    return updateData;
  }

  if (Object.keys(updateData).length === 0) {
    return {
      event: mapEventResponse(currentEvent),
    };
  }

  if (updateData.slug) {
    const existingEvent = await dependencies.eventRepository.findEventByOrganizationAndSlug(
      organizationId,
      updateData.slug,
      eventId
    );

    if (existingEvent) {
      return {
        error: "An event with this slug already exists in this organization",
        statusCode: HTTP_STATUS.CONFLICT,
      };
    }
  }

  const updatedEvent = await dependencies.eventRepository.updateEventByIdAndOrganization(eventId, organizationId, updateData);

  return {
    event: mapEventResponse(updatedEvent),
  };
}

export async function deleteOrganizationEvent(organizationId, actorUserId, eventId, dependencies = defaultDependencies) {
  const accessContext = await getEventAccessContext(
    actorUserId,
    organizationId,
    ORGANIZATION_PERMISSIONS.ORGANIZATION_UPDATE,
    dependencies
  );

  if (accessContext.error) {
    return accessContext;
  }

  const currentEvent = await dependencies.eventRepository.findEventByIdAndOrganization(eventId, organizationId);

  if (!currentEvent) {
    return {
      error: "Event not found",
      statusCode: HTTP_STATUS.NOT_FOUND,
    };
  }

  if (currentEvent.status !== EVENT_STATUS.DRAFT) {
    return {
      error: "Only draft events can be deleted",
      statusCode: HTTP_STATUS.BAD_REQUEST,
    };
  }

  const deletedEvent = await runInTransaction(dependencies, async (session) => {
    const eventToDelete = await dependencies.eventRepository.deleteEventByIdAndOrganization(eventId, organizationId, {
      session,
    });

    if (!eventToDelete) {
      return null;
    }

    if (dependencies.eventManagerAssignmentRepository?.deleteAssignmentsByEvent) {
      await dependencies.eventManagerAssignmentRepository.deleteAssignmentsByEvent(eventId, {
        session,
      });
    }

    if (dependencies.eventAttendanceRepository?.deleteAttendanceByEvent) {
      await dependencies.eventAttendanceRepository.deleteAttendanceByEvent(eventId, {
        session,
      });
    }

    return eventToDelete;
  });

  if (!deletedEvent) {
    return {
      error: "Event not found",
      statusCode: HTTP_STATUS.NOT_FOUND,
    };
  }

  return {
    event: mapEventResponse(deletedEvent),
  };
}

export async function publishOrganizationEvent(organizationId, actorUserId, eventId, dependencies = defaultDependencies) {
  return transitionOrganizationEvent({
    organizationId,
    actorUserId,
    eventId,
    allowedStatuses: [EVENT_STATUS.DRAFT],
    nextStatus: EVENT_STATUS.PUBLISHED,
    action: "publish",
    failureMessage: "Only draft events can be published",
    dependencies,
    validateCurrentEvent: hasRequiredPublishData,
    validateCurrentEventMessage: "Event must be fully configured before it can be published",
  });
}

export async function postponeOrganizationEvent(
  organizationId,
  actorUserId,
  eventId,
  payload,
  dependencies = defaultDependencies
) {
  const validationResult = validatePostponementPayload(payload);

  if (validationResult.error) {
    return validationResult;
  }

  return transitionOrganizationEvent({
    organizationId,
    actorUserId,
    eventId,
    allowedStatuses: [EVENT_STATUS.PUBLISHED],
    nextStatus: EVENT_STATUS.POSTPONED,
    action: "postpone",
    failureMessage: "Only published events can be postponed",
    reason: validationResult.reason,
    nextStartAt: payload.newStartDateTime,
    nextEndAt: payload.newEndDateTime,
    dependencies,
  });
}

export async function resumeOrganizationEvent(organizationId, actorUserId, eventId, dependencies = defaultDependencies) {
  return transitionOrganizationEvent({
    organizationId,
    actorUserId,
    eventId,
    allowedStatuses: [EVENT_STATUS.POSTPONED],
    nextStatus: EVENT_STATUS.PUBLISHED,
    action: "resume",
    failureMessage: "Only postponed events can be resumed",
    dependencies,
  });
}

export async function cancelOrganizationEvent(
  organizationId,
  actorUserId,
  eventId,
  payload,
  dependencies = defaultDependencies
) {
  const validationResult = validateLifecycleReason(payload?.reason);

  if (validationResult.error) {
    return validationResult;
  }

  return transitionOrganizationEvent({
    organizationId,
    actorUserId,
    eventId,
    allowedStatuses: [EVENT_STATUS.PUBLISHED, EVENT_STATUS.POSTPONED],
    nextStatus: EVENT_STATUS.CANCELED,
    action: "cancel",
    failureMessage: "Only published or postponed events can be canceled",
    reason: validationResult.reason,
    dependencies,
  });
}

export async function completeOrganizationEvent(organizationId, actorUserId, eventId, dependencies = defaultDependencies) {
  return transitionOrganizationEvent({
    organizationId,
    actorUserId,
    eventId,
    allowedStatuses: [EVENT_STATUS.PUBLISHED],
    nextStatus: EVENT_STATUS.COMPLETED,
    action: "complete",
    failureMessage: "Only published events can be completed",
    dependencies,
    validateCurrentEvent: isCompletedEvent,
    validateCurrentEventMessage: "Event cannot be completed before its scheduled end time",
  });
}

export async function getOrganizationEventHistory(
  organizationId,
  actorUserId,
  eventId,
  query,
  dependencies = defaultDependencies
) {
  const accessContext = await getEventAccessContext(
    actorUserId,
    organizationId,
    ORGANIZATION_PERMISSIONS.ORGANIZATION_UPDATE,
    dependencies
  );

  if (accessContext.error) {
    return accessContext;
  }

  const currentEvent = await dependencies.eventRepository.findEventByIdAndOrganization(eventId, organizationId);

  if (!currentEvent) {
    return {
      error: "Event not found",
      statusCode: HTTP_STATUS.NOT_FOUND,
    };
  }

  const pagination = buildPaginationOptions(query, {
    page: 1,
    limit: 20,
    sortBy: "changedAt",
    sortOrder: 1,
  });
  const filter = {
    event: eventId,
  };

  const [historyRecords, totalItems] = await Promise.all([
    dependencies.eventStatusHistoryRepository.findEventStatusHistories(filter, {
      ...pagination,
      sortBy: "changedAt",
      sortOrder: 1,
      secondarySortOrder: 1,
    }),
    dependencies.eventStatusHistoryRepository.countEventStatusHistories(filter),
  ]);

  return {
    history: historyRecords.map(mapEventStatusHistoryResponse),
    pagination: buildPaginationMeta(totalItems, pagination),
  };
}
