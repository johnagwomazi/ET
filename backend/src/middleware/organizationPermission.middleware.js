import { HTTP_STATUS } from "../constants/httpStatus.constants.js";
import { errorResponse } from "../utils/apiResponse.js";
import { hasOrganizationPermission } from "../utils/organizationPermission.util.js";

export function requireOrganizationPermission(permission) {
  return function requireOrganizationPermissionMiddleware(req, res, next) {
    if (!req.user) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json(errorResponse("Not authorized"));
    }

    if (!req.organization) {
      return res.status(HTTP_STATUS.FORBIDDEN).json(errorResponse("Organization access is required"));
    }

    if (!hasOrganizationPermission(req.user, permission, req.organization)) {
      return res.status(HTTP_STATUS.FORBIDDEN).json(errorResponse("You do not have access to this resource"));
    }

    return next();
  };
}
