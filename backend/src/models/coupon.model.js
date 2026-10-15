import mongoose from "mongoose";
import { COUPON_FUNDING_TYPES, COUPON_STATUS } from "../constants/coupon.constants.js";

const rewardRuleSchema = new mongoose.Schema(
  {
    qualifyingTicketCount: { type: Number, min: 1, default: null },
    nextPurchaseOnly: { type: Boolean, default: false },
  },
  { _id: false }
);

const couponSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, trim: true, uppercase: true, maxlength: 40 },
    fundingType: { type: String, enum: Object.values(COUPON_FUNDING_TYPES), required: true },
    organization: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    discountPercent: { type: Number, required: true, min: 1, max: 100 },
    event: { type: mongoose.Schema.Types.ObjectId, ref: "Event", default: null },
    ticketTypes: [{ type: mongoose.Schema.Types.ObjectId, ref: "TicketType" }],
    customers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    startsAt: { type: Date, default: null },
    endsAt: { type: Date, default: null },
    status: { type: String, enum: Object.values(COUPON_STATUS), default: COUPON_STATUS.ACTIVE },
    maxRedemptions: { type: Number, min: 1, default: null },
    maxRedemptionsPerCustomer: { type: Number, min: 1, default: null },
    redemptionCount: { type: Number, min: 0, default: 0 },
    rewardRule: { type: rewardRuleSchema, default: null },
  },
  { timestamps: true }
);

couponSchema.index({ organization: 1, status: 1, createdAt: -1 });
couponSchema.index({ event: 1, status: 1, startsAt: 1, endsAt: 1 });
couponSchema.index({ customers: 1, status: 1 });

const Coupon = mongoose.models.Coupon || mongoose.model("Coupon", couponSchema);

export default Coupon;
