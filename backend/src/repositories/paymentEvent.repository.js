import PaymentEvent from "../models/paymentEvent.model.js";
import { trustedOperator } from "../utils/trustedFilter.util.js";

export async function createPaymentEvent(paymentEventData) {
  const paymentEvent = new PaymentEvent(paymentEventData);
  return paymentEvent.save();
}

export async function claimPaymentEventRetry(provider, event, reference, staleBefore = new Date(Date.now() - 120000)) {
  return PaymentEvent.findOneAndUpdate(
    {
      provider,
      event,
      reference,
      $or: [
        { status: "FAILED" },
        { status: "PROCESSING", processingStartedAt: trustedOperator({ $lte: staleBefore }) },
      ],
    },
    {
      status: "PROCESSING",
      processingStartedAt: new Date(),
      failureReason: "",
      $inc: { attempts: 1 },
    },
    { new: true, runValidators: true }
  );
}

export async function markPaymentEventProcessed(provider, event, reference) {
  return PaymentEvent.findOneAndUpdate(
    { provider, event, reference, status: "PROCESSING" },
    { status: "PROCESSED", processedAt: new Date(), failureReason: "" },
    { new: true, runValidators: true }
  );
}

export async function markPaymentEventFailed(provider, event, reference, failureReason = "PROCESSING_FAILED") {
  return PaymentEvent.findOneAndUpdate(
    { provider, event, reference, status: "PROCESSING" },
    { status: "FAILED", failureReason: String(failureReason).slice(0, 120) },
    { new: true, runValidators: true }
  );
}
