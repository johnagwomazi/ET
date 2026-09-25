import { ACCOUNT_STATUS } from "../constants/accountStatus.constants";
import { ORGANIZATION_STATUS } from "../constants/organizationStatus.constants";
import { USER_ROLES } from "../constants/roles.constants";

export function getOrganizationAvailableActions(organization) {
  if (!organization) {
    return [];
  }

  switch (organization.status) {
    case ORGANIZATION_STATUS.ACTIVE:
    case "APPROVED":
    case "PENDING":
    case "REJECTED":
      return ["view", "suspend", "delete"];
    case ORGANIZATION_STATUS.SUSPENDED:
      return ["view", "reactivate", "delete"];
    default:
      return ["view"];
  }
}

export function getUserAvailableActions(user) {
  if (!user) {
    return [];
  }

  if (user.role === USER_ROLES.SUPER_ADMIN) {
    return ["view"];
  }

  if (user.accountStatus === ACCOUNT_STATUS.SUSPENDED) {
    return ["view", "reactivate", "delete"];
  }

  return ["view", "suspend", "delete"];
}

export function canSuspendOrganization(organization) {
  return [ORGANIZATION_STATUS.ACTIVE, "APPROVED", "PENDING", "REJECTED"].includes(organization?.status);
}

export function canReactivateOrganization(organization) {
  return organization?.status === ORGANIZATION_STATUS.SUSPENDED;
}

export function canSuspendUser(user) {
  return user?.role !== USER_ROLES.SUPER_ADMIN && user?.accountStatus !== ACCOUNT_STATUS.SUSPENDED;
}

export function canReactivateUser(user) {
  return user?.role !== USER_ROLES.SUPER_ADMIN && user?.accountStatus === ACCOUNT_STATUS.SUSPENDED;
}
