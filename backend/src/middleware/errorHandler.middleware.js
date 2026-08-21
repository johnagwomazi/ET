import { HTTP_STATUS } from "../constants/httpStatus.constants.js";
import { errorResponse } from "../utils/apiResponse.js";
import logger from "../lib/logger.js";

export default function errorHandlerMiddleware(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  const statusCode = error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  const message =
    statusCode === HTTP_STATUS.INTERNAL_SERVER_ERROR
      ? "Something went wrong"
      : error.message || "Something went wrong";

  if (statusCode === HTTP_STATUS.INTERNAL_SERVER_ERROR) {
    logger.error(error);
  }

  return res.status(statusCode).json(errorResponse(message));
}
