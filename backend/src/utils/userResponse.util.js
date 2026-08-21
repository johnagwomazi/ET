function sanitizePopulatedOrganization(organization) {
  if (!organization) {
    return organization;
  }

  if (organization.primaryAdmin && typeof organization.primaryAdmin === "object") {
    delete organization.primaryAdmin.password;
    delete organization.primaryAdmin.refreshTokenHash;
    delete organization.primaryAdmin.emailVerification;
    delete organization.primaryAdmin.passwordReset;
    delete organization.primaryAdmin.previousAccountStatus;
    delete organization.primaryAdmin.deletedReason;
  }

  return organization;
}

export function mapUserResponse(userDocument) {
  if (!userDocument) {
    return null;
  }

  const user = typeof userDocument.toObject === "function" ? userDocument.toObject() : userDocument;

  delete user.password;
  delete user.refreshTokenHash;
  delete user.emailVerification;
  delete user.passwordReset;
  delete user.previousAccountStatus;

  if (user.organization && typeof user.organization === "object") {
    sanitizePopulatedOrganization(user.organization);
  }

  return user;
}
