import { mapUserResponse } from "./userResponse.util.js";

export function mapEventAttendanceResponse(attendanceDocument) {
  if (!attendanceDocument) {
    return null;
  }

  const attendance = typeof attendanceDocument.toObject === "function"
    ? attendanceDocument.toObject()
    : attendanceDocument;

  delete attendance.__v;

  return {
    id: attendance._id?.toString?.() || attendance._id,
    name: attendance.attendeeName,
    phone: attendance.attendeePhone,
    email: attendance.attendeeEmail,
    checkedInAt: attendance.checkedInAt,
    checkedInBy: attendance.checkedInBy && typeof attendance.checkedInBy === "object"
      ? mapUserResponse(attendance.checkedInBy)
      : attendance.checkedInBy || null,
    ticket: attendance.ticket || null,
    order: attendance.order || null,
    createdAt: attendance.createdAt || null,
    updatedAt: attendance.updatedAt || null,
  };
}
