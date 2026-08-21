import { get, patch, remove } from "../api/httpClient";
import { unwrapResponse } from "../utils/response";
import { buildQueryString } from "../utils/query";

function buildUserPath(path = "", query = {}) {
  return `/admin/users${path}${buildQueryString(query)}`;
}

export async function getUsers(query = {}) {
  const response = await get(buildUserPath("", query));

  return unwrapResponse(response);
}

export async function getUserById(userId) {
  const response = await get(buildUserPath(`/${userId}`));

  return unwrapResponse(response);
}

export async function suspendUser(userId, payload) {
  const response = await patch(buildUserPath(`/${userId}/suspend`), payload);

  return unwrapResponse(response);
}

export async function reactivateUser(userId) {
  const response = await patch(buildUserPath(`/${userId}/reactivate`), {});

  return unwrapResponse(response);
}

export async function deleteUser(userId) {
  const response = await remove(buildUserPath(`/${userId}`));

  return unwrapResponse(response);
}
