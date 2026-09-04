import Order from "../models/order.model.js";

function applySession(query, options = {}) {
  return options.session ? query.session(options.session) : query;
}

export async function createOrder(orderData, options = {}) {
  const order = new Order(orderData);
  return order.save({ session: options.session });
}

export async function findOrderByReference(reference, options = {}) {
  return applySession(
    Order.findOne({ reference })
      .populate("event")
      .populate("organization")
      .populate("customer")
      .populate("items.ticketType"),
    options
  );
}

export async function findOrderById(orderId, options = {}) {
  return applySession(
    Order.findById(orderId)
      .populate("event")
      .populate("organization")
      .populate("customer")
      .populate("items.ticketType"),
    options
  );
}

export async function findOrderByPaymentReference(paymentReference, options = {}) {
  return applySession(
    Order.findOne({ paymentReference })
      .populate("event")
      .populate("organization")
      .populate("customer")
      .populate("items.ticketType"),
    options
  );
}

export async function findOrderByCustomerAndIdempotencyKey(customerId, idempotencyKey, options = {}) {
  return applySession(
    Order.findOne({ customer: customerId, idempotencyKey })
      .populate("event")
      .populate("items.ticketType"),
    options
  );
}

export async function findOrders(filter = {}, options = {}) {
  return applySession(
    Order.find(filter)
      .populate("event")
      .populate("items.ticketType")
      .sort({ [options.sortBy || "createdAt"]: options.sortOrder || -1 })
      .skip(options.skip || 0)
      .limit(options.limit || 10),
    options
  );
}

export async function countOrders(filter = {}, options = {}) {
  return applySession(Order.countDocuments(filter), options);
}

export async function updateOrderByReference(reference, updateData, options = {}) {
  return applySession(
    Order.findOneAndUpdate({ reference }, updateData, { new: true, runValidators: true })
      .populate("event")
      .populate("organization")
      .populate("customer")
      .populate("items.ticketType"),
    options
  );
}

export async function getOrganizationFinancialAggregation(organizationId, eventId = null) {
  const match = {
    organization: organizationId,
    orderStatus: { $in: ["PAID", "PARTIALLY_REFUNDED", "REFUNDED"] },
  };

  if (eventId) {
    match.event = eventId;
  }

  const [summary] = await Order.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        grossSales: { $sum: "$total" },
        refundedAmount: { $sum: "$refundedAmount" },
        paidOrders: { $sum: { $cond: [{ $eq: ["$paymentStatus", "PAID"] }, 1, 0] } },
      },
    },
  ]);

  return summary || { grossSales: 0, refundedAmount: 0, paidOrders: 0 };
}
