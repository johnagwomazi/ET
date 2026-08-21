import { HTTP_STATUS } from "../constants/httpStatus.constants.js";
import * as eventManagerService from "../services/eventManager.service.js";
import { errorResponse, successResponse } from "../utils/apiResponse.js";

function sendServiceError(res, errorResult) {
  return res.status(errorResult.statusCode || HTTP_STATUS.BAD_REQUEST).json(
    errorResponse(errorResult.error || "Something went wrong")
  );
}

export async function assignManagerToEvent(req, res) {
  try {
    const result = await eventManagerService.assignManagerToEvent(
      req.organizationId,
      req.auth.userId,
      req.params.eventId,
      req.body
    );

    if (result.error) {
      return sendServiceError(res, result);
    }

    return res.status(HTTP_STATUS.CREATED).json(successResponse("Manager assigned successfully", result));
  } catch (error) {
    console.log(error);
    console.log("error in event manager controller");

    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(errorResponse("Something went wrong"));
  }
}

export async function removeManagerFromEvent(req, res) {
  try {
    const result = await eventManagerService.removeManagerFromEvent(
      req.organizationId,
      req.auth.userId,
      req.params.eventId,
      req.params.userId
    );

    if (result.error) {
      return sendServiceError(res, result);
    }

    return res.status(HTTP_STATUS.OK).json(successResponse("Manager removed successfully", result));
  } catch (error) {
    console.log(error);
    console.log("error in event manager controller");

    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(errorResponse("Something went wrong"));
  }
}

export async function getEventManagers(req, res) {
  try {
    const result = await eventManagerService.getEventManagers(
      req.organizationId,
      req.auth.userId,
      req.params.eventId,
      req.query
    );

    if (result.error) {
      return sendServiceError(res, result);
    }

    return res.status(HTTP_STATUS.OK).json(successResponse("Operation successful", result));
  } catch (error) {
    console.log(error);
    console.log("error in event manager controller");

    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(errorResponse("Something went wrong"));
  }
}

export async function getManagerAssignedEvents(req, res) {
  try {
    const result = await eventManagerService.getManagerAssignedEvents(
      req.organizationId,
      req.auth.userId,
      req.query
    );

    if (result.error) {
      return sendServiceError(res, result);
    }

    return res.status(HTTP_STATUS.OK).json(successResponse("Operation successful", result));
  } catch (error) {
    console.log(error);
    console.log("error in event manager controller");

    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(errorResponse("Something went wrong"));
  }
}

export async function getManagerAssignedEventById(req, res) {
  try {
    const result = await eventManagerService.getManagerAssignedEventById(
      req.organizationId,
      req.auth.userId,
      req.params.eventId
    );

    if (result.error) {
      return sendServiceError(res, result);
    }

    return res.status(HTTP_STATUS.OK).json(successResponse("Operation successful", result));
  } catch (error) {
    console.log(error);
    console.log("error in event manager controller");

    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(errorResponse("Something went wrong"));
  }
}
