import Coupon from "../models/coupon.model.js";
import CouponRedemption from "../models/couponRedemption.model.js";
import Order from "../models/order.model.js";
import { COUPON_REDEMPTION_STATUS, COUPON_STATUS } from "../constants/coupon.constants.js";

function applySession(query, options = {}) {
  return options.session ? query.session(options.session) : query;
}

export function isPaidCouponOrder(redemption) {
  return ["PAID", "PARTIALLY_REFUNDED", "REFUNDED"].includes(redemption?.order?.paymentStatus) ||
    ["PAID", "PARTIALLY_REFUNDED", "REFUNDED"].includes(redemption?.order?.orderStatus);
}

export async function createCoupon(couponData, options = {}) {
  return new Coupon(couponData).save({ session: options.session });
}

export async function findCoupons(filter = {}, options = {}) {
  return applySession(
    Coupon.find(filter)
      .populate("event", "eventName slug")
      .populate("organization", "organizationName")
      .sort({ createdAt: -1 })
      .skip(options.skip || 0)
      .limit(options.limit || 20),
    options
  );
}

export async function countCoupons(filter = {}, options = {}) {
  return applySession(Coupon.countDocuments(filter), options);
}

export async function findRewardCoupons(options = {}) {
  return applySession(
    Coupon.find({ "rewardRule.qualifyingTicketCount": { $ne: null }, status: COUPON_STATUS.ACTIVE }).sort({ createdAt: 1 }),
    options
  );
}

export async function getCouponAccountingStats(couponId, options = {}) {
  const [summary] = await applySession(Order.aggregate([
    { $match: { "coupon.id": couponId, paymentStatus: { $in: ["PAID", "PARTIALLY_REFUNDED", "REFUNDED"] } } },
    { $group: {
      _id: null,
      platformFundedDiscount: { $sum: { $ifNull: ["$platformFundedDiscount", 0] } },
      organizerFundedDiscount: { $sum: { $ifNull: ["$organizerFundedDiscount", 0] } },
    } },
  ]), options);
  return summary || { platformFundedDiscount: 0, organizerFundedDiscount: 0 };
}

export async function findCouponById(couponId, filter = {}, options = {}) {
  return applySession(
    Coupon.findOne({ _id: couponId, ...filter })
      .populate("event", "eventName slug")
      .populate("organization", "organizationName"),
    options
  );
}

export async function findCouponByCode(code, options = {}) {
  return applySession(
    Coupon.findOne({ code: String(code || "").trim().toUpperCase() }),
    options
  );
}

export async function countCouponRedemptions(couponId, customerId, options = {}) {
  const filter = {
    coupon: couponId,
    status: { $in: [COUPON_REDEMPTION_STATUS.RESERVED, COUPON_REDEMPTION_STATUS.REDEEMED] },
  };
  if (customerId) filter.customer = customerId;
  return applySession(CouponRedemption.countDocuments(filter), options);
}

export async function disableCoupon(couponId, filter = {}, options = {}) {
  return applySession(
    Coupon.findOneAndUpdate(
      { _id: couponId, ...filter, status: COUPON_STATUS.ACTIVE },
      { $set: { status: COUPON_STATUS.DISABLED } },
      { new: true, runValidators: true }
    ),
    options
  );
}

export async function reserveCouponRedemption({ couponId, customerId, orderId }, options = {}) {
  if (!options.session) {
    throw new Error("Coupon redemption reservation requires a database transaction session");
  }

  const now = new Date();
  const existingCustomerRedemptions = await CouponRedemption.countDocuments({
    coupon: couponId,
    customer: customerId,
    status: { $in: [COUPON_REDEMPTION_STATUS.RESERVED, COUPON_REDEMPTION_STATUS.REDEEMED] },
  }).session(options.session);

  const coupon = await Coupon.findOneAndUpdate(
    {
      _id: couponId,
      status: COUPON_STATUS.ACTIVE,
      $and: [
        { $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
        { $or: [{ endsAt: null }, { endsAt: { $gt: now } }] },
        { $expr: { $or: [{ $eq: ["$maxRedemptions", null] }, { $lt: ["$redemptionCount", "$maxRedemptions"] }] } },
        { $or: [{ customers: { $size: 0 } }, { customers: customerId }] },
      ],
    },
    { $inc: { redemptionCount: 1 } },
    { new: true, session: options.session, runValidators: true }
  );

  if (!coupon) return null;

  if (coupon.maxRedemptionsPerCustomer && existingCustomerRedemptions >= coupon.maxRedemptionsPerCustomer) {
    await Coupon.updateOne({ _id: couponId }, { $inc: { redemptionCount: -1 } }, { session: options.session });
    return null;
  }

  try {
    return await CouponRedemption.create([{
      coupon: couponId,
      customer: customerId,
      order: orderId,
      status: COUPON_REDEMPTION_STATUS.RESERVED,
      reservedAt: now,
    }], { session: options.session }).then(([redemption]) => redemption);
  } catch (error) {
    await Coupon.updateOne({ _id: couponId }, { $inc: { redemptionCount: -1 } }, { session: options.session });
    throw error;
  }
}

export async function redeemCouponRedemption(redemptionId, options = {}) {
  if (!options.session) throw new Error("Coupon redemption settlement requires a database transaction session");
  return CouponRedemption.findOneAndUpdate(
    { _id: redemptionId, status: COUPON_REDEMPTION_STATUS.RESERVED },
    { $set: { status: COUPON_REDEMPTION_STATUS.REDEEMED, redeemedAt: new Date() } },
    { new: true, session: options.session }
  );
}

export async function releaseCouponRedemption(redemptionId, options = {}) {
  if (!options.session) throw new Error("Coupon redemption release requires a database transaction session");
  const redemption = await CouponRedemption.findOneAndUpdate(
    { _id: redemptionId, status: COUPON_REDEMPTION_STATUS.RESERVED },
    { $set: { status: COUPON_REDEMPTION_STATUS.RELEASED, releasedAt: new Date() } },
    { new: true, session: options.session }
  );
  if (!redemption) return null;
  await Coupon.updateOne({ _id: redemption.coupon }, { $inc: { redemptionCount: -1 } }, { session: options.session });
  return redemption;
}

export async function redeemCouponRedemptionForOrder(orderId, options = {}) {
  if (!options.session) throw new Error("Coupon redemption settlement requires a database transaction session");
  return CouponRedemption.findOneAndUpdate(
    { order: orderId, status: COUPON_REDEMPTION_STATUS.RESERVED },
    { $set: { status: COUPON_REDEMPTION_STATUS.REDEEMED, redeemedAt: new Date() } },
    { new: true, session: options.session }
  );
}

export async function releaseCouponRedemptionForOrder(orderId, options = {}) {
  if (!options.session) throw new Error("Coupon redemption release requires a database transaction session");
  const redemption = await CouponRedemption.findOneAndUpdate(
    { order: orderId, status: COUPON_REDEMPTION_STATUS.RESERVED },
    { $set: { status: COUPON_REDEMPTION_STATUS.RELEASED, releasedAt: new Date() } },
    { new: true, session: options.session }
  );
  if (!redemption) return null;
  await Coupon.updateOne({ _id: redemption.coupon }, { $inc: { redemptionCount: -1 } }, { session: options.session });
  return redemption;
}

export async function releaseExpiredCouponReservations(before, options = {}) {
  if (!options.session) throw new Error("Expired coupon cleanup requires a database transaction session");
  const redemptions = await CouponRedemption.find({
    status: COUPON_REDEMPTION_STATUS.RESERVED,
    reservedAt: { $lt: before },
  }).select("_id order").populate("order", "paymentStatus orderStatus").session(options.session).limit(100);

  let released = 0;
  for (const redemption of redemptions) {
    if (isPaidCouponOrder(redemption)) {
      continue;
    }
    const releasedRedemption = await releaseCouponRedemption(redemption._id, options);
    if (releasedRedemption) released += 1;
  }
  return released;
}
