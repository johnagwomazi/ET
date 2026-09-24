import { HTTP_STATUS } from "../constants/httpStatus.constants.js";
import { USER_ROLES } from "../constants/roles.constants.js";
import { errorResponse } from "../utils/apiResponse.js";
import * as organizationRepository from "../repositories/organization.repository.js";
import { mapOrganizationResponse } from "../utils/organizationResponse.util.js";
import { isOrganizationActive } from "../utils/organizationStatus.util.js";

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

function isSuperAdmin(user) {
  return user?.role === USER_ROLES.SUPER_ADMIN;
}

function attachOrganizationContext(req, organization) {
  req.organization = mapOrganizationResponse(organization);
  req.organizationId = getDocumentId(organization);
}

export async function requireOrganizationContext(req, res, next) {
  try {
    if (!req.user) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json(errorResponse("Not authorized"));
    }

    if (isSuperAdmin(req.user)) {
      req.organization = null;
      req.organizationId = null;
      return next();
    }

    const organizationId = getDocumentId(req.user.organization) || req.auth?.organizationId || null;

    if (!organizationId) {
      return res.status(HTTP_STATUS.FORBIDDEN).json(errorResponse("Organization access is required"));
    }

    const organization = await organizationRepository.findOrganizationDetailsById(organizationId);

    if (!organization) {
      return res.status(HTTP_STATUS.FORBIDDEN).json(errorResponse("Your organization is no longer available"));
    }

    if (!isOrganizationActive(organization)) {
      return res.status(HTTP_STATUS.FORBIDDEN).json(errorResponse("Your organization is not active"));
    }

    attachOrganizationContext(req, organization);
    return next();
  } catch (error) {
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(errorResponse("Something went wrong"));
  }
}

export function restrictToOwnOrganization(req, res, next) {
  if (!req.user) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json(errorResponse("Not authorized"));
  }

  if (isSuperAdmin(req.user)) {
    return next();
  }

  const currentOrganizationId = req.organizationId || getDocumentId(req.user.organization);

  if (!currentOrganizationId) {
    return res.status(HTTP_STATUS.FORBIDDEN).json(errorResponse("Organization access is required"));
  }

  const requestedOrganizationId = req.params.organizationId || req.body.organizationId || req.query.organizationId;

  if (requestedOrganizationId && requestedOrganizationId !== currentOrganizationId) {
    return res.status(HTTP_STATUS.FORBIDDEN).json(errorResponse("You cannot access another organization"));
  }

  req.organizationId = currentOrganizationId;
  return next();
}

export async function requireApprovedOrganization(req, res, next) {
  if (!req.user) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json(errorResponse("Not authorized"));
  }

  if (isSuperAdmin(req.user)) {
    return next();
  }

  if (req.organization) {
    if (!isOrganizationActive(req.organization)) {
      return res.status(HTTP_STATUS.FORBIDDEN).json(errorResponse("Your organization is not active"));
    }

    return next();
  }

  return requireOrganizationContext(req, res, next);
}

export function requireOrganizationRole(...allowedRoles) {
  return function requireOrganizationRoleMiddleware(req, res, next) {
    if (!req.user) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json(errorResponse("Not authorized"));
    }

    if (isSuperAdmin(req.user)) {
      return next();
    }

    if (!req.organizationId) {
      return res.status(HTTP_STATUS.FORBIDDEN).json(errorResponse("Organization access is required"));
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(req.user.role)) {
      return res.status(HTTP_STATUS.FORBIDDEN).json(errorResponse("You do not have access to this resource"));
    }

    return next();
  };
}
