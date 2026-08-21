import { HTTP_STATUS } from "../constants/httpStatus.constants.js";
import * as eventService from "../services/event.service.js";
import { errorResponse, successResponse } from "../utils/apiResponse.js";

function sendServiceError(res, errorResult) {
  return res.status(errorResult.statusCode || HTTP_STATUS.BAD_REQUEST).json(
    errorResponse(errorResult.error || "Something went wrong")
  );
}

export async function getOrganizationEvents(req, res) {
  try {
    const result = await eventService.getOrganizationEvents(req.organizationId, req.auth.userId, req.query);

    if (result.error) {
      return sendServiceError(res, result);
    }

    return res.status(HTTP_STATUS.OK).json(successResponse("Operation successful", result));
  } catch (error) {
    console.log(error);
    console.log("error in event controller");

    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(errorResponse("Something went wrong"));
  }
}

export async function getOrganizationEventById(req, res) {
  try {
    const result = await eventService.getOrganizationEventById(
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
    console.log("error in event controller");

    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(errorResponse("Something went wrong"));
  }
}

export async function createOrganizationEvent(req, res) {
  try {
    const result = await eventService.createOrganizationEvent(
      req.organizationId,
      req.auth.userId,
      req.body
    );

    if (result.error) {
      return sendServiceError(res, result);
    }

    return res.status(HTTP_STATUS.CREATED).json(successResponse("Event created successfully", result));
  } catch (error) {
    console.log(error);
    console.log("error in event controller");

    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(errorResponse("Something went wrong"));
  }
}

export async function updateOrganizationEvent(req, res) {
  try {
    const result = await eventService.updateOrganizationEvent(
      req.organizationId,
      req.auth.userId,
      req.params.eventId,
      req.body
    );

    if (result.error) {
      return sendServiceError(res, result);
    }

    return res.status(HTTP_STATUS.OK).json(successResponse("Event updated successfully", result));
  } catch (error) {
    console.log(error);
    console.log("error in event controller");

    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(errorResponse("Something went wrong"));
  }
}

export async function deleteOrganizationEvent(req, res) {
  try {
    const result = await eventService.deleteOrganizationEvent(
      req.organizationId,
      req.auth.userId,
      req.params.eventId
    );

    if (result.error) {
      return sendServiceError(res, result);
    }

    return res.status(HTTP_STATUS.OK).json(successResponse("Event deleted successfully", result));
  } catch (error) {
    console.log(error);
    console.log("error in event controller");

    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(errorResponse("Something went wrong"));
  }
}

export async function publishOrganizationEvent(req, res) {
  try {
    const result = await eventService.publishOrganizationEvent(
      req.organizationId,
      req.auth.userId,
      req.params.eventId
    );

    if (result.error) {
      return sendServiceError(res, result);
    }

    return res.status(HTTP_STATUS.OK).json(successResponse("Event published successfully", result));
  } catch (error) {
    console.log(error);
    console.log("error in event controller");

    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(errorResponse("Something went wrong"));
  }
}

export async function postponeOrganizationEvent(req, res) {
  try {
    const result = await eventService.postponeOrganizationEvent(
      req.organizationId,
      req.auth.userId,
      req.params.eventId,
      req.body
    );

    if (result.error) {
      return sendServiceError(res, result);
    }

    return res.status(HTTP_STATUS.OK).json(successResponse("Event postponed successfully", result));
  } catch (error) {
    console.log(error);
    console.log("error in event controller");

    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(errorResponse("Something went wrong"));
  }
}

export async function resumeOrganizationEvent(req, res) {
  try {
    const result = await eventService.resumeOrganizationEvent(
      req.organizationId,
      req.auth.userId,
      req.params.eventId
    );

    if (result.error) {
      return sendServiceError(res, result);
    }

    return res.status(HTTP_STATUS.OK).json(successResponse("Event resumed successfully", result));
  } catch (error) {
    console.log(error);
    console.log("error in event controller");

    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(errorResponse("Something went wrong"));
  }
}

export async function cancelOrganizationEvent(req, res) {
  try {
    const result = await eventService.cancelOrganizationEvent(
      req.organizationId,
      req.auth.userId,
      req.params.eventId,
      req.body
    );

    if (result.error) {
      return sendServiceError(res, result);
    }

    return res.status(HTTP_STATUS.OK).json(successResponse("Event canceled successfully", result));
  } catch (error) {
    console.log(error);
    console.log("error in event controller");

    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(errorResponse("Something went wrong"));
  }
}

export async function completeOrganizationEvent(req, res) {
  try {
    const result = await eventService.completeOrganizationEvent(
      req.organizationId,
      req.auth.userId,
      req.params.eventId
    );

    if (result.error) {
      return sendServiceError(res, result);
    }

    return res.status(HTTP_STATUS.OK).json(successResponse("Event completed successfully", result));
  } catch (error) {
    console.log(error);
    console.log("error in event controller");

    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(errorResponse("Something went wrong"));
  }
}

export async function getOrganizationEventHistory(req, res) {
  try {
    const result = await eventService.getOrganizationEventHistory(
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
    console.log("error in event controller");

    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(errorResponse("Something went wrong"));
  }
}
