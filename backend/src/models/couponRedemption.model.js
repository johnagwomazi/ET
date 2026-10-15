import mongoose from "mongoose";
import { COUPON_REDEMPTION_STATUS } from "../constants/coupon.constants.js";

const couponRedemptionSchema = new mongoose.Schema(
  {
    coupon: { type: mongoose.Schema.Types.ObjectId, ref: "Coupon", required: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
    status: { type: String, enum: Object.values(COUPON_REDEMPTION_STATUS), required: true },
    reservedAt: { type: Date, default: Date.now },
    redeemedAt: { type: Date, default: null },
    releasedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

couponRedemptionSchema.index({ coupon: 1, customer: 1, order: 1 }, { unique: true });
couponRedemptionSchema.index({ coupon: 1, customer: 1, status: 1 });
couponRedemptionSchema.index({ order: 1, status: 1 });

const CouponRedemption = mongoose.models.CouponRedemption || mongoose.model("CouponRedemption", couponRedemptionSchema);

export default CouponRedemption;
