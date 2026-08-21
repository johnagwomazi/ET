import EventStatusHistory from "../models/eventStatusHistory.model.js";

function applySession(query, options = {}) {
  if (options.session) {
    return query.session(options.session);
  }

  return query;
}

export async function createEventStatusHistory(historyData, options = {}) {
  const history = new EventStatusHistory(historyData);
  return history.save({ session: options.session });
}

export async function countEventStatusHistories(filter = {}) {
  return EventStatusHistory.countDocuments(filter);
}

export async function findEventStatusHistories(filter = {}, options = {}) {
  return applySession(
    EventStatusHistory.find(filter)
      .populate("changedBy")
      .sort({
        [options.sortBy || "changedAt"]: options.sortOrder || 1,
        _id: options.secondarySortOrder || 1,
      })
      .skip(options.skip || 0)
      .limit(options.limit || 10),
    options
  );
}

export async function findEventStatusHistoryById(historyId) {
  return EventStatusHistory.findById(historyId).populate("changedBy").populate("event");
}
