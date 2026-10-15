import { HTTP_STATUS } from "../constants/httpStatus.constants.js";
import * as couponService from "../services/coupon.service.js";
import { errorResponse, successResponse } from "../utils/apiResponse.js";

function sendServiceError(res, result) {
  return res.status(result.statusCode || HTTP_STATUS.BAD_REQUEST).json(errorResponse(result.error || "Something went wrong"));
}

function platformScope() {
  return { fundingType: "PLATFORM_FUNDED", organizationId: null };
}

function organizationScope(req) {
  return { fundingType: "ORGANIZER_FUNDED", organizationId: req.organizationId };
}

export async function createPlatformCoupon(req, res) {
  const result = await couponService.createCoupon(req.auth.userId, null, req.body);
  if (result.error) return sendServiceError(res, result);
  return res.status(HTTP_STATUS.CREATED).json(successResponse("Platform coupon created successfully", result));
}

export async function listPlatformCoupons(req, res) {
  const result = await couponService.listCoupons(platformScope(), req.query);
  return res.status(HTTP_STATUS.OK).json(successResponse("Operation successful", result));
}

export async function getPlatformCoupon(req, res) {
  const result = await couponService.getCoupon(platformScope(), req.params.couponId);
  if (result.error) return sendServiceError(res, result);
  return res.status(HTTP_STATUS.OK).json(successResponse("Operation successful", result));
}

export async function disablePlatformCoupon(req, res) {
  const result = await couponService.disableCoupon(platformScope(), req.params.couponId);
  if (result.error) return sendServiceError(res, result);
  return res.status(HTTP_STATUS.OK).json(successResponse("Coupon disabled successfully", result));
}

export async function createOrganizerCoupon(req, res) {
  const result = await couponService.createCoupon(req.auth.userId, req.organizationId, req.body);
  if (result.error) return sendServiceError(res, result);
  return res.status(HTTP_STATUS.CREATED).json(successResponse("Organizer coupon created successfully", result));
}

export async function listOrganizerCoupons(req, res) {
  const result = await couponService.listCoupons(organizationScope(req), req.query);
  return res.status(HTTP_STATUS.OK).json(successResponse("Operation successful", result));
}

export async function getOrganizerCoupon(req, res) {
  const result = await couponService.getCoupon(organizationScope(req), req.params.couponId);
  if (result.error) return sendServiceError(res, result);
  return res.status(HTTP_STATUS.OK).json(successResponse("Operation successful", result));
}

export async function disableOrganizerCoupon(req, res) {
  const result = await couponService.disableCoupon(organizationScope(req), req.params.couponId);
  if (result.error) return sendServiceError(res, result);
  return res.status(HTTP_STATUS.OK).json(successResponse("Coupon disabled successfully", result));
}

export async function listCustomerRewards(req, res) {
  const result = await couponService.listCustomerRewards(req.auth.userId);
  return res.status(HTTP_STATUS.OK).json(successResponse("Operation successful", result));
}
