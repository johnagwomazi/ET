import { mapOrganizationResponse } from "./organizationResponse.util.js";
import { mapUserResponse } from "./userResponse.util.js";

function sanitizeEventRelations(event) {
  if (!event) {
    return event;
  }

  if (event.organization && typeof event.organization === "object") {
    event.organization = mapOrganizationResponse(event.organization);
  }

  if (event.createdBy && typeof event.createdBy === "object") {
    event.createdBy = mapUserResponse(event.createdBy);
  }

  return event;
}

export function mapEventResponse(eventDocument) {
  if (!eventDocument) {
    return null;
  }

  const event = typeof eventDocument.toObject === "function" ? eventDocument.toObject() : eventDocument;

  delete event.__v;

  return sanitizeEventRelations(event);
}
