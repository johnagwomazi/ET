import { get, patch } from "../api/httpClient";
import { buildQueryString } from "../utils/query";
import { unwrapResponse } from "../utils/response";

export async function getNotifications(query = {}, options = {}) {
  return unwrapResponse(await get(`/notifications${buildQueryString(query)}`, options));
}

export async function getUnreadCount(options = {}) {
  return unwrapResponse(await get("/notifications/unread-count", options));
}

export async function markNotificationRead(notificationId, options = {}) {
  return unwrapResponse(await patch(`/notifications/${notificationId}/read`, {}, options));
}

export async function markAllNotificationsRead(options = {}) {
  return unwrapResponse(await patch("/notifications/read-all", {}, options));
}

