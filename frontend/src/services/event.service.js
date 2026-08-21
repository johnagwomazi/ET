import { get, patch, post } from "../api/httpClient";
import { unwrapResponse } from "../utils/response";
import { buildQueryString } from "../utils/query";

function buildOrganizationEventPath(path = "", query = {}) {
  return `/organizations/me/events${path}${buildQueryString(query)}`;
}

function buildManagerEventPath(path = "", query = {}) {
  return `/manager/events${path}${buildQueryString(query)}`;
}

export async function getOrganizationEvents(query = {}) {
  const response = await get(buildOrganizationEventPath("", query));

  return unwrapResponse(response);
}

export async function getOrganizationEventById(eventId) {
  const response = await get(buildOrganizationEventPath(`/${eventId}`));

  return unwrapResponse(response);
}

export async function getOrganizationEventHistory(eventId, query = {}) {
  const response = await get(buildOrganizationEventPath(`/${eventId}/history`, query));

  return unwrapResponse(response);
}

export async function publishOrganizationEvent(eventId) {
  const response = await post(buildOrganizationEventPath(`/${eventId}/publish`));

  return unwrapResponse(response);
}

export async function postponeOrganizationEvent(eventId, payload) {
  const response = await post(buildOrganizationEventPath(`/${eventId}/postpone`), payload);

  return unwrapResponse(response);
}

export async function resumeOrganizationEvent(eventId) {
  const response = await post(buildOrganizationEventPath(`/${eventId}/resume`));

  return unwrapResponse(response);
}

export async function cancelOrganizationEvent(eventId, payload) {
  const response = await post(buildOrganizationEventPath(`/${eventId}/cancel`), payload);

  return unwrapResponse(response);
}

export async function completeOrganizationEvent(eventId) {
  const response = await post(buildOrganizationEventPath(`/${eventId}/complete`));

  return unwrapResponse(response);
}

export async function getOrganizationEventManagers(eventId, query = {}) {
  const response = await get(buildOrganizationEventPath(`/${eventId}/managers`, query));

  return unwrapResponse(response);
}

export async function getOrganizationEventAttendance(eventId, query = {}) {
  const response = await get(buildOrganizationEventPath(`/${eventId}/attendance`, query));

  return unwrapResponse(response);
}

export async function getOrganizationEventAttendanceCount(eventId) {
  const response = await get(buildOrganizationEventPath(`/${eventId}/attendance/count`));

  return unwrapResponse(response);
}

export async function getOrganizationEventAttendancePdf(eventId, query = {}) {
  return get(buildOrganizationEventPath(`/${eventId}/attendance/export/pdf`, query));
}

export async function getOrganizationEventAttendanceExcel(eventId, query = {}) {
  return get(buildOrganizationEventPath(`/${eventId}/attendance/export/excel`, query));
}

export async function createEvent(payload) {
  const response = await post(buildOrganizationEventPath(), payload);

  return unwrapResponse(response);
}

export async function updateEvent(eventId, payload) {
  const response = await patch(buildOrganizationEventPath(`/${eventId}`), payload);

  return unwrapResponse(response);
}

export async function getManagerAssignedEvents(query = {}) {
  const response = await get(buildManagerEventPath("", query));

  return unwrapResponse(response);
}

export async function getManagerAssignedEventById(eventId) {
  const response = await get(buildManagerEventPath(`/${eventId}`));

  return unwrapResponse(response);
}

export async function createOrganizationEvent(payload) {
  return createEvent(payload);
}

export async function updateOrganizationEvent(eventId, payload) {
  return updateEvent(eventId, payload);
}
