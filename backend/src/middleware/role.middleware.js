import { HTTP_STATUS } from "../constants/httpStatus.constants.js";
import { errorResponse } from "../utils/apiResponse.js";

export function authorizeRoles(...allowedRoles) {
  return function authorizeRolesMiddleware(req, res, next) {
    if (!req.user) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json(errorResponse("Not authorized"));
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(req.user.role)) {
      return res.status(HTTP_STATUS.FORBIDDEN).json(errorResponse("You do not have access to this resource"));
    }

    return next();
  };
}
