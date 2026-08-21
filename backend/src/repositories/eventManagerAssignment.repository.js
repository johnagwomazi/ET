import EventManagerAssignment from "../models/eventManagerAssignment.model.js";

function applySession(query, options = {}) {
  if (options.session) {
    return query.session(options.session);
  }

  return query;
}

export async function createEventManagerAssignment(assignmentData, options = {}) {
  const assignment = new EventManagerAssignment(assignmentData);
  return assignment.save({ session: options.session });
}

export async function findActiveEventManagerAssignment(eventId, userId, options = {}) {
  return applySession(
    EventManagerAssignment.findOne({
      event: eventId,
      user: userId,
      removedAt: null,
    })
      .populate("user")
      .populate("assignedBy")
      .populate("event"),
    options
  );
}

export async function findEventManagers(eventId, options = {}) {
  let query = EventManagerAssignment.find({
    event: eventId,
    removedAt: null,
  })
    .populate("user")
    .populate("assignedBy")
    .sort({
      [options.sortBy || "assignedAt"]: options.sortOrder || -1,
      _id: options.secondarySortOrder || 1,
    })
    .skip(options.skip || 0);

  if (Number.isFinite(options.limit)) {
    query = query.limit(options.limit);
  }

  return applySession(query, options);
}

export async function countEventManagers(eventId) {
  return EventManagerAssignment.countDocuments({
    event: eventId,
    removedAt: null,
  });
}

export async function findManagerAssignments(userId, options = {}) {
  let query = EventManagerAssignment.find({
    user: userId,
    removedAt: null,
  })
    .populate({
      path: "event",
      populate: ["organization", "createdBy"],
    })
    .populate("assignedBy")
    .sort({
      [options.sortBy || "assignedAt"]: options.sortOrder || -1,
      _id: options.secondarySortOrder || 1,
    })
    .skip(options.skip || 0);

  if (Number.isFinite(options.limit)) {
    query = query.limit(options.limit);
  }

  return applySession(query, options);
}

export async function countManagerAssignments(userId) {
  return EventManagerAssignment.countDocuments({
    user: userId,
    removedAt: null,
  });
}

export async function findManagerAssignmentByEventAndUser(eventId, userId, options = {}) {
  return applySession(
    EventManagerAssignment.findOne({
      event: eventId,
      user: userId,
      removedAt: null,
    })
      .populate("user")
      .populate("assignedBy")
      .populate("event"),
    options
  );
}

export async function deactivateEventManagerAssignment(eventId, userId, removedBy, options = {}) {
  return applySession(
    EventManagerAssignment.findOneAndUpdate(
      {
        event: eventId,
        user: userId,
        removedAt: null,
      },
      {
        removedAt: new Date(),
        removedBy,
      },
    {
      new: true,
      runValidators: true,
    }
  )
      .populate("user")
      .populate("assignedBy")
      .populate("removedBy")
      .populate("event"),
    options
  );
}

export async function deleteAssignmentsByEvent(eventId, options = {}) {
  return applySession(
    EventManagerAssignment.deleteMany({
      event: eventId,
    }),
    options
  );
}
