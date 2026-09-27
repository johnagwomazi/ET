import mongoose from "mongoose";
import TicketType from "../models/ticketType.model.js";
import { trustedOperator } from "../utils/trustedFilter.util.js";

function applySession(query, options = {}) {
  return options.session ? query.session(options.session) : query;
}

export async function createTicketType(ticketTypeData, options = {}) {
  const ticketType = new TicketType(ticketTypeData);
  return ticketType.save({ session: options.session });
}

export async function findTicketTypes(filter = {}, options = {}) {
  return applySession(
    TicketType.find(filter)
      .sort({ position: 1, createdAt: 1 })
      .skip(options.skip || 0)
      .limit(options.limit || 100),
    options
  );
}

export async function countTicketTypes(filter = {}, options = {}) {
  return applySession(TicketType.countDocuments(filter), options);
}

export async function getTicketInventoryTotals(eventId, organizationId, options = {}) {
  const pipeline = [
    {
      $match: {
        event: new mongoose.Types.ObjectId(eventId),
        organization: new mongoose.Types.ObjectId(organizationId),
      },
    },
    {
      $group: {
        _id: null,
        allocatedQuantity: { $sum: "$quantity" },
        issuedQuantity: { $sum: "$soldQuantity" },
      },
    },
  ];
  let query = TicketType.aggregate(pipeline);
  if (options.session) query = query.session(options.session);
  const [totals] = await query;
  return {
    allocatedQuantity: Number(totals?.allocatedQuantity || 0),
    issuedQuantity: Number(totals?.issuedQuantity || 0),
  };
}

export async function findTicketTypeByIdAndEvent(ticketTypeId, eventId, organizationId, options = {}) {
  return applySession(
    TicketType.findOne({
      _id: ticketTypeId,
      event: eventId,
      organization: organizationId,
    }),
    options
  );
}

export async function updateTicketTypeByIdAndEvent(ticketTypeId, eventId, organizationId, updateData, options = {}) {
  const filter = {
    _id: ticketTypeId,
    event: eventId,
    organization: organizationId,
  };

  if (updateData.quantity !== undefined) {
    filter.soldQuantity = trustedOperator({ $lte: updateData.quantity });
  }

  return applySession(
    TicketType.findOneAndUpdate(
      filter,
      updateData,
      {
        new: true,
        runValidators: true,
      }
    ),
    options
  );
}

export async function reserveTicketInventory(ticketTypeId, eventId, organizationId, quantity, options = {}) {
  return applySession(
    TicketType.findOneAndUpdate(
      {
        _id: ticketTypeId,
        event: eventId,
        organization: organizationId,
        status: "ACTIVE",
        $expr: trustedOperator({
          $gte: [{ $subtract: ["$quantity", "$soldQuantity"] }, quantity],
        }),
      },
      {
        $inc: { soldQuantity: quantity },
      },
      {
        new: true,
        runValidators: true,
      }
    ),
    options
  );
}

export async function releaseTicketInventory(ticketTypeId, quantity, options = {}) {
  return applySession(
    TicketType.findOneAndUpdate(
      {
        _id: ticketTypeId,
        soldQuantity: trustedOperator({ $gte: quantity }),
      },
      {
        $inc: { soldQuantity: -quantity },
      },
      {
        new: true,
        runValidators: true,
      }
    ),
    options
  );
}
