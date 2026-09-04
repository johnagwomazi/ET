import { HTTP_STATUS } from "../constants/httpStatus.constants.js";
import * as notificationService from "../services/notification.service.js";
import { errorResponse, successResponse } from "../utils/apiResponse.js";

export async function listNotifications(req, res) {
  const result = await notificationService.listNotifications(req.auth.userId, req.query);
  return res.status(HTTP_STATUS.OK).json(successResponse("Operation successful", result));
}

export async function getUnreadCount(req, res) {
  const result = await notificationService.getUnreadCount(req.auth.userId);
  return res.status(HTTP_STATUS.OK).json(successResponse("Operation successful", result));
}

export async function markNotificationRead(req, res) {
  const result = await notificationService.markNotificationRead(req.auth.userId, req.params.notificationId);
  if (result.error) {
    return res.status(result.statusCode || HTTP_STATUS.NOT_FOUND).json(errorResponse(result.error));
  }
  return res.status(HTTP_STATUS.OK).json(successResponse("Notification marked as read", result));
}

export async function markAllNotificationsRead(req, res) {
  const result = await notificationService.markAllNotificationsRead(req.auth.userId);
  return res.status(HTTP_STATUS.OK).json(successResponse("Notifications marked as read", result));
}
