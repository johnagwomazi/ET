import { get, patch, post } from "../api/httpClient";
import { unwrapResponse } from "../utils/response";
import { buildQueryString } from "../utils/query";

export async function getPublicEventTicketTypes(eventId) {
  const response = await get(`/events/${eventId}/ticket-types`);
  return unwrapResponse(response);
}

export async function createCheckoutOrder(payload) {
  const response = await post("/ticketing/checkout", payload);
  return unwrapResponse(response);
}

export async function verifyPayment(payload) {
  const response = await post("/ticketing/payments/verify", payload);
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

export async function requestWithdrawal(payload) {
  const response = await post("/organizations/me/withdrawals", payload);
  return unwrapResponse(response);
}

export async function getOrganizationWithdrawals(query = {}) {
  const response = await get(`/organizations/me/withdrawals${buildQueryString(query)}`);
  return unwrapResponse(response);
}

export async function getOrganizationWithdrawalBalance() {
  const response = await get("/organizations/me/withdrawals/balance");
  return unwrapResponse(response);
}

export async function getPlatformWithdrawals(query = {}) {
  const response = await get(`/admin/withdrawals${buildQueryString(query)}`);
  return unwrapResponse(response);
}

export async function approveWithdrawal(withdrawalId, payload = {}) {
  const response = await patch(`/admin/withdrawals/${withdrawalId}/approve`, payload);
  return unwrapResponse(response);
}

export async function rejectWithdrawal(withdrawalId, payload) {
  const response = await patch(`/admin/withdrawals/${withdrawalId}/reject`, payload);
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
