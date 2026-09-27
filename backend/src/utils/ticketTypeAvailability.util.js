import { EVENT_STATUS } from "../constants/eventStatus.constants.js";
import { TICKET_TYPE_STATUS } from "../constants/ticketing.constants.js";

const TICKET_SALES_EVENT_STATUSES = new Set([
  EVENT_STATUS.PUBLISHED,
  EVENT_STATUS.POSTPONED,
]);

export const TICKET_AVAILABILITY = Object.freeze({
  AVAILABLE: "AVAILABLE",
  SOLD_OUT: "SOLD_OUT",
  SALES_NOT_STARTED: "SALES_NOT_STARTED",
  SALES_ENDED: "SALES_ENDED",
  INACTIVE: "INACTIVE",
});

function timestamp(value) {
  if (!value) return null;
  const result = new Date(value).getTime();
  return Number.isFinite(result) ? result : null;
}

export function eventPermitsTicketSales(event) {
  return TICKET_SALES_EVENT_STATUSES.has(event?.status);
}

export function isTicketTypeSalesActive(ticketType, event, now = new Date()) {
  if (!ticketType || ticketType.status !== TICKET_TYPE_STATUS.ACTIVE) return false;
  if (!eventPermitsTicketSales(event)) return false;

  const currentTime = timestamp(now);
  const saleStartsAt = timestamp(ticketType.saleStartsAt);
  const saleEndsAt = timestamp(ticketType.saleEndsAt);

  if (currentTime === null) return false;
  if (ticketType.saleStartsAt && saleStartsAt === null) return false;
  if (ticketType.saleEndsAt && saleEndsAt === null) return false;
  if (saleStartsAt !== null && currentTime < saleStartsAt) return false;
  if (saleEndsAt !== null && currentTime >= saleEndsAt) return false;

  return true;
}

export function getTicketTypeAvailability(ticketType, event, now = new Date()) {
  if (!ticketType || ticketType.status !== TICKET_TYPE_STATUS.ACTIVE || !eventPermitsTicketSales(event)) {
    return TICKET_AVAILABILITY.INACTIVE;
  }

  const currentTime = timestamp(now);
  const saleStartsAt = timestamp(ticketType.saleStartsAt);
  const saleEndsAt = timestamp(ticketType.saleEndsAt);

  if (currentTime === null) return TICKET_AVAILABILITY.INACTIVE;
  if (ticketType.saleStartsAt && saleStartsAt === null) return TICKET_AVAILABILITY.INACTIVE;
  if (ticketType.saleEndsAt && saleEndsAt === null) return TICKET_AVAILABILITY.INACTIVE;
  if (saleStartsAt !== null && currentTime < saleStartsAt) return TICKET_AVAILABILITY.SALES_NOT_STARTED;
  if (saleEndsAt !== null && currentTime >= saleEndsAt) return TICKET_AVAILABILITY.SALES_ENDED;
  if (Number(ticketType.quantity || 0) <= Number(ticketType.soldQuantity || 0)) {
    return TICKET_AVAILABILITY.SOLD_OUT;
  }

  return TICKET_AVAILABILITY.AVAILABLE;
}

export function getEffectiveTicketTypeStatus(ticketType, event, now = new Date()) {
  return isTicketTypeSalesActive(ticketType, event, now)
    ? TICKET_TYPE_STATUS.ACTIVE
    : TICKET_TYPE_STATUS.INACTIVE;
}
