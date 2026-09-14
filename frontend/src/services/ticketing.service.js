import { get, patch, post } from "../api/httpClient";
import { unwrapResponse } from "../utils/response";
import { buildQueryString } from "../utils/query";

export async function getPublicEventTicketTypes(eventId, options = {}) {
  const response = await get(`/events/${eventId}/ticket-types`, options);
  return unwrapResponse(response);
}

export async function createCheckoutOrder(payload) {
  const response = await post("/ticketing/checkout", payload);
  return unwrapResponse(response);
}

export async function verifyPayment(payload, options = {}) {
  const response = await post("/ticketing/payments/verify", payload, options);
  return unwrapResponse(response);
}

export async function getCustomerOrders(query = {}) {
  const response = await get(`/ticketing/orders${buildQueryString(query)}`);
  return unwrapResponse(response);
}

export async function getCustomerTickets(query = {}) {
  const response = await get(`/ticketing/tickets${buildQueryString(query)}`);
  return unwrapResponse(response);
}

export async function getCustomerHistory(query = {}) {
  const response = await get(`/ticketing/history${buildQueryString(query)}`);
  return unwrapResponse(response);
}

export async function getOrganizationEventTicketTypes(eventId, query = {}) {
  const response = await get(`/organizations/me/events/${eventId}/ticket-types${buildQueryString(query)}`);
  return unwrapResponse(response);
}

export async function createOrganizationEventTicketType(eventId, payload) {
  const response = await post(`/organizations/me/events/${eventId}/ticket-types`, payload);
  return unwrapResponse(response);
}

export async function updateOrganizationEventTicketType(eventId, ticketTypeId, payload) {
  const response = await patch(`/organizations/me/events/${eventId}/ticket-types/${ticketTypeId}`, payload);
  return unwrapResponse(response);
}

export async function getOrganizationEventFinancialSummary(eventId) {
  const response = await get(`/organizations/me/events/${eventId}/financial-summary`);
  return unwrapResponse(response);
}

export async function createOrderRefund(orderReference, payload) {
  const response = await post(`/organizations/me/orders/${orderReference}/refunds`, payload);
  return unwrapResponse(response);
}

export async function validateManagerTicket(eventId, payload) {
  const response = await post(`/manager/events/${eventId}/tickets/validate`, payload);
  return unwrapResponse(response);
}

export async function checkInManagerTicket(eventId, payload) {
  const response = await post(`/manager/events/${eventId}/tickets/check-in`, payload);
  return unwrapResponse(response);
}
