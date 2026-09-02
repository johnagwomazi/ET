import { mapUserResponse } from "./userResponse.util.js";

function getDocumentId(document) {
  if (!document) {
    return null;
  }

  return document._id?.toString?.() || document.toString?.() || document;
}

export function mapEventAttendanceResponse(attendanceDocument) {
  if (!attendanceDocument) {
    return null;
  }

  const attendance = typeof attendanceDocument.toObject === "function"
    ? attendanceDocument.toObject()
    : attendanceDocument;

  delete attendance.__v;
  const ticket = attendance.ticket && typeof attendance.ticket === "object" ? attendance.ticket : null;
  const order = attendance.order && typeof attendance.order === "object"
    ? attendance.order
    : ticket?.order && typeof ticket.order === "object"
      ? ticket.order
      : null;
  const ticketType = ticket?.ticketType && typeof ticket.ticketType === "object"
    ? ticket.ticketType
    : null;

  return {
    id: attendance._id?.toString?.() || attendance._id,
    name: attendance.attendeeName,
    phone: attendance.attendeePhone,
    email: attendance.attendeeEmail,
    checkedInAt: attendance.checkedInAt,
    checkedInBy: attendance.checkedInBy && typeof attendance.checkedInBy === "object"
      ? mapUserResponse(attendance.checkedInBy)
      : attendance.checkedInBy || null,
    organization: getDocumentId(attendance.organization),
    customer: getDocumentId(attendance.customer),
    ticket: getDocumentId(attendance.ticket),
    ticketReference: ticket?.reference || "",
    ticketStatus: ticket?.status || null,
    ticketType: ticketType
      ? { id: getDocumentId(ticketType), name: ticketType.name || "" }
      : null,
    order: getDocumentId(attendance.order || ticket?.order),
    orderReference: order?.reference || "",
    createdAt: attendance.createdAt || null,
    updatedAt: attendance.updatedAt || null,
  };
}
