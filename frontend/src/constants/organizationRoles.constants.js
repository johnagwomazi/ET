import { ORGANIZATION_PERMISSIONS } from "./organizationPermissions.constants";
import { USER_ROLES } from "./roles.constants";

export const ORGANIZATION_ROLE_ORDER = [USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.CUSTOMER];

export const ORGANIZATION_ROLE_DEFINITIONS = {
  [USER_ROLES.ADMIN]: {
    key: USER_ROLES.ADMIN,
    label: "Admin",
    description: "Full organization administration",
    systemRole: true,
    permissions: [
      ORGANIZATION_PERMISSIONS.ORGANIZATION_CONTEXT_VIEW,
      ORGANIZATION_PERMISSIONS.ORGANIZATION_VIEW,
      ORGANIZATION_PERMISSIONS.ORGANIZATION_UPDATE,
      ORGANIZATION_PERMISSIONS.DASHBOARD_VIEW,
      ORGANIZATION_PERMISSIONS.SETTINGS_VIEW,
      ORGANIZATION_PERMISSIONS.SETTINGS_UPDATE,
      ORGANIZATION_PERMISSIONS.MEMBERS_VIEW,
      ORGANIZATION_PERMISSIONS.MEMBERS_INVITE,
      ORGANIZATION_PERMISSIONS.MEMBERS_UPDATE_ROLE,
      ORGANIZATION_PERMISSIONS.MEMBERS_REMOVE,
    ],
  },
  [USER_ROLES.MANAGER]: {
    key: USER_ROLES.MANAGER,
    label: "Manager",
    description: "Organization management permissions",
    systemRole: true,
    permissions: [
      ORGANIZATION_PERMISSIONS.ORGANIZATION_CONTEXT_VIEW,
      ORGANIZATION_PERMISSIONS.ORGANIZATION_VIEW,
      ORGANIZATION_PERMISSIONS.DASHBOARD_VIEW,
      ORGANIZATION_PERMISSIONS.SETTINGS_VIEW,
      ORGANIZATION_PERMISSIONS.MEMBERS_VIEW,
    ],
  },
  [USER_ROLES.CUSTOMER]: {
    key: USER_ROLES.CUSTOMER,
    label: "Customer",
    description: "Limited organization access",
    systemRole: true,
    permissions: [ORGANIZATION_PERMISSIONS.ORGANIZATION_CONTEXT_VIEW],
  },
};

export const ORGANIZATION_PERMISSION_DEFINITIONS = {
  [ORGANIZATION_PERMISSIONS.ORGANIZATION_CONTEXT_VIEW]: {
    label: "View organization context",
    group: "Organization",
  },
  [ORGANIZATION_PERMISSIONS.ORGANIZATION_VIEW]: {
    label: "View organization",
    group: "Organization",
  },
  [ORGANIZATION_PERMISSIONS.ORGANIZATION_UPDATE]: {
    label: "Update organization",
    group: "Organization",
  },
  [ORGANIZATION_PERMISSIONS.DASHBOARD_VIEW]: {
    label: "View dashboard",
    group: "Dashboard",
  },
  [ORGANIZATION_PERMISSIONS.SETTINGS_VIEW]: {
    label: "View settings",
    group: "Settings",
  },
  [ORGANIZATION_PERMISSIONS.SETTINGS_UPDATE]: {
    label: "Update settings",
    group: "Settings",
  },
  [ORGANIZATION_PERMISSIONS.MEMBERS_VIEW]: {
    label: "View members",
    group: "Members",
  },
  [ORGANIZATION_PERMISSIONS.MEMBERS_INVITE]: {
    label: "Invite members",
    group: "Members",
  },
  [ORGANIZATION_PERMISSIONS.MEMBERS_UPDATE_ROLE]: {
    label: "Change member roles",
    group: "Members",
  },
  [ORGANIZATION_PERMISSIONS.MEMBERS_REMOVE]: {
    label: "Remove members",
    group: "Members",
  },
};

export const ORGANIZATION_PERMISSION_GROUP_ORDER = ["Organization", "Dashboard", "Settings", "Members"];

export function getOrganizationRoleDefinition(role) {
  return ORGANIZATION_ROLE_DEFINITIONS[role] || null;
}

export function getOrganizationRoleLabel(role) {
  return getOrganizationRoleDefinition(role)?.label || role || "Unknown role";
}

export function getOrganizationRoleDescription(role) {
  return getOrganizationRoleDefinition(role)?.description || "";
}

export function getOrganizationRolePermissions(role) {
  return getOrganizationRoleDefinition(role)?.permissions || [];
}

export function getOrganizationRoleOptions() {
  return ORGANIZATION_ROLE_ORDER.map((role) => {
    const definition = getOrganizationRoleDefinition(role);

    return {
      value: role,
      label: definition?.label || role,
    };
  });
}

export function getOrganizationPermissionLabel(permission) {
  return ORGANIZATION_PERMISSION_DEFINITIONS[permission]?.label || permission;
}

export function getOrganizationPermissionGroup(permission) {
  return ORGANIZATION_PERMISSION_DEFINITIONS[permission]?.group || "Other";
}

export function getGroupedOrganizationPermissions() {
  const groupedPermissions = {};

  Object.keys(ORGANIZATION_PERMISSION_DEFINITIONS).forEach((permission) => {
    const group = getOrganizationPermissionGroup(permission);

    if (!groupedPermissions[group]) {
      groupedPermissions[group] = [];
    }

    groupedPermissions[group].push(permission);
  });

  return ORGANIZATION_PERMISSION_GROUP_ORDER.map((groupName) => ({
    group: groupName,
    permissions: groupedPermissions[groupName] || [],
  })).filter((group) => group.permissions.length > 0);
}
