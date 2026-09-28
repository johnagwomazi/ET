import envConfig from "../config/env.config.js";
import { HTTP_STATUS } from "../constants/httpStatus.constants.js";
import { EVENT_STATUS } from "../constants/eventStatus.constants.js";
import { ACCOUNT_STATUS } from "../constants/accountStatus.constants.js";
import { ORGANIZATION_PERMISSIONS } from "../constants/organizationPermissions.constants.js";
import { USER_ROLES } from "../constants/roles.constants.js";
import * as authRepository from "../repositories/auth.repository.js";
import * as eventManagerAssignmentRepository from "../repositories/eventManagerAssignment.repository.js";
import * as eventRepository from "../repositories/event.repository.js";
import * as organizationInvitationRepository from "../repositories/organizationInvitation.repository.js";
import { ORGANIZATION_INVITATION_STATUS } from "../models/organizationInvitation.model.js";
import * as organizationRepository from "../repositories/organization.repository.js";
import * as userRepository from "../repositories/user.repository.js";
import { buildPaginationMeta, buildPaginationOptions, escapeRegex } from "../utils/query.util.js";
import { generateSecureToken, hashToken } from "../utils/token.util.js";
import { canManageOrganizationMember, hasOrganizationPermission } from "../utils/organizationPermission.util.js";
import { mapUserResponse } from "../utils/userResponse.util.js";
import * as emailService from "./email.service.js";
import * as eventManagerService from "./eventManager.service.js";

const ORGANIZATION_MEMBER_ROLES = [
  USER_ROLES.ADMIN,
  USER_ROLES.MANAGER,
  USER_ROLES.CUSTOMER,
];

const ASSIGNABLE_EVENT_STATUSES = new Set([
  EVENT_STATUS.DRAFT,
  EVENT_STATUS.PUBLISHED,
  EVENT_STATUS.POSTPONED,
]);
const INVITATION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

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

function normalizeEmail(email) {
  if (!email) {
    return "";
  }

  return email.trim().toLowerCase();
}

function isAllowedOrganizationMemberRole(role) {
  return ORGANIZATION_MEMBER_ROLES.includes(role);
}

function buildMemberFilter(organizationId, query = {}) {
  const filter = {
    organization: organizationId,
    isDeleted: false,
  };

  if (query.role) {
    filter.role = query.role;
  }

  if (query.status) {
    filter.accountStatus = query.status;
  }

  if (query.search) {
    const searchExpression = new RegExp(escapeRegex(query.search), "i");

    filter.$or = [
      { firstName: searchExpression },
      { lastName: searchExpression },
      { email: searchExpression },
    ];
  }

  return filter;
}

function buildMemberResponse(memberDocument, organization, assignedEvents = []) {
  const member = mapUserResponse(memberDocument);

  if (!member) {
    return null;
  }

  const memberId = getDocumentId(memberDocument);
  const primaryAdminId = getDocumentId(organization?.primaryAdmin);

  return {
    id: memberId,
    name: [member.firstName, member.lastName].filter(Boolean).join(" ").trim(),
    email: member.email,
    role: member.role,
    accountStatus: member.accountStatus,
    emailVerified: Boolean(member.isEmailVerified),
    joinedAt: member.createdAt || null,
    isPrimaryAdmin: Boolean(primaryAdminId && memberId === primaryAdminId),
    assignedEvents,
  };
}

async function getActorAccessContext(actorUserId, organizationId, requiredPermission) {
  const [actorUser, organization] = await Promise.all([
    authRepository.findAuthUserById(actorUserId),
    organizationRepository.findOrganizationDetailsById(organizationId),
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

export async function getOrganizationMembers(organizationId, actorUserId, query) {
  const accessContext = await getActorAccessContext(
    actorUserId,
    organizationId,
    ORGANIZATION_PERMISSIONS.MEMBERS_VIEW
  );

  if (accessContext.error) {
    return accessContext;
  }

  const pagination = buildPaginationOptions(query, {
    page: 1,
    limit: 10,
    sortBy: "createdAt",
  });
  const filter = buildMemberFilter(organizationId, query);
  const [members, totalItems] = await Promise.all([
    userRepository.findOrganizationMembers(filter, pagination),
    userRepository.countUsers(filter),
  ]);
  const managerIds = members
    .filter((member) => member.role === USER_ROLES.MANAGER)
    .map((member) => member._id);
  const assignments = managerIds.length
    ? await eventManagerAssignmentRepository.findActiveAssignmentsByUsers(managerIds)
    : [];
  const assignmentsByUser = assignments.reduce((result, assignment) => {
    const userId = getDocumentId(assignment.user);
    if (!result.has(userId)) result.set(userId, []);
    result.get(userId).push({
      id: getDocumentId(assignment.event),
      eventName: assignment.event?.eventName || "Untitled event",
      status: assignment.event?.status || null,
      startAt: assignment.event?.startAt || null,
      endAt: assignment.event?.endAt || null,
    });
    return result;
  }, new Map());

  return {
    members: members.map((member) => buildMemberResponse(
      member,
      accessContext.organization,
      assignmentsByUser.get(getDocumentId(member)) || []
    )),
    pagination: buildPaginationMeta(totalItems, pagination),
  };
}

async function validateAssignmentEvents(organizationId, eventIds = []) {
  const uniqueEventIds = [...new Set(eventIds.map(String))];
  const events = await Promise.all(
    uniqueEventIds.map((eventId) => eventRepository.findEventByIdAndOrganization(eventId, organizationId))
  );

  if (events.some((event) => !event)) {
    return { error: "One or more selected events do not belong to this organization", statusCode: HTTP_STATUS.BAD_REQUEST };
  }

  if (events.some((event) => !ASSIGNABLE_EVENT_STATUSES.has(event.status))) {
    return { error: "Managers can only be assigned to draft, published, or postponed events", statusCode: HTTP_STATUS.BAD_REQUEST };
  }

  return { eventIds: uniqueEventIds, events };
}

function mapInvitation(invitation) {
  return {
    id: getDocumentId(invitation),
    email: invitation.email,
    role: invitation.role,
    expiresAt: invitation.expiresAt,
    status: invitation.status,
    organization: {
      id: getDocumentId(invitation.organization),
      name: invitation.organization?.organizationName || "Organization",
      logo: invitation.organization?.logo || {},
    },
    events: (invitation.events || []).map((event) => ({
      id: getDocumentId(event),
      eventName: event.eventName || "Untitled event",
      status: event.status,
      startAt: event.startAt,
      endAt: event.endAt,
    })),
  };
}

function validatePendingInvitation(invitation) {
  if (!invitation || invitation.status !== ORGANIZATION_INVITATION_STATUS.PENDING) {
    return { error: "This invitation is invalid or has already been used", statusCode: HTTP_STATUS.BAD_REQUEST };
  }
  if (new Date(invitation.expiresAt).getTime() <= Date.now()) {
    return { error: "This invitation has expired. Ask the organization admin for a new invitation.", statusCode: HTTP_STATUS.BAD_REQUEST };
  }
  return null;
}

export async function inviteOrganizationMember(organizationId, actorUserId, payload) {
  const accessContext = await getActorAccessContext(
    actorUserId,
    organizationId,
    ORGANIZATION_PERMISSIONS.MEMBERS_INVITE
  );
  if (accessContext.error) return accessContext;

  const role = payload.role;
  if (!isAllowedOrganizationMemberRole(role)) {
    return { error: "Invalid member role", statusCode: HTTP_STATUS.BAD_REQUEST };
  }

  const eventValidation = role === USER_ROLES.MANAGER
    ? await validateAssignmentEvents(organizationId, payload.eventIds || [])
    : { eventIds: [] };
  if (eventValidation.error) return eventValidation;
  if (role === USER_ROLES.MANAGER && eventValidation.eventIds.length === 0) {
    return { error: "Select at least one event for the manager", statusCode: HTTP_STATUS.BAD_REQUEST };
  }

  const normalizedEmail = normalizeEmail(payload.email);
  const existingUser = await userRepository.findUserByEmail(normalizedEmail);
  if (existingUser?.isDeleted) {
    return { error: "This user account has been deleted", statusCode: HTTP_STATUS.CONFLICT };
  }
  if ([ACCOUNT_STATUS.SUSPENDED, ACCOUNT_STATUS.INACTIVE].includes(existingUser?.accountStatus)) {
    return { error: "This user account cannot be invited in its current state", statusCode: HTTP_STATUS.FORBIDDEN };
  }
  if (existingUser?.role === USER_ROLES.SUPER_ADMIN) {
    return { error: "Super admin users cannot be assigned to an organization", statusCode: HTTP_STATUS.FORBIDDEN };
  }

  const existingOrganizationId = getDocumentId(existingUser?.organization);
  if (existingOrganizationId === getDocumentId(organizationId)) {
    return { error: "This user is already a member of your organization", statusCode: HTTP_STATUS.CONFLICT };
  }
  if (existingOrganizationId) {
    return { error: "This user already belongs to another organization", statusCode: HTTP_STATUS.FORBIDDEN };
  }

  const token = generateSecureToken();
  const expiresAt = new Date(Date.now() + INVITATION_EXPIRY_MS);
  await organizationInvitationRepository.upsertPendingInvitation(
    { organization: organizationId, email: normalizedEmail },
    {
      organization: organizationId,
      email: normalizedEmail,
      role,
      events: eventValidation.eventIds,
      invitedBy: actorUserId,
      tokenHash: hashToken(token),
      expiresAt,
      status: ORGANIZATION_INVITATION_STATUS.PENDING,
      acceptedAt: null,
      acceptedBy: null,
    }
  );

  const frontendOrigin = envConfig.frontendUrl.split(",")[0]?.trim().replace(/\/$/, "");
  const invitationUrl = `${frontendOrigin}/invitations/${encodeURIComponent(token)}`;
  let delivery = { sent: false };
  try {
    delivery = await emailService.sendOrganizationInvitationEmail({
      to: normalizedEmail,
      organizationName: accessContext.organization.organizationName,
      inviterName: [accessContext.actorUser.firstName, accessContext.actorUser.lastName].filter(Boolean).join(" "),
      role,
      eventNames: (eventValidation.events || []).map((event) => event.eventName),
      invitationUrl,
      expiresAt,
    });
  } catch (error) {
    delivery = { sent: false };
  }

  return {
    invitation: { email: normalizedEmail, role, eventIds: eventValidation.eventIds, expiresAt },
    invitationEmailSent: delivery.sent === true,
  };
}

export async function getOrganizationInvitation(token) {
  const invitation = await organizationInvitationRepository.findInvitationByTokenHash(hashToken(token));
  const invitationError = validatePendingInvitation(invitation);
  if (invitationError) return invitationError;
  return { invitation: mapInvitation(invitation) };
}

export async function acceptOrganizationInvitation(token, actorUserId) {
  const invitation = await organizationInvitationRepository.findInvitationByTokenHash(hashToken(token));
  const invitationError = validatePendingInvitation(invitation);
  if (invitationError) return invitationError;

  const user = await authRepository.findAuthUserById(actorUserId);
  if (!user || user.isDeleted) {
    return { error: "Not authorized", statusCode: HTTP_STATUS.UNAUTHORIZED };
  }
  if (normalizeEmail(user.email) !== normalizeEmail(invitation.email)) {
    return { error: `Sign in with ${invitation.email} to accept this invitation`, statusCode: HTTP_STATUS.FORBIDDEN };
  }

  const userOrganizationId = getDocumentId(user.organization);
  const organizationId = getDocumentId(invitation.organization);
  if (userOrganizationId && userOrganizationId !== organizationId) {
    return { error: "This account already belongs to another organization", statusCode: HTTP_STATUS.FORBIDDEN };
  }

  const eventValidation = invitation.role === USER_ROLES.MANAGER
    ? await validateAssignmentEvents(organizationId, (invitation.events || []).map(getDocumentId))
    : { eventIds: [] };
  if (eventValidation.error) return eventValidation;

  const updatedMember = await userRepository.updateUserById(user._id, {
    organization: organizationId,
    role: invitation.role,
  });

  for (const eventId of eventValidation.eventIds) {
    const result = await eventManagerService.assignManagerToEvent(
      organizationId,
      getDocumentId(invitation.invitedBy),
      eventId,
      { userId: getDocumentId(user) }
    );
    if (result.error && result.statusCode !== HTTP_STATUS.CONFLICT) return result;
  }

  const accepted = await organizationInvitationRepository.acceptPendingInvitation(invitation._id, user._id);
  if (!accepted) {
    return { error: "This invitation is no longer available", statusCode: HTTP_STATUS.CONFLICT };
  }

  return {
    member: buildMemberResponse(updatedMember, invitation.organization, eventValidation.events?.map((event) => ({
      id: getDocumentId(event),
      eventName: event.eventName,
      status: event.status,
      startAt: event.startAt,
      endAt: event.endAt,
    })) || []),
  };
}

export async function updateManagerEventAssignments(organizationId, actorUserId, memberId, payload) {
  const accessContext = await getActorAccessContext(
    actorUserId,
    organizationId,
    ORGANIZATION_PERMISSIONS.MEMBERS_UPDATE_ROLE
  );
  if (accessContext.error) return accessContext;

  const targetMember = await userRepository.findOrganizationMemberByIdAndOrganization(memberId, organizationId);
  if (!targetMember) return { error: "Member not found", statusCode: HTTP_STATUS.NOT_FOUND };
  if (targetMember.role !== USER_ROLES.MANAGER) {
    return { error: "Event assignments are only available for managers", statusCode: HTTP_STATUS.BAD_REQUEST };
  }

  const eventValidation = await validateAssignmentEvents(organizationId, payload.eventIds || []);
  if (eventValidation.error) return eventValidation;
  const currentAssignments = await eventManagerAssignmentRepository.findManagerAssignments(memberId);
  const currentIds = new Set(currentAssignments.map((assignment) => getDocumentId(assignment.event)));
  const desiredIds = new Set(eventValidation.eventIds);

  for (const eventId of desiredIds) {
    if (!currentIds.has(eventId)) {
      const result = await eventManagerService.assignManagerToEvent(
        organizationId,
        actorUserId,
        eventId,
        { userId: memberId }
      );
      if (result.error) return result;
    }
  }
  for (const eventId of currentIds) {
    if (!desiredIds.has(eventId)) {
      const result = await eventManagerService.removeManagerFromEvent(
        organizationId,
        actorUserId,
        eventId,
        memberId
      );
      if (result.error) return result;
    }
  }

  return {
    member: buildMemberResponse(targetMember, accessContext.organization, eventValidation.events.map((event) => ({
      id: getDocumentId(event),
      eventName: event.eventName,
      status: event.status,
      startAt: event.startAt,
      endAt: event.endAt,
    }))),
  };
}

export async function updateOrganizationMemberRole(organizationId, actorUserId, memberId, payload) {
  const accessContext = await getActorAccessContext(
    actorUserId,
    organizationId,
    ORGANIZATION_PERMISSIONS.MEMBERS_UPDATE_ROLE
  );

  if (accessContext.error) {
    return accessContext;
  }

  if (!isAllowedOrganizationMemberRole(payload.role)) {
    return {
      error: "Invalid member role",
      statusCode: HTTP_STATUS.BAD_REQUEST,
    };
  }

  const targetMember = await userRepository.findOrganizationMemberByIdAndOrganization(memberId, organizationId);

  if (!targetMember) {
    return {
      error: "Member not found",
      statusCode: HTTP_STATUS.NOT_FOUND,
    };
  }

  if (!canManageOrganizationMember(accessContext.actorUser, targetMember, accessContext.organization)) {
    return {
      error: "You cannot modify this member",
      statusCode: HTTP_STATUS.FORBIDDEN,
    };
  }

  if (targetMember.role === USER_ROLES.MANAGER && payload.role !== USER_ROLES.MANAGER) {
    await eventManagerAssignmentRepository.deactivateManagerAssignments(memberId, actorUserId);
  }

  const updatedMember = await userRepository.updateOrganizationMemberByIdAndOrganization(memberId, organizationId, {
    role: payload.role,
  });

  return {
    member: buildMemberResponse(updatedMember, accessContext.organization),
  };
}

export async function removeOrganizationMember(organizationId, actorUserId, memberId) {
  const accessContext = await getActorAccessContext(
    actorUserId,
    organizationId,
    ORGANIZATION_PERMISSIONS.MEMBERS_REMOVE
  );

  if (accessContext.error) {
    return accessContext;
  }

  const targetMember = await userRepository.findOrganizationMemberByIdAndOrganization(memberId, organizationId);

  if (!targetMember) {
    return {
      error: "Member not found",
      statusCode: HTTP_STATUS.NOT_FOUND,
    };
  }

  if (!canManageOrganizationMember(accessContext.actorUser, targetMember, accessContext.organization)) {
    return {
      error: "You cannot modify this member",
      statusCode: HTTP_STATUS.FORBIDDEN,
    };
  }

  if (targetMember.role === USER_ROLES.MANAGER) {
    await eventManagerAssignmentRepository.deactivateManagerAssignments(memberId, actorUserId);
  }

  const updatedMember = await userRepository.updateOrganizationMemberByIdAndOrganization(memberId, organizationId, {
    organization: null,
    role: USER_ROLES.CUSTOMER,
  });

  return {
    member: buildMemberResponse(updatedMember, accessContext.organization),
  };
}
