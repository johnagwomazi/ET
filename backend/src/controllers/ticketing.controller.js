import { HTTP_STATUS } from "../constants/httpStatus.constants.js";
import * as ticketingService from "../services/ticketing.service.js";
import { errorResponse, successResponse } from "../utils/apiResponse.js";

function sendServiceError(res, errorResult) {
  return res.status(errorResult.statusCode || HTTP_STATUS.BAD_REQUEST).json(
    errorResponse(errorResult.error || "Something went wrong")
  );
}

export async function createEventTicketType(req, res) {
  const result = await ticketingService.createEventTicketType(
    req.organizationId,
    req.auth.userId,
    req.params.eventId,
    req.body
  );

  if (result.error) {
    return sendServiceError(res, result);
  }

  return res.status(HTTP_STATUS.CREATED).json(successResponse("Ticket type created successfully", result));
}

export async function updateEventTicketType(req, res) {
  const result = await ticketingService.updateEventTicketType(
    req.organizationId,
    req.auth.userId,
    req.params.eventId,
    req.params.ticketTypeId,
    req.body
  );

  if (result.error) {
    return sendServiceError(res, result);
  }

  return res.status(HTTP_STATUS.OK).json(successResponse("Ticket type updated successfully", result));
}

export async function getEventTicketTypes(req, res) {
  const result = await ticketingService.getEventTicketTypes(
    req.organizationId,
    req.auth.userId,
    req.params.eventId,
    req.query
  );

  if (result.error) {
    return sendServiceError(res, result);
  }

  return res.status(HTTP_STATUS.OK).json(successResponse("Operation successful", result));
}

export async function getPublicEventTicketTypes(req, res) {
  const result = await ticketingService.getPublicEventTicketTypes(req.params.eventId);

  if (result.error) {
    return sendServiceError(res, result);
  }

  return res.status(HTTP_STATUS.OK).json(successResponse("Operation successful", result));
}

export async function createCheckoutOrder(req, res) {
  const result = await ticketingService.createCheckoutOrder(req.auth.userId, req.body);

  if (result.error) {
    return sendServiceError(res, result);
  }

  return res.status(HTTP_STATUS.CREATED).json(successResponse("Checkout initialized successfully", result));
}

export async function verifyPayment(req, res) {
  const result = await ticketingService.verifyPayment(req.body.reference);

  if (result.error) {
    return sendServiceError(res, result);
  }

  return res.status(HTTP_STATUS.OK).json(successResponse("Payment verified successfully", result));
}

export async function handlePaystackWebhook(req, res) {
  const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body || {}));
  const payload = Buffer.isBuffer(req.body) ? JSON.parse(req.body.toString("utf8")) : req.body;
  const signature = req.headers["x-paystack-signature"];
  const result = await ticketingService.handlePaystackWebhook(rawBody, signature, payload);

  if (result.error) {
    return sendServiceError(res, result);
  }

  return res.status(HTTP_STATUS.OK).json(successResponse("Webhook processed successfully", result));
}

export async function getCustomerOrders(req, res) {
  const result = await ticketingService.getCustomerOrders(req.auth.userId, req.query);

  return res.status(HTTP_STATUS.OK).json(successResponse("Operation successful", result));
}

export async function getCustomerTickets(req, res) {
  const result = await ticketingService.getCustomerTickets(req.auth.userId, req.query);

  return res.status(HTTP_STATUS.OK).json(successResponse("Operation successful", result));
}

export async function getCustomerHistory(req, res) {
  const result = await ticketingService.getCustomerHistory(req.auth.userId, req.query);

  return res.status(HTTP_STATUS.OK).json(successResponse("Operation successful", result));
}

export async function validateEventTicket(req, res) {
  const result = await ticketingService.validateEventTicket(
    req.organizationId,
    req.auth.userId,
    req.params.eventId,
    req.body
  );

  if (result.error) {
    return sendServiceError(res, result);
  }

  return res.status(HTTP_STATUS.OK).json(successResponse("Ticket validation complete", result));
}

export async function checkInEventTicket(req, res) {
  const result = await ticketingService.checkInEventTicket(
    req.organizationId,
    req.auth.userId,
    req.params.eventId,
    req.body
  );

  if (result.error) {
    return sendServiceError(res, result);
  }

  return res.status(HTTP_STATUS.OK).json(successResponse("Ticket checked in successfully", result));
}

export async function createOrderRefund(req, res) {
  const result = await ticketingService.createOrderRefund(
    req.organizationId,
    req.auth.userId,
    req.params.reference,
    req.body
  );

  if (result.error) {
    return sendServiceError(res, result);
  }

  return res.status(HTTP_STATUS.CREATED).json(successResponse("Refund request created successfully", result));
}

export async function getEventFinancialSummary(req, res) {
  const result = await ticketingService.getEventFinancialSummary(
    req.organizationId,
    req.auth.userId,
    req.params.eventId
  );

  if (result.error) {
    return sendServiceError(res, result);
  }

  return res.status(HTTP_STATUS.OK).json(successResponse("Operation successful", result));
}

export async function requestWithdrawal(req, res) {
  const result = await ticketingService.requestWithdrawal(req.organizationId, req.auth.userId, req.body);

  if (result.error) {
    return sendServiceError(res, result);
  }

  return res.status(HTTP_STATUS.CREATED).json(successResponse("Withdrawal requested successfully", result));
}

export async function getOrganizationWithdrawalBalance(req, res) {
  const result = await ticketingService.getOrganizationWithdrawalBalance(req.organizationId, req.auth.userId);

  if (result.error) {
    return sendServiceError(res, result);
  }

  return res.status(HTTP_STATUS.OK).json(successResponse("Operation successful", result));
}

export async function getOrganizationWithdrawals(req, res) {
  const result = await ticketingService.getOrganizationWithdrawals(req.organizationId, req.auth.userId, req.query);

  if (result.error) {
    return sendServiceError(res, result);
  }

  return res.status(HTTP_STATUS.OK).json(successResponse("Operation successful", result));
}

export async function getPlatformWithdrawals(req, res) {
  const result = await ticketingService.getPlatformWithdrawals(req.query);

  if (result.error) {
    return sendServiceError(res, result);
  }

  return res.status(HTTP_STATUS.OK).json(successResponse("Operation successful", result));
}

export async function approveWithdrawal(req, res) {
  const result = await ticketingService.reviewWithdrawal(req.params.withdrawalId, req.auth.userId, "approve", req.body);

  if (result.error) {
    return sendServiceError(res, result);
  }

  return res.status(HTTP_STATUS.OK).json(successResponse("Withdrawal approved successfully", result));
}

export async function rejectWithdrawal(req, res) {
  const result = await ticketingService.reviewWithdrawal(req.params.withdrawalId, req.auth.userId, "reject", req.body);

  if (result.error) {
    return sendServiceError(res, result);
  }

  return res.status(HTTP_STATUS.OK).json(successResponse("Withdrawal rejected successfully", result));
}
