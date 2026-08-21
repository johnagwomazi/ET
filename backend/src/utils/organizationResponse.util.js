import { mapUserResponse } from "./userResponse.util.js";

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

  return sanitizeOrganizationPrimaryAdmin(organization);
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
