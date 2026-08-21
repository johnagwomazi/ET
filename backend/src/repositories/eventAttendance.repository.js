import EventAttendance from "../models/eventAttendance.model.js";

function applySession(query, options = {}) {
  if (options.session) {
    return query.session(options.session);
  }

  return query;
}

function buildAttendanceQuery(filter = {}) {
  return EventAttendance.find(filter)
    .populate("checkedInBy")
    .sort({ checkedInAt: -1, _id: -1 });
}

export async function createEventAttendance(attendanceData, options = {}) {
  const attendance = new EventAttendance(attendanceData);
  return attendance.save({ session: options.session });
}

export async function findAttendanceByEventAndEmail(eventId, attendeeEmail, options = {}) {
  return applySession(
    EventAttendance.findOne({
      event: eventId,
      attendeeEmail,
    }).populate("checkedInBy"),
    options
  );
}

export async function countAttendanceByEvent(eventId, options = {}) {
  return applySession(
    EventAttendance.countDocuments({
      event: eventId,
    }),
    options
  );
}

export async function countEventAttendance(filter = {}, options = {}) {
  return applySession(EventAttendance.countDocuments(filter), options);
}

export async function findEventAttendance(filter = {}, options = {}) {
  let query = buildAttendanceQuery(filter);

  if (Number.isFinite(options.skip)) {
    query = query.skip(options.skip);
  }

  if (Number.isFinite(options.limit)) {
    query = query.limit(options.limit);
  }

  return applySession(query, options);
}

export async function deleteAttendanceByEvent(eventId, options = {}) {
  return applySession(
    EventAttendance.deleteMany({
      event: eventId,
    }),
    options
  );
}
