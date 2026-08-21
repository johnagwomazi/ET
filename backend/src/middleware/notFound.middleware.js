import { HTTP_STATUS } from "../constants/httpStatus.constants.js";
import { errorResponse } from "../utils/apiResponse.js";

export default function notFoundMiddleware(req, res) {
  return res.status(HTTP_STATUS.NOT_FOUND).json(errorResponse("Route not found"));
}
