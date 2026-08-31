import TicketType from "../models/ticketType.model.js";

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
  return applySession(
    TicketType.findOneAndUpdate(
      {
        _id: ticketTypeId,
        event: eventId,
        organization: organizationId,
      },
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
        $expr: {
          $gte: [{ $subtract: ["$quantity", "$soldQuantity"] }, quantity],
        },
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
        soldQuantity: { $gte: quantity },
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
