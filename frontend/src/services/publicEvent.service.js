import { get } from "../api/httpClient";
import { unwrapResponse } from "../utils/response";
import { buildQueryString } from "../utils/query";

function buildPublicEventPath(path = "", query = {}) {
  return `/events${path}${buildQueryString(query)}`;
}

export async function discoverPublicEvents(query = {}, options = {}) {
  const response = await get(buildPublicEventPath("/discover", query), options);

  return unwrapResponse(response);
}

export async function getPublicEventById(eventId, options = {}) {
  const response = await get(buildPublicEventPath(`/${eventId}`), options);

  return unwrapResponse(response);
}
