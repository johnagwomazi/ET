import { get, patch, post, remove } from "../api/httpClient";
import { unwrapResponse } from "../utils/response";
import { buildQueryString } from "../utils/query";

function buildOrganizationPath(path = "", query = {}) {
  return `/admin/organizations${path}${buildQueryString(query)}`;
}

function buildMyOrganizationPath(path = "", query = {}) {
  return `/organizations/me${path}${buildQueryString(query)}`;
}

export async function getOrganizations(query = {}) {
  const response = await get(buildOrganizationPath("", query));

  return unwrapResponse(response);
}

export async function getOrganizationById(organizationId) {
  const response = await get(buildOrganizationPath(`/${organizationId}`));

  return unwrapResponse(response);
}

export async function approveOrganization(organizationId) {
  const response = await patch(buildOrganizationPath(`/${organizationId}/approve`), {});

  return unwrapResponse(response);
}

export async function rejectOrganization(organizationId, payload) {
  const response = await patch(buildOrganizationPath(`/${organizationId}/reject`), payload);

  return unwrapResponse(response);
}

export async function suspendOrganization(organizationId, payload) {
  const response = await patch(buildOrganizationPath(`/${organizationId}/suspend`), payload);

  return unwrapResponse(response);
}

export async function reactivateOrganization(organizationId) {
  const response = await patch(buildOrganizationPath(`/${organizationId}/reactivate`), {});

  return unwrapResponse(response);
}

export async function deleteOrganization(organizationId) {
  const response = await remove(buildOrganizationPath(`/${organizationId}`));

  return unwrapResponse(response);
}

export async function getOrganizationContext() {
  const response = await get("/organizations/context");

  return unwrapResponse(response);
}

export async function getMyOrganization() {
  const response = await get(buildMyOrganizationPath());

  return unwrapResponse(response);
}

export async function updateMyOrganization(payload) {
  const response = await patch(buildMyOrganizationPath(), payload);

  return unwrapResponse(response);
}

export async function getMyOrganizationSettings() {
  const response = await get(buildMyOrganizationPath("/settings"));

  return unwrapResponse(response);
}

export async function updateMyOrganizationSettings(payload) {
  const response = await patch(buildMyOrganizationPath("/settings"), payload);

  return unwrapResponse(response);
}

export async function getMyOrganizationDashboard() {
  const response = await get(buildMyOrganizationPath("/dashboard"));

  return unwrapResponse(response);
}

export async function getOrganizationMembers(query = {}) {
  const response = await get(buildMyOrganizationPath("/members", query));

  return unwrapResponse(response);
}

export async function inviteOrganizationMember(payload) {
  const response = await post(buildMyOrganizationPath("/members/invite"), payload);

  return unwrapResponse(response);
}

export async function updateOrganizationMemberRole(memberId, payload) {
  const response = await patch(buildMyOrganizationPath(`/members/${memberId}/role`), payload);

  return unwrapResponse(response);
}

export async function removeOrganizationMember(memberId) {
  const response = await remove(buildMyOrganizationPath(`/members/${memberId}`));

  return unwrapResponse(response);
}
