import { TICKET_TYPE_STATUS } from "../constants/ticketing.constants.js";
import { getEffectiveTicketTypeStatus } from "./ticketTypeAvailability.util.js";

export function getDocumentId(document) {
  if (!document) {
    return null;
  }

  if (typeof document === "string") {
    return document;
  }

  if (document._id) {
    return document._id.toString();
  }

  return document.toString();
}

function mapEventSummary(eventDocument) {
  if (!eventDocument || typeof eventDocument !== "object" || !eventDocument.eventName) {
    return null;
  }

  const event = typeof eventDocument.toObject === "function"
    ? eventDocument.toObject()
    : eventDocument;

  return {
    id: getDocumentId(event),
    eventName: event.eventName,
    slug: event.slug || "",
    banner: event.banner || {},
    venue: event.venue || {},
    startAt: event.startAt || null,
    endAt: event.endAt || null,
    status: event.status || null,
  };
}

function mapTicketTypeSummary(ticketTypeDocument) {
  if (!ticketTypeDocument || typeof ticketTypeDocument !== "object" || !ticketTypeDocument.name) {
    return null;
  }

  const ticketType = typeof ticketTypeDocument.toObject === "function"
    ? ticketTypeDocument.toObject()
    : ticketTypeDocument;

  return {
    id: getDocumentId(ticketType),
    name: ticketType.name,
    description: ticketType.description || "",
    price: Number(ticketType.price || 0),
    currency: ticketType.currency || "NGN",
  };
}

function mapOrderSummary(orderDocument) {
  if (!orderDocument || typeof orderDocument !== "object" || !orderDocument.reference) {
    return null;
  }

  const order = typeof orderDocument.toObject === "function"
    ? orderDocument.toObject()
    : orderDocument;

  return {
    id: getDocumentId(order),
    reference: order.reference,
    total: Number(order.total || 0),
    currency: order.currency || "NGN",
    paymentStatus: order.paymentStatus || null,
    orderStatus: order.orderStatus || null,
    paidAt: order.paidAt || null,
    createdAt: order.createdAt || null,
  };
}

export function mapTicketTypeResponse(ticketTypeDocument, options = {}) {
  if (!ticketTypeDocument) {
    return null;
  }

  const ticketType = typeof ticketTypeDocument.toObject === "function"
    ? ticketTypeDocument.toObject({ virtuals: true })
    : ticketTypeDocument;
  const configuredStatus = ticketType.status || TICKET_TYPE_STATUS.INACTIVE;

  return {
    id: getDocumentId(ticketType),
    event: getDocumentId(ticketType.event),
    organization: getDocumentId(ticketType.organization),
    name: ticketType.name,
    description: ticketType.description || "",
    price: Number(ticketType.price || 0),
    currency: ticketType.currency || "NGN",
    quantity: Number(ticketType.quantity || 0),
    soldQuantity: Number(ticketType.soldQuantity || 0),
    remainingQuantity: Math.max(0, Number(ticketType.quantity || 0) - Number(ticketType.soldQuantity || 0)),
    saleStartsAt: ticketType.saleStartsAt || null,
    saleEndsAt: ticketType.saleEndsAt || null,
    maxPerOrder: Number(ticketType.maxPerOrder || 1),
    status: getEffectiveTicketTypeStatus(
      { ...ticketType, status: configuredStatus },
      options.event,
      options.now
    ),
    configuredStatus,
    position: Number(ticketType.position || 0),
    createdAt: ticketType.createdAt || null,
    updatedAt: ticketType.updatedAt || null,
  };
}

export function mapOrderResponse(orderDocument) {
  if (!orderDocument) {
    return null;
  }

  const order = typeof orderDocument.toObject === "function" ? orderDocument.toObject() : orderDocument;

  return {
    id: getDocumentId(order),
    reference: order.reference,
    customer: getDocumentId(order.customer),
    organization: getDocumentId(order.organization),
    event: getDocumentId(order.event),
    eventDetails: mapEventSummary(order.event),
    items: (order.items || []).map((item) => ({
      ticketType: getDocumentId(item.ticketType),
      name: item.name,
      quantity: Number(item.quantity || 0),
      unitPrice: Number(item.unitPrice || 0),
      total: Number(item.total || 0),
    })),
    subtotal: Number(order.subtotal || 0),
    fees: Number(order.fees || 0),
    total: Number(order.total || 0),
    currency: order.currency || "NGN",
    paymentStatus: order.paymentStatus,
    orderStatus: order.orderStatus,
    paymentReference: order.paymentReference || "",
    customerInfo: order.customerInfo || null,
    paidAt: order.paidAt || null,
    refundedAmount: Number(order.refundedAmount || 0),
    createdAt: order.createdAt || null,
    updatedAt: order.updatedAt || null,
  };
}

export function mapTicketResponse(ticketDocument, options = {}) {
  if (!ticketDocument) {
    return null;
  }

  const ticket = typeof ticketDocument.toObject === "function" ? ticketDocument.toObject() : ticketDocument;

  const response = {
    id: getDocumentId(ticket),
    reference: ticket.reference,
    order: getDocumentId(ticket.order),
    event: getDocumentId(ticket.event),
    eventDetails: mapEventSummary(ticket.event),
    organization: getDocumentId(ticket.organization),
    ticketType: getDocumentId(ticket.ticketType),
    ticketTypeDetails: mapTicketTypeSummary(ticket.ticketType),
    orderDetails: mapOrderSummary(ticket.order),
    purchaser: getDocumentId(ticket.purchaser),
    attendee: ticket.attendee || {},
    status: ticket.status,
    checkedInAt: ticket.checkedInAt || null,
    checkedInBy: getDocumentId(ticket.checkedInBy),
    createdAt: ticket.createdAt || null,
  };

  if (options.includeQr) {
    response.qrToken = ticket.qrToken || null;
    response.qrCodeDataUrl = ticket.qrCodeDataUrl || "";
  }

  return response;
}

export function mapRefundResponse(refundDocument) {
  if (!refundDocument) {
    return null;
  }

  const refund = typeof refundDocument.toObject === "function" ? refundDocument.toObject() : refundDocument;

  return {
    id: getDocumentId(refund),
    reference: refund.reference,
    order: getDocumentId(refund.order),
    organization: getDocumentId(refund.organization),
    event: getDocumentId(refund.event),
    amount: Number(refund.amount || 0),
    reason: refund.reason,
    status: refund.status,
    providerReference: refund.providerReference || "",
    processedAt: refund.processedAt || null,
    failureReason: refund.failureReason || "",
    createdAt: refund.createdAt || null,
  };
}
