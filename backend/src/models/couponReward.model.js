import mongoose from "mongoose";
import { COUPON_REWARD_STATUS } from "../constants/coupon.constants.js";

const couponRewardSchema = new mongoose.Schema(
  {
    coupon: { type: mongoose.Schema.Types.ObjectId, ref: "Coupon", required: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    qualifyingOrder: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
    redeemedOrder: { type: mongoose.Schema.Types.ObjectId, ref: "Order", default: null },
    status: { type: String, enum: Object.values(COUPON_REWARD_STATUS), default: COUPON_REWARD_STATUS.ISSUED },
    issuedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, default: null },
    redeemedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

couponRewardSchema.index({ coupon: 1, customer: 1, qualifyingOrder: 1 }, { unique: true });
couponRewardSchema.index({ customer: 1, status: 1, expiresAt: 1 });
couponRewardSchema.index({ redeemedOrder: 1 }, { sparse: true });

const CouponReward = mongoose.models.CouponReward || mongoose.model("CouponReward", couponRewardSchema);

export default CouponReward;
