import mongoose from "mongoose";
import { REFUND_STATUS } from "../constants/ticketing.constants.js";

const refundSchema = new mongoose.Schema(
  {
    reference: { type: String, required: true, unique: true, trim: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
    organization: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true },
    event: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true, min: 1 },
    reason: { type: String, required: true, trim: true, maxlength: 500 },
    status: { type: String, enum: Object.values(REFUND_STATUS), default: REFUND_STATUS.PENDING },
    providerReference: { type: String, default: "", trim: true },
    processedAt: { type: Date, default: null },
    failureReason: { type: String, default: "", trim: true },
  },
  { timestamps: true }
);

refundSchema.index({ order: 1, status: 1 });
refundSchema.index({ organization: 1, createdAt: -1 });
refundSchema.index({ status: 1, processedAt: -1, createdAt: -1 });
refundSchema.index({ organization: 1, event: 1, status: 1, processedAt: -1 });

const Refund = mongoose.models.Refund || mongoose.model("Refund", refundSchema);

export default Refund;
