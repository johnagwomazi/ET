import { HTTP_STATUS } from "../constants/httpStatus.constants.js";
import { ACCOUNT_STATUS } from "../constants/accountStatus.constants.js";
import { ORGANIZATION_PERMISSIONS } from "../constants/organizationPermissions.constants.js";
import { USER_ROLES } from "../constants/roles.constants.js";
import * as authRepository from "../repositories/auth.repository.js";
import * as organizationRepository from "../repositories/organization.repository.js";
import * as userRepository from "../repositories/user.repository.js";
import { buildPaginationMeta, buildPaginationOptions, escapeRegex } from "../utils/query.util.js";
import { hashPassword } from "../utils/password.util.js";
import { generateSecureToken, hashToken } from "../utils/token.util.js";
import { canManageOrganizationMember, hasOrganizationPermission } from "../utils/organizationPermission.util.js";
import { mapUserResponse } from "../utils/userResponse.util.js";

const ORGANIZATION_MEMBER_ROLES = [
  USER_ROLES.ADMIN,
  USER_ROLES.MANAGER,
  USER_ROLES.CUSTOMER,
];

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

function buildMemberResponse(memberDocument, organization) {
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
  };
}

function deriveNameFromEmail(email) {
  const localPart = email.split("@")[0] || "member";
  const normalizedParts = localPart
    .replace(/[._-]+/g, " ")
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean);

  if (normalizedParts.length >= 2) {
    return {
      firstName: normalizedParts[0].charAt(0).toUpperCase() + normalizedParts[0].slice(1),
      lastName: normalizedParts.slice(1).join(" "),
    };
  }

  return {
    firstName: localPart.charAt(0).toUpperCase() + localPart.slice(1),
    lastName: "Member",
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

  return {
    members: members.map((member) => buildMemberResponse(member, accessContext.organization)),
    pagination: buildPaginationMeta(totalItems, pagination),
  };
}

export async function inviteOrganizationMember(organizationId, actorUserId, payload) {
  const accessContext = await getActorAccessContext(
    actorUserId,
    organizationId,
    ORGANIZATION_PERMISSIONS.MEMBERS_INVITE
  );

  if (accessContext.error) {
    return accessContext;
  }

  const role = payload.role;

  if (!isAllowedOrganizationMemberRole(role)) {
    return {
      error: "Invalid member role",
      statusCode: HTTP_STATUS.BAD_REQUEST,
    };
  }

  const normalizedEmail = normalizeEmail(payload.email);
  const existingUser = await userRepository.findUserByEmail(normalizedEmail);

  if (existingUser) {
    if (existingUser.isDeleted) {
      return {
        error: "This user account has been deleted",
        statusCode: HTTP_STATUS.CONFLICT,
      };
    }

    if (
      existingUser.accountStatus === ACCOUNT_STATUS.SUSPENDED ||
      existingUser.accountStatus === ACCOUNT_STATUS.INACTIVE
    ) {
      return {
        error: "This user account cannot be invited in its current state",
        statusCode: HTTP_STATUS.FORBIDDEN,
      };
    }

    if (existingUser.role === USER_ROLES.SUPER_ADMIN) {
      return {
        error: "Super admin users cannot be assigned to an organization",
        statusCode: HTTP_STATUS.FORBIDDEN,
      };
    }

    const existingUserOrganizationId = getDocumentId(existingUser.organization);

    if (existingUserOrganizationId === organizationId) {
      return {
        error: "This user is already a member of your organization",
        statusCode: HTTP_STATUS.CONFLICT,
      };
    }

    if (existingUserOrganizationId && existingUserOrganizationId !== organizationId) {
      return {
        error: "This user already belongs to another organization",
        statusCode: HTTP_STATUS.FORBIDDEN,
      };
    }

    const updatedMember = await userRepository.updateUserById(existingUser._id, {
      organization: organizationId,
      role,
    });

    return {
      member: buildMemberResponse(updatedMember, accessContext.organization),
    };
  }

  const emailAlreadyUsed = await authRepository.isEmailAlreadyUsed(normalizedEmail);

  if (emailAlreadyUsed) {
    return {
      error: "Email is already in use",
      statusCode: HTTP_STATUS.CONFLICT,
    };
  }

  const { firstName, lastName } = deriveNameFromEmail(normalizedEmail);
  const temporaryPassword = generateSecureToken();
  const emailVerificationToken = generateSecureToken();

  const newMember = await userRepository.createUser({
    firstName,
    lastName,
    email: normalizedEmail,
    password: await hashPassword(temporaryPassword),
    role,
    organization: organizationId,
    isEmailVerified: false,
    accountStatus: ACCOUNT_STATUS.PENDING_VERIFICATION,
    emailVerification: {
      tokenHash: hashToken(emailVerificationToken),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      verifiedAt: null,
    },
    passwordReset: {
      tokenHash: null,
      expiresAt: null,
    },
  });

  return {
    member: buildMemberResponse(newMember, accessContext.organization),
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

  const updatedMember = await userRepository.updateOrganizationMemberByIdAndOrganization(memberId, organizationId, {
    organization: null,
    role: USER_ROLES.CUSTOMER,
  });

  return {
    member: buildMemberResponse(updatedMember, accessContext.organization),
  };
}
