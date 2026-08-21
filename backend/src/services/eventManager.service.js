import { HTTP_STATUS } from "../constants/httpStatus.constants.js";
import { EVENT_STATUS } from "../constants/eventStatus.constants.js";
import { ORGANIZATION_PERMISSIONS } from "../constants/organizationPermissions.constants.js";
import { USER_ROLES } from "../constants/roles.constants.js";
import * as authRepository from "../repositories/auth.repository.js";
import * as eventManagerAssignmentRepository from "../repositories/eventManagerAssignment.repository.js";
import * as eventRepository from "../repositories/event.repository.js";
import * as organizationRepository from "../repositories/organization.repository.js";
import * as userRepository from "../repositories/user.repository.js";
import { buildPaginationMeta, buildPaginationOptions } from "../utils/query.util.js";
import { hasOrganizationPermission } from "../utils/organizationPermission.util.js";
import { mapEventResponse } from "../utils/eventResponse.util.js";
import {
  mapEventManagerAssignmentResponse,
  mapManagerAssignedEventResponse,
} from "../utils/eventManagerResponse.util.js";

const defaultDependencies = {
  authRepository,
  eventManagerAssignmentRepository,
  eventRepository,
  organizationRepository,
  userRepository,
};

const ACCESSIBLE_EVENT_STATUSES = new Set([
  EVENT_STATUS.DRAFT,
  EVENT_STATUS.PUBLISHED,
  EVENT_STATUS.POSTPONED,
]);

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

function normalizeLimit(value, fallback) {
  if (Number.isFinite(value) && value > 0) {
    return value;
  }

  return fallback;
}

async function getAdminEventAccessContext(actorUserId, organizationId, dependencies = defaultDependencies) {
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

  if (!hasOrganizationPermission(actorUser, ORGANIZATION_PERMISSIONS.ORGANIZATION_UPDATE, organization)) {
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

async function getManagerEventAccessContext(actorUserId, organizationId, eventId, dependencies = defaultDependencies) {
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

  if (actorUser.role !== USER_ROLES.MANAGER) {
    return {
      error: "You do not have access to this resource",
      statusCode: HTTP_STATUS.FORBIDDEN,
    };
  }

  const assignment = await dependencies.eventManagerAssignmentRepository.findActiveEventManagerAssignment(
    eventId,
    actorUserId
  );

  if (!assignment || !assignment.event) {
    return {
      error: "You do not have access to this resource",
      statusCode: HTTP_STATUS.FORBIDDEN,
    };
  }

  const eventOrganizationId = getDocumentId(assignment.event.organization);

  if (eventOrganizationId !== getDocumentId(organizationId)) {
    return {
      error: "You cannot access another organization",
      statusCode: HTTP_STATUS.FORBIDDEN,
    };
  }

  if (!ACCESSIBLE_EVENT_STATUSES.has(assignment.event.status)) {
    return {
      error: "You do not have access to this resource",
      statusCode: HTTP_STATUS.FORBIDDEN,
    };
  }

  return {
    actorUser,
    organization,
    assignment,
  };
}

function buildManagerEventListResponse(assignments, pagination) {
  return {
    events: assignments.map((assignment) => mapManagerAssignedEventResponse(assignment.event, assignment)),
    pagination,
  };
}

export async function assignManagerToEvent(organizationId, actorUserId, eventId, payload, dependencies = defaultDependencies) {
  const accessContext = await getAdminEventAccessContext(actorUserId, organizationId, dependencies);

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

  if (!ACCESSIBLE_EVENT_STATUSES.has(event.status)) {
    return {
      error: "Only draft, published, or postponed events can have managers assigned",
      statusCode: HTTP_STATUS.BAD_REQUEST,
    };
  }

  const targetManager = await dependencies.userRepository.findOrganizationMemberByIdAndOrganization(
    payload.userId,
    organizationId
  );

  if (!targetManager) {
    return {
      error: "Manager not found",
      statusCode: HTTP_STATUS.NOT_FOUND,
    };
  }

  if (targetManager.role !== USER_ROLES.MANAGER) {
    return {
      error: "Only managers can be assigned to events",
      statusCode: HTTP_STATUS.BAD_REQUEST,
    };
  }

  const existingAssignment = await dependencies.eventManagerAssignmentRepository.findActiveEventManagerAssignment(
    eventId,
    payload.userId
  );

  if (existingAssignment) {
    return {
      error: "This manager is already assigned to this event",
      statusCode: HTTP_STATUS.CONFLICT,
    };
  }

  try {
    const assignment = await dependencies.eventManagerAssignmentRepository.createEventManagerAssignment({
      event: eventId,
      user: payload.userId,
      assignedBy: actorUserId,
      assignedAt: new Date(),
    });

    const createdAssignment = await dependencies.eventManagerAssignmentRepository.findManagerAssignmentByEventAndUser(
      eventId,
      payload.userId
    );

    return {
      event: mapEventResponse(event),
      assignment: mapEventManagerAssignmentResponse(createdAssignment || assignment),
    };
  } catch (error) {
    if (error?.code === 11000) {
      return {
        error: "This manager is already assigned to this event",
        statusCode: HTTP_STATUS.CONFLICT,
      };
    }

    return {
      error: "Something went wrong",
      statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    };
  }
}

export async function removeManagerFromEvent(organizationId, actorUserId, eventId, userId, dependencies = defaultDependencies) {
  const accessContext = await getAdminEventAccessContext(actorUserId, organizationId, dependencies);

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

  const assignment = await dependencies.eventManagerAssignmentRepository.findActiveEventManagerAssignment(
    eventId,
    userId
  );

  if (!assignment) {
    return {
      error: "Manager assignment not found",
      statusCode: HTTP_STATUS.NOT_FOUND,
    };
  }

  const updatedAssignment = await dependencies.eventManagerAssignmentRepository.deactivateEventManagerAssignment(
    eventId,
    userId,
    actorUserId
  );

  return {
    event: mapEventResponse(event),
    assignment: mapEventManagerAssignmentResponse(updatedAssignment),
  };
}

export async function getEventManagers(organizationId, actorUserId, eventId, query, dependencies = defaultDependencies) {
  const accessContext = await getAdminEventAccessContext(actorUserId, organizationId, dependencies);

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

  const pagination = buildPaginationOptions(query, {
    page: 1,
    limit: 10,
    sortBy: "assignedAt",
    sortOrder: -1,
  });

  const [managers, totalItems] = await Promise.all([
    dependencies.eventManagerAssignmentRepository.findEventManagers(eventId, pagination),
    dependencies.eventManagerAssignmentRepository.countEventManagers(eventId),
  ]);

  return {
    event: mapEventResponse(event),
    managers: managers.map(mapEventManagerAssignmentResponse),
    pagination: buildPaginationMeta(totalItems, pagination),
  };
}

export async function getManagerAssignedEvents(organizationId, actorUserId, query, dependencies = defaultDependencies) {
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

  if (actorUser.role !== USER_ROLES.MANAGER) {
    return {
      error: "You do not have access to this resource",
      statusCode: HTTP_STATUS.FORBIDDEN,
    };
  }

  const pagination = buildPaginationOptions(query, {
    page: 1,
    limit: 10,
    sortBy: "assignedAt",
    sortOrder: -1,
  });

  const assignments = await dependencies.eventManagerAssignmentRepository.findManagerAssignments(actorUserId, {
    sortBy: "assignedAt",
    sortOrder: -1,
  });

  const filteredAssignments = assignments.filter((assignment) => {
    const eventOrganizationId = getDocumentId(assignment.event?.organization);

    return Boolean(
      assignment.event &&
      eventOrganizationId === getDocumentId(organizationId) &&
      ACCESSIBLE_EVENT_STATUSES.has(assignment.event.status)
    );
  });

  const totalItems = filteredAssignments.length;
  const startIndex = (pagination.page - 1) * pagination.limit;
  const paginatedAssignments = filteredAssignments.slice(startIndex, startIndex + pagination.limit);

  return buildManagerEventListResponse(paginatedAssignments, buildPaginationMeta(totalItems, pagination));
}

export async function getManagerAssignedEventById(organizationId, actorUserId, eventId, dependencies = defaultDependencies) {
  const accessContext = await getManagerEventAccessContext(actorUserId, organizationId, eventId, dependencies);

  if (accessContext.error) {
    return accessContext;
  }

  return {
    event: mapManagerAssignedEventResponse(accessContext.assignment.event, accessContext.assignment),
  };
}
