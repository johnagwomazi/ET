import { HTTP_STATUS } from "../constants/httpStatus.constants.js";
import * as eventDiscoveryService from "../services/eventDiscovery.service.js";
import { errorResponse, successResponse } from "../utils/apiResponse.js";

function sendServiceError(res, errorResult) {
  return res.status(errorResult.statusCode || HTTP_STATUS.BAD_REQUEST).json(
    errorResponse(errorResult.error || "Something went wrong")
  );
}

export async function discoverPublicEvents(req, res) {
  try {
    const result = await eventDiscoveryService.discoverPublicEvents(req.query);

    if (result.error) {
      return sendServiceError(res, result);
    }

    return res.status(HTTP_STATUS.OK).json(successResponse("Operation successful", result));
  } catch (error) {
    console.log(error);
    console.log("error in event discovery controller");

    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(errorResponse("Something went wrong"));
  }
}

export async function getPublicEventById(req, res) {
  try {
    const result = await eventDiscoveryService.getPublicEventById(req.params.eventId);

    if (result.error) {
      return sendServiceError(res, result);
    }

    return res.status(HTTP_STATUS.OK).json(successResponse("Operation successful", result));
  } catch (error) {
    console.log(error);
    console.log("error in public event details controller");

    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(errorResponse("Something went wrong"));
  }
}
