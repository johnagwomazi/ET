import { EVENT_STATUS } from "../constants/eventStatus.constants.js";
import { TICKET_TYPE_STATUS } from "../constants/ticketing.constants.js";

const TICKET_SALES_EVENT_STATUSES = new Set([
  EVENT_STATUS.PUBLISHED,
  EVENT_STATUS.POSTPONED,
]);

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
  if (saleEndsAt !== null && currentTime > saleEndsAt) return false;

  return true;
}

export function getEffectiveTicketTypeStatus(ticketType, event, now = new Date()) {
  return isTicketTypeSalesActive(ticketType, event, now)
    ? TICKET_TYPE_STATUS.ACTIVE
    : TICKET_TYPE_STATUS.INACTIVE;
}
