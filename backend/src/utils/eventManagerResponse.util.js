import { mapUserResponse } from "./userResponse.util.js";

function sanitizeManagerAssignment(assignment) {
  if (!assignment) {
    return assignment;
  }

  if (assignment.user && typeof assignment.user === "object") {
    assignment.user = mapUserResponse(assignment.user);
  }

  if (assignment.assignedBy && typeof assignment.assignedBy === "object") {
    assignment.assignedBy = mapUserResponse(assignment.assignedBy);
  }

  if (assignment.removedBy && typeof assignment.removedBy === "object") {
    assignment.removedBy = mapUserResponse(assignment.removedBy);
  }

  return assignment;
}

export function mapEventManagerAssignmentResponse(assignmentDocument) {
  if (!assignmentDocument) {
    return null;
  }

  const assignment = typeof assignmentDocument.toObject === "function"
    ? assignmentDocument.toObject()
    : assignmentDocument;

  delete assignment.__v;

  return sanitizeManagerAssignment(assignment);
}

export function mapManagerAssignedEventResponse(eventDocument, assignmentDocument) {
  if (!eventDocument) {
    return null;
  }

  const event = typeof eventDocument.toObject === "function" ? eventDocument.toObject() : eventDocument;
  const assignment = mapEventManagerAssignmentResponse(assignmentDocument);

  delete event.__v;
  delete event.organization;
  delete event.createdBy;
  delete event.lifecycle;

  return {
    ...event,
    assignedAt: assignment?.assignedAt || null,
    assignedBy: assignment?.assignedBy || null,
  };
}
