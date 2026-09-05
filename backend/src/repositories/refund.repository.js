import Refund from "../models/refund.model.js";

function applySession(query, options = {}) {
  return options.session ? query.session(options.session) : query;
}

export async function createRefund(refundData, options = {}) {
  const refund = new Refund(refundData);
  return refund.save({ session: options.session });
}

export async function findRefunds(filter = {}, options = {}) {
  return applySession(
    Refund.find(filter)
      .populate("order")
      .sort({ createdAt: -1 })
      .skip(options.skip || 0)
      .limit(options.limit || 20),
    options
  );
}

export async function countRefunds(filter = {}, options = {}) {
  return applySession(Refund.countDocuments(filter), options);
}

export async function findRefundByOrderAndIdempotencyKey(orderId, idempotencyKey, options = {}) {
  return applySession(Refund.findOne({ order: orderId, idempotencyKey }).populate("order"), options);
}

export async function updateRefundByReference(reference, updateData, options = {}) {
  return applySession(
    Refund.findOneAndUpdate({ reference }, updateData, { new: true, runValidators: true }).populate("order"),
    options
  );
}
