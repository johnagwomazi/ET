import crypto from "node:crypto";
import { HTTP_STATUS } from "../constants/httpStatus.constants.js";
import { COUPON_FUNDING_TYPES, COUPON_STATUS } from "../constants/coupon.constants.js";
import { USER_ROLES } from "../constants/roles.constants.js";
import * as authRepository from "../repositories/auth.repository.js";
import * as couponRepository from "../repositories/coupon.repository.js";
import * as eventRepository from "../repositories/event.repository.js";
import * as ticketTypeRepository from "../repositories/ticketType.repository.js";
import * as couponRewardRepository from "../repositories/couponReward.repository.js";

const defaultDependencies = { authRepository, couponRepository, eventRepository, ticketTypeRepository, couponRewardRepository };

function getId(value) {
  if (!value) return null;
  if (typeof value === "string") return value;
  return String(value._id || value);
}

function serviceError(error, statusCode = HTTP_STATUS.BAD_REQUEST) {
  return { error, statusCode };
}

function generateCouponCode() {
  return `EVT-${crypto.randomBytes(8).toString("hex").toUpperCase()}`;
}

function normalizeCode(code) {
  return code ? String(code).trim().toUpperCase() : null;
}

function mapCoupon(document) {
  if (!document) return null;
  const coupon = typeof document.toObject === "function" ? document.toObject() : document;
  return {
    ...coupon,
    id: getId(coupon),
    organization: getId(coupon.organization),
    event: getId(coupon.event),
    createdBy: getId(coupon.createdBy),
    ticketTypes: (coupon.ticketTypes || []).map(getId),
    customers: (coupon.customers || []).map(getId),
    discountPercent: Number(coupon.discountPercent),
  };
}

function mapReward(document) {
  if (!document) return null;
  const reward = typeof document.toObject === "function" ? document.toObject() : document;
  return {
    ...reward,
    id: getId(reward),
    coupon: reward.coupon ? mapCoupon(reward.coupon) : getId(reward.coupon),
    qualifyingOrder: getId(reward.qualifyingOrder),
    redeemedOrder: getId(reward.redeemedOrder),
  };
}

async function validateOrganizerScope(organizationId, payload, dependencies) {
  if (payload.eventId) {
    const event = await dependencies.eventRepository.findEventByIdAndOrganization(payload.eventId, organizationId);
    if (!event) return serviceError("Event does not belong to this organization", HTTP_STATUS.FORBIDDEN);
  }

  if ((payload.ticketTypeIds || []).length > 0 && !payload.eventId) {
    return serviceError("An event is required when restricting a coupon to ticket types");
  }

  for (const ticketTypeId of payload.ticketTypeIds || []) {
    const ticketType = await dependencies.ticketTypeRepository.findTicketTypeByIdAndEvent(
      ticketTypeId,
      payload.eventId,
      organizationId
    );
    if (!ticketType) return serviceError("Ticket type does not belong to this organization", HTTP_STATUS.FORBIDDEN);
  }
}

async function validatePlatformScope(payload, dependencies) {
  if ((payload.ticketTypeIds || []).length > 0 && !payload.eventId) {
    return serviceError("An event is required when restricting a coupon to ticket types");
  }
  if (payload.eventId && !await dependencies.eventRepository.findPublicEventById(payload.eventId)) {
    return serviceError("Event not found", HTTP_STATUS.NOT_FOUND);
  }
  for (const ticketTypeId of payload.ticketTypeIds || []) {
    const [ticketType] = await dependencies.ticketTypeRepository.findTicketTypes({ _id: ticketTypeId, event: payload.eventId }, { limit: 1 });
    if (!ticketType) return serviceError("Ticket type was not found for this event", HTTP_STATUS.NOT_FOUND);
  }
}

function buildCouponData(actorUserId, organizationId, payload, code) {
  return {
    code,
    fundingType: payload.fundingType,
    organization: organizationId || null,
    createdBy: actorUserId,
    discountPercent: payload.discountPercent,
    event: payload.eventId || null,
    ticketTypes: payload.ticketTypeIds || [],
    customers: payload.customerIds || [],
    startsAt: payload.startsAt || null,
    endsAt: payload.endsAt || null,
    status: payload.status || COUPON_STATUS.ACTIVE,
    maxRedemptions: payload.maxRedemptions ?? null,
    maxRedemptionsPerCustomer: payload.maxRedemptionsPerCustomer ?? null,
    rewardRule: payload.rewardRule || null,
  };
}

export async function createCoupon(actorUserId, organizationId, payload, dependencies = defaultDependencies) {
  const actor = await dependencies.authRepository.findAuthUserById(actorUserId);
  if (!actor) return serviceError("Not authorized", HTTP_STATUS.UNAUTHORIZED);

  if (payload.fundingType === COUPON_FUNDING_TYPES.PLATFORM_FUNDED) {
    if (actor.role !== USER_ROLES.SUPER_ADMIN) return serviceError("Only Super Admin can create platform-funded coupons", HTTP_STATUS.FORBIDDEN);
    const scopeResult = await validatePlatformScope(payload, dependencies);
    if (scopeResult?.error) return scopeResult;
    organizationId = null;
  } else if (payload.fundingType === COUPON_FUNDING_TYPES.ORGANIZER_FUNDED) {
    if (actor.role !== USER_ROLES.ADMIN) return serviceError("Only organization Admin can create organizer-funded coupons", HTTP_STATUS.FORBIDDEN);
    if (!organizationId || getId(actor.organization) !== getId(organizationId)) return serviceError("You cannot access another organization", HTTP_STATUS.FORBIDDEN);
    const scopeResult = await validateOrganizerScope(organizationId, payload, dependencies);
    if (scopeResult?.error) return scopeResult;
  } else {
    return serviceError("Unsupported coupon funding type");
  }

  const customCode = normalizeCode(payload.code);
  for (let attempt = 0; attempt < (customCode ? 1 : 3); attempt += 1) {
    const code = customCode || generateCouponCode();
    try {
      const coupon = await dependencies.couponRepository.createCoupon(buildCouponData(actorUserId, organizationId, payload, code));
      return { coupon: mapCoupon(coupon) };
    } catch (error) {
      if (error?.code === 11000 && !customCode) continue;
      if (error?.code === 11000) return serviceError("Coupon code is already in use", HTTP_STATUS.CONFLICT);
      throw error;
    }
  }

  return serviceError("Could not generate a unique coupon code", HTTP_STATUS.CONFLICT);
}

function scopedFilter(fundingType, organizationId) {
  return fundingType === COUPON_FUNDING_TYPES.PLATFORM_FUNDED
    ? { fundingType, organization: null }
    : { fundingType, organization: organizationId };
}

export async function listCoupons(scope, query = {}, dependencies = defaultDependencies) {
  const pagination = { page: query.page || 1, limit: query.limit || 20 };
  const filter = { ...scopedFilter(scope.fundingType, scope.organizationId) };
  if (query.status) filter.status = query.status;
  const [coupons, totalItems] = await Promise.all([
    dependencies.couponRepository.findCoupons(filter, { skip: (pagination.page - 1) * pagination.limit, limit: pagination.limit }),
    dependencies.couponRepository.countCoupons(filter),
  ]);
  const mappedCoupons = await Promise.all(coupons.map(async (coupon) => ({
    ...mapCoupon(coupon),
    stats: await dependencies.couponRepository.getCouponAccountingStats?.(coupon._id || coupon.id) || {
      platformFundedDiscount: 0,
      organizerFundedDiscount: 0,
    },
  })));
  return {
    coupons: mappedCoupons,
    pagination: { page: pagination.page, limit: pagination.limit, totalItems, totalPages: Math.ceil(totalItems / pagination.limit) },
  };
}

export async function getCoupon(scope, couponId, dependencies = defaultDependencies) {
  const coupon = await dependencies.couponRepository.findCouponById(couponId, scopedFilter(scope.fundingType, scope.organizationId));
  if (!coupon) return serviceError("Coupon not found", HTTP_STATUS.NOT_FOUND);
  return {
    coupon: {
      ...mapCoupon(coupon),
      stats: await dependencies.couponRepository.getCouponAccountingStats?.(coupon._id || coupon.id) || {
        platformFundedDiscount: 0,
        organizerFundedDiscount: 0,
      },
    },
  };
}

export async function listCustomerRewards(customerId, dependencies = defaultDependencies) {
  const rewards = await dependencies.couponRewardRepository.findCustomerRewards(customerId);
  return { rewards: rewards.map(mapReward) };
}

export async function issueRewardsForPaidOrder(order, dependencies = defaultDependencies, options = {}) {
  if (!order?.customer || order.paymentStatus !== "PAID") return [];
  const ticketCount = (order.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  if (ticketCount < 1) return [];
  const rewardCoupons = await dependencies.couponRepository.findRewardCoupons({ session: options.session });
  const issued = [];
  for (const coupon of rewardCoupons) {
    const threshold = Number(coupon.rewardRule?.qualifyingTicketCount || 0);
    if (!threshold || ticketCount < threshold) continue;
    if (coupon.event && getId(coupon.event) !== getId(order.event)) continue;
    if (coupon.customers?.length && !coupon.customers.some((customer) => getId(customer) === getId(order.customer))) continue;
    try {
      issued.push(await dependencies.couponRewardRepository.createCouponReward({
        coupon: coupon._id,
        customer: order.customer,
        qualifyingOrder: order._id,
        status: "ISSUED",
      }, { session: options.session }));
    } catch (error) {
      if (error?.code !== 11000) throw error;
    }
  }
  return issued;
}

export { mapReward };

export async function disableCoupon(scope, couponId, dependencies = defaultDependencies) {
  const coupon = await dependencies.couponRepository.disableCoupon(couponId, scopedFilter(scope.fundingType, scope.organizationId));
  if (!coupon) return serviceError("Coupon not found or already disabled", HTTP_STATUS.NOT_FOUND);
  return { coupon: mapCoupon(coupon) };
}

export { generateCouponCode, normalizeCode };
