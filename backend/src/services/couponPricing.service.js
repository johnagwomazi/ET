import { COUPON_FUNDING_TYPES, COUPON_STATUS } from "../constants/coupon.constants.js";
import * as couponRepository from "../repositories/coupon.repository.js";
import * as ticketTypeRepository from "../repositories/ticketType.repository.js";
import * as couponRewardRepository from "../repositories/couponReward.repository.js";

const defaultDependencies = { couponRepository, ticketTypeRepository, couponRewardRepository };
const MINOR_UNITS_PER_MAJOR = 100;

function getId(value) {
  if (!value) return null;
  if (typeof value === "string") return value;
  return String(value._id || value);
}

function toMinorUnits(value) {
  return Math.round((Number(value) || 0) * MINOR_UNITS_PER_MAJOR);
}

function fromMinorUnits(value) {
  return Math.round(Number(value || 0)) / MINOR_UNITS_PER_MAJOR;
}

function parseDecimal(value) {
  const text = String(value);
  const [wholePart, fractionPart = ""] = text.split(".");
  const fraction = fractionPart.replace(/[^0-9]/g, "");
  const denominator = 10n ** BigInt(fraction.length);
  const numerator = BigInt(wholePart || "0") * denominator + BigInt(fraction || "0");
  return { numerator, denominator };
}

function roundedPercentageDiscount(amountMinor, percentage) {
  const { numerator, denominator } = parseDecimal(percentage);
  const divisor = 100n * denominator;
  const value = (BigInt(amountMinor) * numerator + divisor / 2n) / divisor;
  return Math.min(amountMinor, Number(value));
}

function isEligibleByList(list, id) {
  return !Array.isArray(list) || list.length === 0 || list.some((value) => getId(value) === String(id));
}

function isCouponCurrentlyUsable(coupon, now) {
  if (!coupon || coupon.status !== COUPON_STATUS.ACTIVE) return false;
  if (coupon.startsAt && new Date(coupon.startsAt) > now) return false;
  if (coupon.endsAt && new Date(coupon.endsAt) <= now) return false;
  if (coupon.maxRedemptions !== null && coupon.maxRedemptions !== undefined && coupon.redemptionCount >= coupon.maxRedemptions) return false;
  return true;
}

function pricingError(message) {
  const error = new Error(message);
  error.code = "COUPON_NOT_ELIGIBLE";
  return error;
}

export async function calculateCouponPricing({
  couponCode,
  coupon: suppliedCoupon,
  customerId,
  eventId,
  organizationId,
  items,
  rewardEligible = false,
  now = new Date(),
}, dependencies = defaultDependencies) {
  if (!Array.isArray(items) || items.length === 0) throw pricingError("At least one ticket item is required");

  const coupon = suppliedCoupon || (couponCode
    ? await dependencies.couponRepository.findCouponByCode(couponCode)
    : null);

  const serverPricedItems = [];
  let originalSubtotalMinor = 0;

  for (const item of items) {
    const quantity = Number(item.quantity);
    if (!Number.isInteger(quantity) || quantity < 1) throw pricingError("Invalid ticket quantity");
    const ticketType = await dependencies.ticketTypeRepository.findTicketTypeByIdAndEvent(
      item.ticketTypeId,
      eventId,
      organizationId
    );
    if (!ticketType) throw pricingError("Ticket type is unavailable");
    const originalUnitPriceMinor = toMinorUnits(ticketType.price);
    const originalTotalMinor = originalUnitPriceMinor * quantity;
    originalSubtotalMinor += originalTotalMinor;
    serverPricedItems.push({
      ticketTypeId: getId(ticketType),
      name: ticketType.name,
      quantity,
      originalUnitPriceMinor,
      originalTotalMinor,
    });
  }

  if (!couponCode && !suppliedCoupon) {
    return buildPricingResult(serverPricedItems, originalSubtotalMinor, null);
  }
  if (!coupon || !isCouponCurrentlyUsable(coupon, now)) throw pricingError("Coupon is invalid or expired");
  if (!Object.values(COUPON_FUNDING_TYPES).includes(coupon.fundingType)) throw pricingError("Coupon funding type is invalid");
  if (coupon.organization && getId(coupon.organization) !== String(organizationId)) throw pricingError("Coupon is not valid for this organization");
  if (coupon.event && getId(coupon.event) !== String(eventId)) throw pricingError("Coupon is not valid for this event");
  if (!customerId || !isEligibleByList(coupon.customers, customerId)) throw pricingError("Customer is not eligible for this coupon");
  if (coupon.rewardRule?.nextPurchaseOnly) {
    const reward = rewardEligible || await dependencies.couponRewardRepository?.findRewardByCustomerAndCoupon?.(
      customerId,
      coupon._id || coupon.id
    );
    if (!reward) throw pricingError("Coupon reward is not available for this purchase");
  }

  if (coupon.maxRedemptionsPerCustomer) {
    const customerRedemptions = await dependencies.couponRepository.countCouponRedemptions(coupon._id || coupon.id, customerId);
    if (customerRedemptions >= coupon.maxRedemptionsPerCustomer) throw pricingError("Coupon redemption limit reached");
  }

  let discountAmountMinor = 0;
  for (const item of serverPricedItems) {
    item.couponEligible = isEligibleByList(coupon.ticketTypes, item.ticketTypeId);
    item.discountAmountMinor = item.couponEligible
      ? roundedPercentageDiscount(item.originalTotalMinor, coupon.discountPercent)
      : 0;
    item.discountedTotalMinor = Math.max(0, item.originalTotalMinor - item.discountAmountMinor);
    discountAmountMinor += item.discountAmountMinor;
  }

  const organizerEligibleRevenueMinor = coupon.fundingType === COUPON_FUNDING_TYPES.PLATFORM_FUNDED
    ? originalSubtotalMinor
    : originalSubtotalMinor - discountAmountMinor;

  return buildPricingResult(serverPricedItems, originalSubtotalMinor, coupon, {
    discountAmountMinor,
    organizerEligibleRevenueMinor,
  });
}

function buildPricingResult(items, originalSubtotalMinor, coupon, overrides = {}) {
  const discountAmountMinor = overrides.discountAmountMinor || 0;
  const customerPayableMinor = Math.max(0, originalSubtotalMinor - discountAmountMinor);
  const organizerEligibleRevenueMinor = overrides.organizerEligibleRevenueMinor ?? originalSubtotalMinor;
  const platformFundedDiscountMinor = coupon?.fundingType === COUPON_FUNDING_TYPES.PLATFORM_FUNDED ? discountAmountMinor : 0;
  const organizerFundedDiscountMinor = coupon?.fundingType === COUPON_FUNDING_TYPES.ORGANIZER_FUNDED ? discountAmountMinor : 0;

  return {
    originalSubtotal: fromMinorUnits(originalSubtotalMinor),
    discountAmount: fromMinorUnits(discountAmountMinor),
    customerPayableAmount: fromMinorUnits(customerPayableMinor),
    platformFundedDiscount: fromMinorUnits(platformFundedDiscountMinor),
    organizerFundedDiscount: fromMinorUnits(organizerFundedDiscountMinor),
    organizerEligibleRevenue: fromMinorUnits(organizerEligibleRevenueMinor),
    originalSubtotalMinor,
    discountAmountMinor,
    customerPayableAmountMinor: customerPayableMinor,
    platformFundedDiscountMinor,
    organizerFundedDiscountMinor,
    organizerEligibleRevenueMinor,
    coupon: coupon
      ? { id: getId(coupon), code: coupon.code, fundingType: coupon.fundingType }
      : null,
    items: items.map((item) => ({
      ticketTypeId: item.ticketTypeId,
      name: item.name,
      quantity: item.quantity,
      originalUnitPrice: fromMinorUnits(item.originalUnitPriceMinor),
      originalTotal: fromMinorUnits(item.originalTotalMinor),
      discountAmount: fromMinorUnits(item.discountAmountMinor || 0),
      discountedTotal: fromMinorUnits(item.discountedTotalMinor ?? item.originalTotalMinor),
      originalUnitPriceMinor: item.originalUnitPriceMinor,
      originalTotalMinor: item.originalTotalMinor,
      discountAmountMinor: item.discountAmountMinor || 0,
      discountedTotalMinor: item.discountedTotalMinor ?? item.originalTotalMinor,
      couponEligible: Boolean(item.couponEligible),
    })),
  };
}

export { fromMinorUnits, parseDecimal, roundedPercentageDiscount, toMinorUnits };
