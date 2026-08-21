import { mapUserResponse } from "./userResponse.util.js";

function sanitizeHistoryRelations(history) {
  if (!history) {
    return history;
  }

  if (history.changedBy && typeof history.changedBy === "object") {
    history.changedBy = mapUserResponse(history.changedBy);
  }

  return history;
}

export function mapEventStatusHistoryResponse(historyDocument) {
  if (!historyDocument) {
    return null;
  }

  const history = typeof historyDocument.toObject === "function" ? historyDocument.toObject() : historyDocument;

  delete history.__v;

  return sanitizeHistoryRelations(history);
}
