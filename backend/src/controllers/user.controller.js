import { HTTP_STATUS } from "../constants/httpStatus.constants.js";
import * as userService from "../services/user.service.js";
import { errorResponse, successResponse } from "../utils/apiResponse.js";

function sendServiceError(res, errorResult) {
  return res.status(errorResult.statusCode || HTTP_STATUS.BAD_REQUEST).json(
    errorResponse(errorResult.error || "Something went wrong")
  );
}

export async function getUsers(req, res) {
  try {
    const result = await userService.getUsers(req.query);

    return res.status(HTTP_STATUS.OK).json(successResponse("Operation successful", result));
  } catch (error) {
    console.log(error);
    console.log("error in user controller");

    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(errorResponse("Something went wrong"));
  }
}

export async function getUserById(req, res) {
  try {
    const result = await userService.getUserById(req.params.userId);

    if (result.error) {
      return sendServiceError(res, result);
    }

    return res.status(HTTP_STATUS.OK).json(successResponse("Operation successful", result));
  } catch (error) {
    console.log(error);
    console.log("error in user controller");

    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(errorResponse("Something went wrong"));
  }
}

export async function suspendUser(req, res) {
  try {
    const result = await userService.suspendUser(req.params.userId, req.auth.userId, req.body.suspensionReason);

    if (result.error) {
      return sendServiceError(res, result);
    }

    return res.status(HTTP_STATUS.OK).json(successResponse("User suspended successfully", result));
  } catch (error) {
    console.log(error);
    console.log("error in user controller");

    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(errorResponse("Something went wrong"));
  }
}

export async function reactivateUser(req, res) {
  try {
    const result = await userService.reactivateUser(req.params.userId, req.auth.userId);

    if (result.error) {
      return sendServiceError(res, result);
    }

    return res.status(HTTP_STATUS.OK).json(successResponse("User reactivated successfully", result));
  } catch (error) {
    console.log(error);
    console.log("error in user controller");

    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(errorResponse("Something went wrong"));
  }
}

export async function deleteUser(req, res) {
  try {
    const result = await userService.deleteUser(req.params.userId, req.auth.userId);

    if (result.error) {
      return sendServiceError(res, result);
    }

    return res.status(HTTP_STATUS.OK).json(successResponse("User deleted successfully", result));
  } catch (error) {
    console.log(error);
    console.log("error in user controller");

    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(errorResponse("Something went wrong"));
  }
}
