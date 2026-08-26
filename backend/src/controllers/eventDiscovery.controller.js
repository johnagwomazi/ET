import { HTTP_STATUS } from "../constants/httpStatus.constants.js";
import * as eventDiscoveryService from "../services/eventDiscovery.service.js";
import { errorResponse, successResponse } from "../utils/apiResponse.js";

export async function discoverPublicEvents(req, res) {
  try {
    const result = await eventDiscoveryService.discoverPublicEvents(req.query);

    return res.status(HTTP_STATUS.OK).json(successResponse("Operation successful", result));
  } catch (error) {
    console.log(error);
    console.log("error in event discovery controller");

    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(errorResponse("Something went wrong"));
  }
}
