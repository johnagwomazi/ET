import mongoose from "mongoose";
import Ticket from "../models/ticket.model.js";
import { escapeRegex } from "../utils/query.util.js";
import { trustedOperator } from "../utils/trustedFilter.util.js";

function applySession(query, options = {}) {
  return options.session ? query.session(options.session) : query;
}

export async function createTickets(ticketDataList, options = {}) {
  return Ticket.insertMany(ticketDataList, { session: options.session, ordered: true });
}

export async function findTickets(filter = {}, options = {}) {
  return applySession(
    Ticket.find(filter)
      .select("+qrCodeDataUrl")
      .populate("event")
      .populate("ticketType")
      .populate("order")
      .populate("checkedInBy")
      .sort({ createdAt: -1 })
      .skip(options.skip || 0)
      .limit(options.limit || 20),
    options
  );
}

export async function countTickets(filter = {}, options = {}) {
  return applySession(Ticket.countDocuments(filter), options);
}

function buildCustomerHistoryMatch(historyStatus) {
  if (historyStatus === "ATTENDED") {
    return { checkedInAt: { $ne: null } };
  }

  if (historyStatus === "REFUNDED") {
    return { checkedInAt: null, status: "REFUNDED" };
  }

  if (historyStatus === "CANCELED") {
    return {
      checkedInAt: null,
      $or: [
        { status: "CANCELED" },
        { "eventDocument.status": "CANCELED" },
      ],
    };
  }

  if (historyStatus === "COMPLETED") {
    return {
      checkedInAt: null,
      status: { $nin: ["CANCELED", "REFUNDED"] },
      "eventDocument.status": "COMPLETED",
    };
  }

  return {
    $or: [
      { checkedInAt: { $ne: null } },
      { status: { $in: ["CANCELED", "REFUNDED"] } },
      { "eventDocument.status": { $in: ["CANCELED", "COMPLETED"] } },
    ],
  };
}

export async function findCustomerHistoryTickets(customerId, options = {}) {
  const purchaser = mongoose.isValidObjectId(customerId)
    ? new mongoose.Types.ObjectId(customerId)
    : customerId;
  const skip = options.skip || 0;
  const limit = options.limit || 20;
  const [result] = await Ticket.aggregate([
    { $match: { purchaser } },
    {
      $lookup: {
        from: "events",
        localField: "event",
        foreignField: "_id",
        as: "eventDocument",
      },
    },
    { $unwind: "$eventDocument" },
    { $match: buildCustomerHistoryMatch(options.historyStatus) },
    {
      $lookup: {
        from: "tickettypes",
        localField: "ticketType",
        foreignField: "_id",
        as: "ticketTypeDocument",
      },
    },
    { $unwind: { path: "$ticketTypeDocument", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "orders",
        localField: "order",
        foreignField: "_id",
        as: "orderDocument",
      },
    },
    { $unwind: { path: "$orderDocument", preserveNullAndEmptyArrays: true } },
    { $sort: { "eventDocument.startAt": -1, createdAt: -1 } },
    {
      $facet: {
        records: [{ $skip: skip }, { $limit: limit }],
        metadata: [{ $count: "totalItems" }],
      },
    },
  ]);

  const tickets = (result?.records || []).map((record) => ({
    ...record,
    event: record.eventDocument,
    ticketType: record.ticketTypeDocument || record.ticketType,
    order: record.orderDocument || record.order,
  }));

  return {
    tickets,
    totalItems: result?.metadata?.[0]?.totalItems || 0,
  };
}

export async function findTicketByReference(reference, options = {}) {
  return applySession(
    Ticket.findOne({ reference })
      .select("+tokenHash +qrToken +qrCodeDataUrl")
      .populate("event")
      .populate("ticketType")
      .populate("order"),
    options
  );
}

export async function findTicketByTokenHash(tokenHash, options = {}) {
  return applySession(
    Ticket.findOne({ tokenHash })
      .select("+tokenHash +qrToken +qrCodeDataUrl")
      .populate("event")
      .populate("ticketType")
      .populate("order"),
    options
  );
}

export async function findTicketByCheckInCode(checkInCode, options = {}) {
  return applySession(
    Ticket.findOne({ checkInCode })
      .select("+tokenHash +qrToken +qrCodeDataUrl")
      .populate("event")
      .populate("ticketType")
      .populate("order"),
    options
  );
}

export async function deleteTicketsByOrders(orderIds, options = {}) {
  return Ticket.deleteMany({ order: { $in: orderIds } }, { session: options.session });
}

export async function findTicketIdsByEventAndReference(eventId, reference, options = {}) {
  const expression = new RegExp(escapeRegex(reference), "i");
  const query = Ticket.find({ event: eventId, reference: expression })
    .select("_id")
    .limit(options.limit || 50)
    .lean();

  const tickets = await applySession(query, options);
  return tickets.map((ticket) => ticket._id);
}

export async function markTicketUsed(ticketId, actorUserId, options = {}) {
  return applySession(
    Ticket.findOneAndUpdate(
      {
        _id: ticketId,
        status: "VALID",
        checkedInAt: null,
      },
      {
        status: "USED",
        checkedInAt: options.checkedInAt || new Date(),
        checkedInBy: actorUserId,
      },
      {
        new: true,
        runValidators: true,
      }
    )
      .populate("event")
      .populate("ticketType")
      .populate("order"),
    options
  );
}

export async function revertTicketCheckIn(ticketId, actorUserId, checkedInAt, options = {}) {
  return applySession(
    Ticket.findOneAndUpdate(
      {
        _id: ticketId,
        status: "USED",
        checkedInBy: actorUserId,
        checkedInAt,
      },
      {
        status: "VALID",
        checkedInAt: null,
        checkedInBy: null,
      },
      {
        new: true,
        runValidators: true,
      }
    ),
    options
  );
}

export async function markTicketsByOrder(orderId, status, options = {}) {
  return applySession(
    Ticket.updateMany(
      {
        order: orderId,
        status: trustedOperator({ $ne: "USED" }),
      },
      { status },
      { runValidators: true }
    ),
    options
  );
}

export async function findEventNotificationRecipients(eventId, options = {}) {
  const event = mongoose.isValidObjectId(eventId) ? new mongoose.Types.ObjectId(eventId) : eventId;
  const statuses = options.ticketStatuses || ["VALID"];
  const paymentStatuses = options.paymentStatuses || ["PAID", "PARTIALLY_REFUNDED"];

  return Ticket.aggregate([
    { $match: { event, purchaser: { $ne: null }, status: { $in: statuses } } },
    { $lookup: { from: "orders", localField: "order", foreignField: "_id", as: "orderDocument" } },
    { $unwind: "$orderDocument" },
    { $match: { "orderDocument.paymentStatus": { $in: paymentStatuses } } },
    { $group: { _id: "$purchaser", ticketCount: { $sum: 1 } } },
    { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "user" } },
    { $unwind: "$user" },
    { $match: { "user.isDeleted": false, "user.role": "CUSTOMER", "user.accountStatus": "ACTIVE" } },
    {
      $project: {
        _id: "$user._id",
        firstName: "$user.firstName",
        lastName: "$user.lastName",
        email: "$user.email",
        role: "$user.role",
        organization: "$user.organization",
        accountStatus: "$user.accountStatus",
        ticketCount: 1,
      },
    },
  ]);
}
