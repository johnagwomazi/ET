import mongoose from "mongoose";

const paymentEventSchema = new mongoose.Schema(
  {
    provider: { type: String, default: "paystack", trim: true },
    event: { type: String, required: true, trim: true },
    reference: { type: String, required: true, trim: true },
    payload: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
    processedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

paymentEventSchema.index({ provider: 1, event: 1, reference: 1 }, { unique: true });

const PaymentEvent = mongoose.models.PaymentEvent || mongoose.model("PaymentEvent", paymentEventSchema);

export default PaymentEvent;
