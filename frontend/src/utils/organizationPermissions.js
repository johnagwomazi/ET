import { ORGANIZATION_PERMISSIONS } from "../constants/organizationPermissions.constants";

export function normalizeOrganizationPermissions(permissions = []) {
  if (!Array.isArray(permissions)) {
    return [];
  }

  return [...new Set(permissions.filter(Boolean))];
}

export function hasOrganizationPermission(permissions = [], permission) {
  if (!permission) {
    return true;
  }

  return normalizeOrganizationPermissions(permissions).includes(permission);
}

export function hasAnyOrganizationPermission(permissions = [], requiredPermissions = []) {
  if (!requiredPermissions.length) {
    return true;
  }

  const normalizedPermissions = normalizeOrganizationPermissions(permissions);

  return requiredPermissions.some((permission) => normalizedPermissions.includes(permission));
}

export function getOrganizationNavigationPermissions() {
  return ORGANIZATION_PERMISSIONS;
}

