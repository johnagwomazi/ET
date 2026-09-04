import mongoose from "mongoose";
import { DEFAULT_CURRENCY, WITHDRAWAL_STATUS } from "../constants/ticketing.constants.js";
import { WITHDRAWAL_PROVIDER_STATUS } from "../constants/finance.constants.js";

const withdrawalSchema = new mongoose.Schema(
  {
    reference: { type: String, required: true, unique: true, trim: true },
    organization: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    amount: { type: Number, required: true, min: 1 },
    amountMinor: {
      type: Number,
      required: true,
      min: 1,
      default() {
        return Math.round(Number(this.amount || 0) * 100);
      },
    },
    currency: { type: String, default: DEFAULT_CURRENCY, uppercase: true, trim: true },
    status: { type: String, enum: Object.values(WITHDRAWAL_STATUS), default: WITHDRAWAL_STATUS.PENDING },
    transferReference: { type: String, default: "", trim: true },
    providerTransferCode: { type: String, default: "", trim: true },
    providerRecipientCode: { type: String, default: "", trim: true, select: false },
    transferStatus: {
      type: String,
      enum: Object.values(WITHDRAWAL_PROVIDER_STATUS),
      default: WITHDRAWAL_PROVIDER_STATUS.NOT_STARTED,
    },
    payoutDestination: {
      accountName: { type: String, default: "", trim: true },
      accountNumberLast4: { type: String, default: "", trim: true },
      bankName: { type: String, default: "", trim: true },
    },
    rejectionReason: { type: String, default: "", trim: true },
    failureReason: { type: String, default: "", trim: true },
    reviewedAt: { type: Date, default: null },
    approvedAt: { type: Date, default: null },
    rejectedAt: { type: Date, default: null },
    paidAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

withdrawalSchema.index({ organization: 1, status: 1, createdAt: -1 });
withdrawalSchema.index({ organization: 1, createdAt: -1 });
withdrawalSchema.index({ status: 1, createdAt: -1 });
withdrawalSchema.index({ requestedBy: 1, createdAt: -1 });
withdrawalSchema.index(
  { transferReference: 1 },
  { unique: true, partialFilterExpression: { transferReference: { $type: "string", $gt: "" } } }
);

const Withdrawal = mongoose.models.Withdrawal || mongoose.model("Withdrawal", withdrawalSchema);

export default Withdrawal;
