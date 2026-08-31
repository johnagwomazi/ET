import mongoose from "mongoose";
import { WITHDRAWAL_STATUS } from "../constants/ticketing.constants.js";

const withdrawalSchema = new mongoose.Schema(
  {
    reference: { type: String, required: true, unique: true, trim: true },
    organization: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    amount: { type: Number, required: true, min: 1 },
    currency: { type: String, default: "NGN", uppercase: true, trim: true },
    status: { type: String, enum: Object.values(WITHDRAWAL_STATUS), default: WITHDRAWAL_STATUS.PENDING },
    transferReference: { type: String, default: "", trim: true },
    failureReason: { type: String, default: "", trim: true },
    reviewedAt: { type: Date, default: null },
    paidAt: { type: Date, default: null },
  },
  { timestamps: true }
);

withdrawalSchema.index({ organization: 1, status: 1, createdAt: -1 });

const Withdrawal = mongoose.models.Withdrawal || mongoose.model("Withdrawal", withdrawalSchema);

export default Withdrawal;
