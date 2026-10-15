import { get, patch, post } from "../api/httpClient";
import { unwrapResponse } from "../utils/response";
import { buildQueryString } from "../utils/query";

export async function listPlatformCoupons(query = {}) {
  return unwrapResponse(await get(`/coupons/platform${buildQueryString(query)}`));
}

export async function createPlatformCoupon(payload) {
  return unwrapResponse(await post("/coupons/platform", payload));
}

export async function getPlatformCoupon(couponId) {
  return unwrapResponse(await get(`/coupons/platform/${couponId}`));
}

export async function disablePlatformCoupon(couponId) {
  return unwrapResponse(await patch(`/coupons/platform/${couponId}/disable`, {}));
}

export async function listOrganizationCoupons(query = {}) {
  return unwrapResponse(await get(`/coupons/organization${buildQueryString(query)}`));
}

export async function createOrganizationCoupon(payload) {
  return unwrapResponse(await post("/coupons/organization", payload));
}

export async function getOrganizationCoupon(couponId) {
  return unwrapResponse(await get(`/coupons/organization/${couponId}`));
}

export async function disableOrganizationCoupon(couponId) {
  return unwrapResponse(await patch(`/coupons/organization/${couponId}/disable`, {}));
}

export async function listCustomerRewards() {
  return unwrapResponse(await get("/coupons/rewards"));
}
