import mongoose from "mongoose";

const paymentEventSchema = new mongoose.Schema(
  {
    provider: { type: String, default: "paystack", trim: true },
    event: { type: String, required: true, trim: true },
    reference: { type: String, required: true, trim: true },
    payload: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
    status: { type: String, enum: ["PROCESSING", "PROCESSED", "FAILED"], default: "PROCESSING" },
    attempts: { type: Number, default: 1, min: 1 },
    processingStartedAt: { type: Date, default: Date.now },
    processedAt: { type: Date, default: null },
    failureReason: { type: String, default: "", maxlength: 120 },
  },
  { timestamps: true }
);

paymentEventSchema.index({ provider: 1, event: 1, reference: 1 }, { unique: true });
paymentEventSchema.index({ status: 1, processingStartedAt: 1 });

const PaymentEvent = mongoose.models.PaymentEvent || mongoose.model("PaymentEvent", paymentEventSchema);

export default PaymentEvent;
