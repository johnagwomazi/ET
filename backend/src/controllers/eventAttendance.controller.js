import { HTTP_STATUS } from "../constants/httpStatus.constants.js";
import * as eventAttendanceService from "../services/eventAttendance.service.js";
import * as eventAttendanceReportService from "../services/eventAttendanceReport.service.js";
import { errorResponse, successResponse } from "../utils/apiResponse.js";

function sendServiceError(res, errorResult) {
  return res.status(errorResult.statusCode || HTTP_STATUS.BAD_REQUEST).json(
    errorResponse(errorResult.error || "Something went wrong")
  );
}

export async function recordEventAttendance(req, res) {
  try {
    const result = await eventAttendanceService.recordEventAttendance(
      req.organizationId,
      req.auth.userId,
      req.params.eventId,
      req.body
    );

    if (result.error) {
      return sendServiceError(res, result);
    }

    return res.status(HTTP_STATUS.CREATED).json(successResponse("Attendance recorded successfully", result));
  } catch (error) {
    console.log(error);
    console.log("error in event attendance controller");

    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(errorResponse("Something went wrong"));
  }
}

export async function getEventAttendance(req, res) {
  try {
    const result = await eventAttendanceService.getEventAttendance(
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
    console.log("error in event attendance controller");

    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(errorResponse("Something went wrong"));
  }
}

export async function getEventAttendanceCount(req, res) {
  try {
    const result = await eventAttendanceService.getEventAttendanceCount(
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
    console.log("error in event attendance controller");

    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(errorResponse("Something went wrong"));
  }
}

function sendFileResponse(res, result) {
  res.setHeader("Content-Type", result.contentType);
  res.setHeader("Content-Disposition", `attachment; filename="${result.filename}"`);
  return res.status(HTTP_STATUS.OK).send(result.buffer);
}

export async function exportAttendancePdf(req, res) {
  try {
    const result = await eventAttendanceReportService.exportAttendancePdf(
      req.organizationId,
      req.auth.userId,
      req.params.eventId,
      req.query
    );

    if (result.error) {
      return sendServiceError(res, result);
    }

    return sendFileResponse(res, result);
  } catch (error) {
    console.log(error);
    console.log("error in event attendance controller");

    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(errorResponse("Something went wrong"));
  }
}

export async function exportAttendanceExcel(req, res) {
  try {
    const result = await eventAttendanceReportService.exportAttendanceExcel(
      req.organizationId,
      req.auth.userId,
      req.params.eventId,
      req.query
    );

    if (result.error) {
      return sendServiceError(res, result);
    }

    return sendFileResponse(res, result);
  } catch (error) {
    console.log(error);
    console.log("error in event attendance controller");

    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(errorResponse("Something went wrong"));
  }
}
