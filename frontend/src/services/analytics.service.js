import { get } from "../api/httpClient";
import { buildQueryString } from "../utils/query";
import { unwrapResponse } from "../utils/response";

async function getAnalytics(path, query = {}, options = {}) {
  const response = await get(`${path}${buildQueryString(query)}`, options);
  return unwrapResponse(response);
}

export function getOrganizationAnalyticsOverview(query = {}, options = {}) {
  return getAnalytics("/organizations/me/analytics/overview", query, options);
}

export function getOrganizationSalesAnalytics(query = {}, options = {}) {
  return getAnalytics("/organizations/me/analytics/sales", query, options);
}

export function getOrganizationEventPerformance(query = {}, options = {}) {
  return getAnalytics("/organizations/me/analytics/events", query, options);
}

export function getOrganizationTicketTypePerformance(query = {}, options = {}) {
  return getAnalytics("/organizations/me/analytics/ticket-types", query, options);
}

export function getEventAnalytics(eventId, query = {}, options = {}) {
  return getAnalytics(`/organizations/me/events/${eventId}/analytics`, query, options);
}

export function getPlatformAnalyticsOverview(query = {}, options = {}) {
  return getAnalytics("/admin/analytics/overview", query, options);
}

export function getPlatformSalesAnalytics(query = {}, options = {}) {
  return getAnalytics("/admin/analytics/sales", query, options);
}

export function getPlatformEventPerformance(query = {}, options = {}) {
  return getAnalytics("/admin/analytics/events", query, options);
}

export function getPlatformOrganizationPerformance(query = {}, options = {}) {
  return getAnalytics("/admin/analytics/organizations", query, options);
}

