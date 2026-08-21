import * as healthService from "../services/health.service.js";
import { HTTP_STATUS } from "../constants/httpStatus.constants.js";
import { successResponse, errorResponse } from "../utils/apiResponse.js";

export async function getHealthStatus(req, res) {
  try {
    const healthStatus = await healthService.getHealthStatus();

    return res.status(HTTP_STATUS.OK).json(
      successResponse("Operation successful", healthStatus)
    );
  } catch (error) {
    console.log(error);
    console.log("error in health controller");

    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      errorResponse("Something went wrong")
    );
  }
}
