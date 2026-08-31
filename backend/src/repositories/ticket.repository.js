import Ticket from "../models/ticket.model.js";

function applySession(query, options = {}) {
  return options.session ? query.session(options.session) : query;
}

export async function createTickets(ticketDataList, options = {}) {
  return Ticket.insertMany(ticketDataList, { session: options.session, ordered: true });
}

export async function findTickets(filter = {}, options = {}) {
  return applySession(
    Ticket.find(filter)
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
        checkedInAt: new Date(),
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

export async function markTicketsByOrder(orderId, status, options = {}) {
  return applySession(
    Ticket.updateMany(
      {
        order: orderId,
        status: { $ne: "USED" },
      },
      { status },
      { runValidators: true }
    ),
    options
  );
}
