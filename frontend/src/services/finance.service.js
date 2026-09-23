import { get, patch, post, put } from "../api/httpClient";
import { buildQueryString } from "../utils/query";
import { unwrapResponse } from "../utils/response";

export async function getOrganizationFinanceSummary(options = {}) {
  return unwrapResponse(await get("/organizations/me/finance/summary", options));
}

export async function getOrganizationPayoutBanks(options = {}) {
  return unwrapResponse(await get("/organizations/me/finance/banks", options));
}

export async function resolveOrganizationPayoutAccount(payload, options = {}) {
  return unwrapResponse(await post("/organizations/me/finance/payout-details/resolve", payload, options));
}

export async function updateOrganizationPayoutDetails(payload, options = {}) {
  return unwrapResponse(await put("/organizations/me/finance/payout-details", payload, options));
}

export async function requestOrganizationWithdrawal(payload, options = {}) {
  return unwrapResponse(await post("/organizations/me/withdrawals", payload, options));
}

export async function getOrganizationWithdrawals(query = {}, options = {}) {
  return unwrapResponse(await get(`/organizations/me/withdrawals${buildQueryString(query)}`, options));
}

export async function getPlatformWithdrawals(query = {}, options = {}) {
  return unwrapResponse(await get(`/admin/withdrawals${buildQueryString(query)}`, options));
}

export async function getPlatformWithdrawalDetails(withdrawalId, options = {}) {
  return unwrapResponse(await get(`/admin/withdrawals/${withdrawalId}`, options));
}

export async function approveWithdrawal(withdrawalId, payload = {}, options = {}) {
  return unwrapResponse(await patch(`/admin/withdrawals/${withdrawalId}/approve`, payload, options));
}

export async function finalizeWithdrawalTransfer(withdrawalId, payload, options = {}) {
  return unwrapResponse(await post(`/admin/withdrawals/${withdrawalId}/finalize`, payload, options));
}

export async function requestWithdrawalOtp(withdrawalId, options = {}) {
  return unwrapResponse(await post(`/admin/withdrawals/${withdrawalId}/request-otp`, {}, options));
}

export async function rejectWithdrawal(withdrawalId, payload, options = {}) {
  return unwrapResponse(await patch(`/admin/withdrawals/${withdrawalId}/reject`, payload, options));
}

export async function reconcileWithdrawal(withdrawalId, options = {}) {
  return unwrapResponse(await post(`/admin/withdrawals/${withdrawalId}/reconcile`, {}, options));
}
