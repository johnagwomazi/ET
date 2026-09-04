import { get, patch, post, remove } from "../api/httpClient";
import { unwrapResponse } from "../utils/response";
import { buildQueryString } from "../utils/query";

function buildOrganizationEventPath(path = "", query = {}) {
  return `/organizations/me/events${path}${buildQueryString(query)}`;
}

function buildManagerEventPath(path = "", query = {}) {
  return `/manager/events${path}${buildQueryString(query)}`;
}

function buildEventRequestBody(payload, bannerFile) {
  if (!bannerFile) {
    return payload;
  }

  const formData = new FormData();
  formData.append("payload", JSON.stringify(payload));
  formData.append("banner", bannerFile);

  return formData;
}

export async function getOrganizationEvents(query = {}, options = {}) {
  const response = await get(buildOrganizationEventPath("", query), options);

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

export async function assignOrganizationEventManager(eventId, payload) {
  const response = await post(buildOrganizationEventPath(`/${eventId}/managers`), payload);

  return unwrapResponse(response);
}

export async function removeOrganizationEventManager(eventId, userId) {
  const response = await remove(buildOrganizationEventPath(`/${eventId}/managers/${userId}`));

  return unwrapResponse(response);
}

export async function getOrganizationEventAttendance(eventId, query = {}) {
  const response = await get(buildOrganizationEventPath(`/${eventId}/attendance`, query));

  return unwrapResponse(response);
}

export async function recordOrganizationEventAttendance(eventId, payload) {
  const response = await post(buildOrganizationEventPath(`/${eventId}/attendance`), payload);

  return unwrapResponse(response);
}

export async function getOrganizationEventAttendanceCount(eventId) {
  const response = await get(buildOrganizationEventPath(`/${eventId}/attendance/count`));

  return unwrapResponse(response);
}

export async function getOrganizationEventRecentAttendance(eventId, query = {}) {
  const response = await get(buildOrganizationEventPath(`/${eventId}/attendance/recent`, query));

  return unwrapResponse(response);
}

export async function getOrganizationEventAttendancePdf(eventId, query = {}) {
  return get(buildOrganizationEventPath(`/${eventId}/attendance/export/pdf`, query), {
    responseType: "blob",
  });
}

export async function getOrganizationEventAttendanceExcel(eventId, query = {}) {
  return get(buildOrganizationEventPath(`/${eventId}/attendance/export/excel`, query), {
    responseType: "blob",
  });
}

export async function getManagerEventAttendance(eventId, query = {}) {
  const response = await get(buildManagerEventPath(`/${eventId}/attendance`, query));

  return unwrapResponse(response);
}

export async function recordManagerEventAttendance(eventId, payload) {
  const response = await post(buildManagerEventPath(`/${eventId}/attendance`), payload);

  return unwrapResponse(response);
}

export async function getManagerEventAttendanceCount(eventId) {
  const response = await get(buildManagerEventPath(`/${eventId}/attendance/count`));

  return unwrapResponse(response);
}

export async function getManagerEventRecentAttendance(eventId, query = {}) {
  const response = await get(buildManagerEventPath(`/${eventId}/attendance/recent`, query));

  return unwrapResponse(response);
}

export async function getManagerEventAttendancePdf(eventId, query = {}) {
  return get(buildManagerEventPath(`/${eventId}/attendance/export/pdf`, query), {
    responseType: "blob",
  });
}

export async function getManagerEventAttendanceExcel(eventId, query = {}) {
  return get(buildManagerEventPath(`/${eventId}/attendance/export/excel`, query), {
    responseType: "blob",
  });
}

export async function createEvent(payload, bannerFile = null) {
  const response = await post(buildOrganizationEventPath(), buildEventRequestBody(payload, bannerFile));

  return unwrapResponse(response);
}

export async function updateEvent(eventId, payload, bannerFile = null) {
  const response = await patch(
    buildOrganizationEventPath(`/${eventId}`),
    buildEventRequestBody(payload, bannerFile)
  );

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

export async function validateManagerTicket(eventId, payload) {
  const response = await post(buildManagerEventPath(`/${eventId}/tickets/validate`), payload);

  return unwrapResponse(response);
}

export async function checkInManagerTicket(eventId, payload) {
  const response = await post(buildManagerEventPath(`/${eventId}/tickets/check-in`), payload);

  return unwrapResponse(response);
}

export async function validateOrganizationTicket(eventId, payload) {
  const response = await post(buildOrganizationEventPath(`/${eventId}/tickets/validate`), payload);

  return unwrapResponse(response);
}

export async function checkInOrganizationTicket(eventId, payload) {
  const response = await post(buildOrganizationEventPath(`/${eventId}/tickets/check-in`), payload);

  return unwrapResponse(response);
}
