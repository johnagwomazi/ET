import { HTTP_STATUS } from "../constants/httpStatus.constants.js";
import { errorResponse } from "../utils/apiResponse.js";

export function validate(schema, source = "body") {
  return function validateRequest(req, res, next) {
    const validationResult = schema.safeParse(req[source]);

    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0];
      const message = firstError ? firstError.message : "Validation failed";

      return res.status(HTTP_STATUS.BAD_REQUEST).json(errorResponse(message));
    }

    req[source] = validationResult.data;
    return next();
  };
}
