import { HTTP_STATUS } from "../constants/httpStatus.constants.js";
import * as analyticsService from "../services/analytics.service.js";
import { errorResponse, successResponse } from "../utils/apiResponse.js";
import logger from "../lib/logger.js";

function sendResult(res, result) {
  if (result.error) {
    return res.status(result.statusCode || HTTP_STATUS.BAD_REQUEST).json(errorResponse(result.error));
  }

  res.setHeader("Cache-Control", "private, no-store");
  return res.status(HTTP_STATUS.OK).json(successResponse("Operation successful", result));
}

async function handle(res, executor) {
  try {
    return sendResult(res, await executor());
  } catch (error) {
    logger.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(errorResponse("Something went wrong"));
  }
}

export function getOrganizationOverview(req, res) {
  return handle(res, () => analyticsService.getOrganizationOverview(req.organizationId, req.auth.userId, req.query));
}

export function getOrganizationSales(req, res) {
  return handle(res, () => analyticsService.getOrganizationSales(req.organizationId, req.auth.userId, req.query));
}

export function getOrganizationEventPerformance(req, res) {
  return handle(res, () => analyticsService.getOrganizationEventPerformance(req.organizationId, req.auth.userId, req.query));
}

export function getOrganizationTicketTypePerformance(req, res) {
  return handle(res, () => analyticsService.getOrganizationTicketTypePerformance(req.organizationId, req.auth.userId, req.query));
}

export function getEventAnalytics(req, res) {
  return handle(res, () => analyticsService.getEventAnalytics(req.organizationId, req.auth.userId, req.params.eventId, req.query));
}

export function getPlatformOverview(req, res) {
  return handle(res, () => analyticsService.getPlatformOverview(req.auth.userId, req.query));
}

export function getPlatformSales(req, res) {
  return handle(res, () => analyticsService.getPlatformSales(req.auth.userId, req.query));
}

export function getPlatformEventPerformance(req, res) {
  return handle(res, () => analyticsService.getPlatformEventPerformance(req.auth.userId, req.query));
}

export function getPlatformOrganizationPerformance(req, res) {
  return handle(res, () => analyticsService.getPlatformOrganizationPerformance(req.auth.userId, req.query));
}

