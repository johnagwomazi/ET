import PaymentEvent from "../models/paymentEvent.model.js";

export async function createPaymentEvent(paymentEventData) {
  const paymentEvent = new PaymentEvent(paymentEventData);
  return paymentEvent.save();
}
