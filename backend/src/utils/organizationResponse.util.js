import { mapUserResponse } from "./userResponse.util.js";
import { normalizeOrganizationStatus } from "./organizationStatus.util.js";

function sanitizeOrganizationPrimaryAdmin(organization) {
  if (!organization || !organization.primaryAdmin) {
    return organization;
  }

  organization.primaryAdmin = mapUserResponse(organization.primaryAdmin);
  return organization;
}

export function mapOrganizationResponse(organizationDocument) {
  if (!organizationDocument) {
    return null;
  }

  const organization = typeof organizationDocument.toObject === "function"
    ? organizationDocument.toObject()
    : organizationDocument;

  const response = { ...organization };
  response.status = normalizeOrganizationStatus(response.status);
  delete response.payoutDetails;
  delete response.financeLock;
  return sanitizeOrganizationPrimaryAdmin(response);
}

export function mapOrganizationProfileResponse(organizationDocument) {
  const organization = mapOrganizationResponse(organizationDocument);

  if (!organization) {
    return null;
  }

  delete organization.__v;
  delete organization.isDeleted;
  delete organization.deletedAt;
  delete organization.deletedBy;

  return organization;
}

export function mapOrganizationSettingsResponse(organizationDocument) {
  const organization = mapOrganizationResponse(organizationDocument);

  if (!organization) {
    return null;
  }

  return {
    socialLinks: organization.socialLinks || {},
    updatedAt: organization.updatedAt || null,
  };
}
