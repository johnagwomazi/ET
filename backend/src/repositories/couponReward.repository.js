import CouponReward from "../models/couponReward.model.js";

function applySession(query, options = {}) {
  return options.session ? query.session(options.session) : query;
}

export async function createCouponReward(rewardData, options = {}) {
  return new CouponReward(rewardData).save({ session: options.session });
}

export async function findCustomerRewards(customerId, options = {}) {
  return applySession(
    CouponReward.find({ customer: customerId }).populate("coupon").populate("qualifyingOrder").sort({ issuedAt: -1 }),
    options
  );
}

export async function findRewardByCustomerAndCoupon(customerId, couponId, options = {}) {
  return applySession(CouponReward.findOne({ customer: customerId, coupon: couponId, status: "ISSUED" }), options);
}

export async function redeemRewardForCustomerAndCoupon(customerId, couponId, orderId, options = {}) {
  return applySession(
    CouponReward.findOneAndUpdate(
      { customer: customerId, coupon: couponId, status: "ISSUED" },
      { $set: { status: "REDEEMED", redeemedOrder: orderId, redeemedAt: new Date() } },
      { new: true, runValidators: true }
    ),
    options
  );
}
