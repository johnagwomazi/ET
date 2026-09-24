import { USER_ROLES } from "../constants/roles.constants.js";
import { isOrganizationActive } from "./organizationStatus.util.js";
import {
  ORGANIZATION_PERMISSIONS,
  ORGANIZATION_ROLE_HIERARCHY,
  ORGANIZATION_ROLE_PERMISSION_MAP,
} from "../constants/organizationPermissions.constants.js";

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

export function isOrganizationOwner(user, organization) {
  if (!user || !organization) {
    return false;
  }

  const userId = getDocumentId(user);
  const primaryAdminId = getDocumentId(organization.primaryAdmin);

  return Boolean(userId && primaryAdminId && userId === primaryAdminId);
}

export function getOrganizationRolePermissions(user, organization) {
  if (!user) {
    return [];
  }

  if (user.role === USER_ROLES.SUPER_ADMIN) {
    return [];
  }

  if (!isOrganizationActive(organization)) {
    return [];
  }

  if (isOrganizationOwner(user, organization)) {
    return Object.values(ORGANIZATION_PERMISSIONS);
  }

  return ORGANIZATION_ROLE_PERMISSION_MAP[user.role] || [];
}

export function hasOrganizationPermission(user, permission, organization) {
  return getOrganizationRolePermissions(user, organization).includes(permission);
}

export function getOrganizationRolePriority(role) {
  return ORGANIZATION_ROLE_HIERARCHY[role] || 0;
}

export function canManageOrganizationMember(actorUser, targetUser, organization) {
  if (!actorUser || !targetUser || !organization) {
    return false;
  }

  if (isOrganizationOwner(targetUser, organization)) {
    return false;
  }

  if (getDocumentId(actorUser) === getDocumentId(targetUser)) {
    return false;
  }

  if (isOrganizationOwner(actorUser, organization)) {
    return true;
  }

  return getOrganizationRolePriority(actorUser.role) >= getOrganizationRolePriority(targetUser.role);
}
