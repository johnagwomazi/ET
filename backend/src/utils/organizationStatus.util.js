import {
  LEGACY_ACTIVE_ORGANIZATION_STATUSES,
  ORGANIZATION_STATUS,
} from "../constants/organizationStatus.constants.js";

export function isOrganizationActive(organization) {
  return Boolean(
    organization &&
    !organization.isDeleted &&
    (organization.status === ORGANIZATION_STATUS.ACTIVE ||
      LEGACY_ACTIVE_ORGANIZATION_STATUSES.includes(organization.status))
  );
}

export function normalizeOrganizationStatus(status) {
  return LEGACY_ACTIVE_ORGANIZATION_STATUSES.includes(status)
    ? ORGANIZATION_STATUS.ACTIVE
    : status;
}
