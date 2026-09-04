export const TICKET_VALIDATION_OUTCOME = {
  VALID: "VALID",
  ALREADY_CHECKED_IN: "ALREADY_CHECKED_IN",
  INVALID_TICKET: "INVALID_TICKET",
  WRONG_EVENT: "WRONG_EVENT",
  CANCELED_TICKET: "CANCELED_TICKET",
  REFUNDED_TICKET: "REFUNDED_TICKET",
  INACTIVE_TICKET: "INACTIVE_TICKET",
  ORDER_NOT_PAID: "ORDER_NOT_PAID",
  EVENT_NOT_CHECKIN_ELIGIBLE: "EVENT_NOT_CHECKIN_ELIGIBLE",
  MANAGER_NOT_ASSIGNED: "MANAGER_NOT_ASSIGNED",
  ORGANIZATION_MISMATCH: "ORGANIZATION_MISMATCH",
  UNAUTHORIZED: "UNAUTHORIZED",
  NETWORK_ERROR: "NETWORK_ERROR",
  SERVICE_ERROR: "SERVICE_ERROR",
};

export const TICKET_VALIDATION_META = {
  VALID: { title: "Ticket verified", message: "This ticket is valid for check-in.", tone: "success" },
  ALREADY_CHECKED_IN: { title: "Already checked in", message: "This ticket has already been used for entry.", tone: "warning" },
  INVALID_TICKET: { title: "Invalid ticket", message: "No valid ticket was found for this code.", tone: "danger" },
  WRONG_EVENT: { title: "Wrong event", message: "This ticket belongs to another event.", tone: "danger" },
  CANCELED_TICKET: { title: "Ticket canceled", message: "This canceled ticket cannot be checked in.", tone: "danger" },
  REFUNDED_TICKET: { title: "Ticket refunded", message: "This refunded ticket cannot be checked in.", tone: "danger" },
  INACTIVE_TICKET: { title: "Ticket inactive", message: "This ticket type is no longer active.", tone: "danger" },
  ORDER_NOT_PAID: { title: "Payment not confirmed", message: "This ticket is not linked to a paid order.", tone: "danger" },
  EVENT_NOT_CHECKIN_ELIGIBLE: { title: "Check-in unavailable", message: "This event is not currently accepting check-ins.", tone: "warning" },
  MANAGER_NOT_ASSIGNED: { title: "Event access denied", message: "You are not assigned to receive guests for this event.", tone: "danger" },
  ORGANIZATION_MISMATCH: { title: "Event access denied", message: "This ticket is outside the assigned organization.", tone: "danger" },
  UNAUTHORIZED: { title: "Access denied", message: "Your session cannot perform this check-in.", tone: "danger" },
  NETWORK_ERROR: { title: "Connection problem", message: "Check your internet connection and retry this ticket.", tone: "warning" },
  SERVICE_ERROR: { title: "Validation unavailable", message: "The ticket could not be checked right now. Please retry.", tone: "warning" },
};

export const EVENT_CHECK_IN_STATUS = "PUBLISHED";

export const TICKET_STATUS_META = {
  VALID: { label: "Valid", tone: "success" },
  USED: { label: "Checked in", tone: "success" },
  CANCELED: { label: "Canceled", tone: "danger" },
  REFUNDED: { label: "Refunded", tone: "danger" },
};
