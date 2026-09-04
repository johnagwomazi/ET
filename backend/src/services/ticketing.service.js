import crypto from "node:crypto";
import mongoose from "mongoose";
import QRCode from "qrcode";
import { EVENT_STATUS } from "../constants/eventStatus.constants.js";
import { HTTP_STATUS } from "../constants/httpStatus.constants.js";
import { ORGANIZATION_PERMISSIONS } from "../constants/organizationPermissions.constants.js";
import { USER_ROLES } from "../constants/roles.constants.js";
import {
  DEFAULT_CURRENCY,
  ORDER_STATUS,
  PAYMENT_STATUS,
  REFUND_STATUS,
  TICKET_STATUS,
  TICKET_TYPE_STATUS,
  TICKET_VALIDATION_OUTCOME,
  WITHDRAWAL_STATUS,
} from "../constants/ticketing.constants.js";
import * as authRepository from "../repositories/auth.repository.js";
import * as eventAttendanceRepository from "../repositories/eventAttendance.repository.js";
import * as eventManagerAssignmentRepository from "../repositories/eventManagerAssignment.repository.js";
import * as eventRepository from "../repositories/event.repository.js";
import * as orderRepository from "../repositories/order.repository.js";
import * as paymentEventRepository from "../repositories/paymentEvent.repository.js";
import * as refundRepository from "../repositories/refund.repository.js";
import * as ticketRepository from "../repositories/ticket.repository.js";
import * as ticketTypeRepository from "../repositories/ticketType.repository.js";
import * as withdrawalRepository from "../repositories/withdrawal.repository.js";
import * as paystackService from "./paystack.service.js";
import * as notificationService from "./notification.service.js";
import * as analyticsService from "./analytics.service.js";
import * as financeService from "./finance.service.js";
import { buildPaginationMeta, buildPaginationOptions, escapeRegex } from "../utils/query.util.js";
import { hasOrganizationPermission } from "../utils/organizationPermission.util.js";
import {
  getDocumentId,
  mapOrderResponse,
  mapRefundResponse,
  mapTicketResponse,
  mapTicketTypeResponse,
  mapWithdrawalResponse,
} from "../utils/ticketingResponse.util.js";
import { mapEventAttendanceResponse } from "../utils/eventAttendanceResponse.util.js";

const defaultDependencies = {
  authRepository,
  eventAttendanceRepository,
  eventManagerAssignmentRepository,
  eventRepository,
  orderRepository,
  paymentEventRepository,
  refundRepository,
  ticketRepository,
  ticketTypeRepository,
  withdrawalRepository,
  paystackService,
  notificationService,
  mongoose,
};

function canUseTransactions(dependencies) {
  return Boolean(
    dependencies?.mongoose &&
    dependencies.mongoose.connection &&
    dependencies.mongoose.connection.readyState === 1 &&
    typeof dependencies.mongoose.startSession === "function"
  );
}

async function runInTransaction(dependencies, executor) {
  if (!canUseTransactions(dependencies)) {
    return executor(null);
  }

  const session = await dependencies.mongoose.startSession();

  try {
    let result;
    await session.withTransaction(async () => {
      result = await executor(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
}

function createReference(prefix) {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(8).toString("hex")}`;
}

function hashValue(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeAttendee(value = {}, fallback = {}) {
  return {
    name: String(value.name || fallback.name || "").trim(),
    phone: String(value.phone || fallback.phone || "").trim(),
    email: normalizeEmail(value.email || fallback.email),
  };
}

function isTicketTypeAvailable(ticketType, quantity, now = new Date()) {
  if (!ticketType || ticketType.status !== TICKET_TYPE_STATUS.ACTIVE) {
    return false;
  }

  if (ticketType.saleStartsAt && ticketType.saleStartsAt > now) {
    return false;
  }

  if (ticketType.saleEndsAt && ticketType.saleEndsAt < now) {
    return false;
  }

  if (quantity > Number(ticketType.maxPerOrder || 1)) {
    return false;
  }

  return Number(ticketType.quantity || 0) - Number(ticketType.soldQuantity || 0) >= quantity;
}

function isEventPurchasable(event) {
  return [EVENT_STATUS.PUBLISHED, EVENT_STATUS.POSTPONED].includes(event?.status);
}

async function getOrganizationActorContext(organizationId, actorUserId, dependencies = defaultDependencies) {
  const [actorUser, eventCount] = await Promise.all([
    dependencies.authRepository.findAuthUserById(actorUserId),
    dependencies.eventRepository.countEvents({ organization: organizationId }),
  ]);

  if (!actorUser) {
    return { error: "Not authorized", statusCode: HTTP_STATUS.UNAUTHORIZED };
  }

  if (getDocumentId(actorUser.organization) !== getDocumentId(organizationId)) {
    return { error: "You cannot access another organization", statusCode: HTTP_STATUS.FORBIDDEN };
  }

  return { actorUser, eventCount };
}

async function getAdminEventContext(organizationId, actorUserId, eventId, dependencies = defaultDependencies) {
  const actorContext = await getOrganizationActorContext(organizationId, actorUserId, dependencies);

  if (actorContext.error) {
    return actorContext;
  }

  const event = await dependencies.eventRepository.findEventByIdAndOrganization(eventId, organizationId);

  if (!event) {
    return { error: "Event not found", statusCode: HTTP_STATUS.NOT_FOUND };
  }

  if (!hasOrganizationPermission(actorContext.actorUser, ORGANIZATION_PERMISSIONS.ORGANIZATION_UPDATE, event.organization)) {
    return { error: "You do not have access to this resource", statusCode: HTTP_STATUS.FORBIDDEN };
  }

  return { actorUser: actorContext.actorUser, event, organization: event.organization };
}

export async function createEventTicketType(organizationId, actorUserId, eventId, payload, dependencies = defaultDependencies) {
  const context = await getAdminEventContext(organizationId, actorUserId, eventId, dependencies);

  if (context.error) {
    return context;
  }

  if (![EVENT_STATUS.DRAFT, EVENT_STATUS.PUBLISHED, EVENT_STATUS.POSTPONED].includes(context.event.status)) {
    return { error: "Ticket types cannot be changed for this event status", statusCode: HTTP_STATUS.BAD_REQUEST };
  }

  const ticketType = await dependencies.ticketTypeRepository.createTicketType({
    event: eventId,
    organization: organizationId,
    name: payload.name,
    description: payload.description || "",
    price: payload.price,
    currency: payload.currency || DEFAULT_CURRENCY,
    quantity: payload.quantity,
    saleStartsAt: payload.saleStartsAt || null,
    saleEndsAt: payload.saleEndsAt || null,
    maxPerOrder: payload.maxPerOrder || 10,
    status: payload.status || TICKET_TYPE_STATUS.ACTIVE,
    position: payload.position || 0,
    createdBy: actorUserId,
  });

  return { ticketType: mapTicketTypeResponse(ticketType) };
}

export async function updateEventTicketType(organizationId, actorUserId, eventId, ticketTypeId, payload, dependencies = defaultDependencies) {
  const context = await getAdminEventContext(organizationId, actorUserId, eventId, dependencies);

  if (context.error) {
    return context;
  }

  const currentTicketType = await dependencies.ticketTypeRepository.findTicketTypeByIdAndEvent(ticketTypeId, eventId, organizationId);

  if (!currentTicketType) {
    return { error: "Ticket type not found", statusCode: HTTP_STATUS.NOT_FOUND };
  }

  if (payload.quantity !== undefined && Number(payload.quantity) < Number(currentTicketType.soldQuantity || 0)) {
    return { error: "Quantity cannot be lower than tickets already sold", statusCode: HTTP_STATUS.BAD_REQUEST };
  }

  const ticketType = await dependencies.ticketTypeRepository.updateTicketTypeByIdAndEvent(
    ticketTypeId,
    eventId,
    organizationId,
    payload
  );

  return { ticketType: mapTicketTypeResponse(ticketType) };
}

export async function getEventTicketTypes(organizationId, actorUserId, eventId, query = {}, dependencies = defaultDependencies) {
  const context = await getAdminEventContext(organizationId, actorUserId, eventId, dependencies);

  if (context.error) {
    return context;
  }

  const pagination = buildPaginationOptions(query, { page: 1, limit: 50, sortBy: "position", sortOrder: 1 });
  const filter = { event: eventId, organization: organizationId };
  const [ticketTypes, totalItems] = await Promise.all([
    dependencies.ticketTypeRepository.findTicketTypes(filter, pagination),
    dependencies.ticketTypeRepository.countTicketTypes(filter),
  ]);

  return {
    ticketTypes: ticketTypes.map(mapTicketTypeResponse),
    pagination: buildPaginationMeta(totalItems, pagination),
  };
}

export async function getPublicEventTicketTypes(eventId, dependencies = defaultDependencies) {
  const event = await dependencies.eventRepository.findPublicEventById(eventId);

  if (!event) {
    return { error: "Event not found", statusCode: HTTP_STATUS.NOT_FOUND };
  }

  const ticketTypes = await dependencies.ticketTypeRepository.findTicketTypes({
    event: eventId,
    status: TICKET_TYPE_STATUS.ACTIVE,
  }, { limit: 100 });

  return {
    ticketTypes: ticketTypes.map(mapTicketTypeResponse),
  };
}

export async function createCheckoutOrder(customerId, payload, dependencies = defaultDependencies) {
  const customer = customerId ? await dependencies.authRepository.findAuthUserById(customerId) : null;

  if (!customer) {
    return { error: "Not authorized", statusCode: HTTP_STATUS.UNAUTHORIZED };
  }

  if (payload.idempotencyKey) {
    const existingOrder = await dependencies.orderRepository.findOrderByCustomerAndIdempotencyKey(customerId, payload.idempotencyKey);
    if (existingOrder) {
      return {
        order: mapOrderResponse(existingOrder),
        payment: {
          reference: existingOrder.paymentReference,
          authorizationUrl: existingOrder.metadata?.authorizationUrl || null,
          reused: true,
        },
      };
    }
  }

  const event = await dependencies.eventRepository.findPublicEventById(payload.eventId);

  if (!event || !isEventPurchasable(event)) {
    return { error: "Event is not available for checkout", statusCode: HTTP_STATUS.BAD_REQUEST };
  }

  const orderReference = createReference("ord");
  const paymentReference = createReference("pay");
  const reservedItems = [];

  try {
    const result = await runInTransaction(dependencies, async (session) => {
      const orderItems = [];
      let subtotal = 0;

      for (const item of payload.items) {
        const ticketType = await dependencies.ticketTypeRepository.findTicketTypeByIdAndEvent(
          item.ticketTypeId,
          payload.eventId,
          getDocumentId(event.organization),
          { session }
        );

        if (!isTicketTypeAvailable(ticketType, item.quantity)) {
          return { error: "Ticket type is unavailable or sold out", statusCode: HTTP_STATUS.CONFLICT };
        }

        const reservedTicketType = await dependencies.ticketTypeRepository.reserveTicketInventory(
          item.ticketTypeId,
          payload.eventId,
          getDocumentId(event.organization),
          item.quantity,
          { session }
        );

        if (!reservedTicketType) {
          return { error: "Ticket inventory is no longer available", statusCode: HTTP_STATUS.CONFLICT };
        }

        reservedItems.push({ ticketTypeId: item.ticketTypeId, quantity: item.quantity });
        const lineTotal = Number(ticketType.price || 0) * Number(item.quantity || 0);
        subtotal += lineTotal;
        orderItems.push({
          ticketType: item.ticketTypeId,
          name: ticketType.name,
          quantity: item.quantity,
          unitPrice: Number(ticketType.price || 0),
          total: lineTotal,
        });
      }

      const order = await dependencies.orderRepository.createOrder(
        {
          reference: orderReference,
          idempotencyKey: payload.idempotencyKey || "",
          customer: customerId,
          organization: getDocumentId(event.organization),
          event: payload.eventId,
          items: orderItems,
          subtotal,
          fees: 0,
          total: subtotal,
          currency: orderItems[0]?.currency || DEFAULT_CURRENCY,
          paymentStatus: PAYMENT_STATUS.PENDING,
          orderStatus: ORDER_STATUS.PENDING,
          paymentReference,
          customerInfo: normalizeAttendee(payload.customerInfo),
          metadata: {
            attendeeLines: payload.items.map((item) => ({
              ticketTypeId: item.ticketTypeId,
              attendees: item.attendees || [],
            })),
          },
        },
        { session }
      );

      return { order };
    });

    if (result.error) {
      return result;
    }

    const payment = await dependencies.paystackService.initializeTransaction({
      email: payload.customerInfo.email,
      amount: result.order.total,
      reference: paymentReference,
      metadata: {
        orderReference,
        customerId,
        eventId: payload.eventId,
      },
    });

    const authorizationUrl = payment?.data?.authorization_url || null;
    const updatedOrder = await dependencies.orderRepository.updateOrderByReference(orderReference, {
      paymentStatus: payment?.status ? PAYMENT_STATUS.INITIALIZED : PAYMENT_STATUS.PENDING,
      metadata: {
        ...result.order.metadata,
        paystackConfigured: Boolean(payment?.configured),
        authorizationUrl,
      },
    });

    return {
      order: mapOrderResponse(updatedOrder || result.order),
      payment: {
        reference: paymentReference,
        authorizationUrl,
        accessCode: payment?.data?.access_code || null,
        providerConfigured: Boolean(payment?.configured),
      },
    };
  } catch (error) {
    for (const item of reservedItems) {
      await dependencies.ticketTypeRepository.releaseTicketInventory(item.ticketTypeId, item.quantity).catch(() => {});
    }

    if (error?.code === 11000) {
      return { error: "Duplicate order request", statusCode: HTTP_STATUS.CONFLICT };
    }

    return { error: "Something went wrong", statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR };
  }
}

async function buildTicketsForPaidOrder(order, dependencies, session = null) {
  const existingTickets = await dependencies.ticketRepository.findTickets({ order: order._id }, { limit: 1, session });

  if (existingTickets.length > 0) {
    return dependencies.ticketRepository.findTickets({ order: order._id }, { limit: 500, session });
  }

  const attendeeLines = order.metadata?.attendeeLines || [];
  const ticketRows = [];

  for (const item of order.items || []) {
    const line = attendeeLines.find((entry) => String(entry.ticketTypeId) === String(getDocumentId(item.ticketType)));
    const attendees = line?.attendees || [];

    for (let index = 0; index < Number(item.quantity || 0); index += 1) {
      const rawToken = createReference("tkn");
      const qrCodeDataUrl = await QRCode.toDataURL(rawToken);

      ticketRows.push({
        reference: createReference("tkt"),
        tokenHash: hashValue(rawToken),
        qrToken: rawToken,
        qrCodeDataUrl,
        order: order._id,
        event: getDocumentId(order.event),
        organization: getDocumentId(order.organization),
        ticketType: getDocumentId(item.ticketType),
        purchaser: getDocumentId(order.customer),
        attendee: normalizeAttendee(attendees[index], order.customerInfo),
        status: TICKET_STATUS.VALID,
      });
    }
  }

  return dependencies.ticketRepository.createTickets(ticketRows, { session });
}

export async function markOrderPaidFromProvider(paymentReference, providerPayload = {}, dependencies = defaultDependencies) {
  return runInTransaction(dependencies, async (session) => {
    const order = await dependencies.orderRepository.findOrderByPaymentReference(paymentReference, { session });

    if (!order) {
      return { error: "Order not found", statusCode: HTTP_STATUS.NOT_FOUND };
    }

    if (order.paymentStatus === PAYMENT_STATUS.PAID) {
      const tickets = await dependencies.ticketRepository.findTickets({ order: order._id }, { limit: 500, session });
      return { order: mapOrderResponse(order), tickets: tickets.map((ticket) => mapTicketResponse(ticket, { includeQr: true })), reused: true };
    }

    const paidOrder = await dependencies.orderRepository.updateOrderByReference(
      order.reference,
      {
        paymentStatus: PAYMENT_STATUS.PAID,
        orderStatus: ORDER_STATUS.PAID,
        paidAt: new Date(),
        metadata: {
          ...(order.metadata || {}),
          providerPayload,
        },
      },
      { session }
    );

    const tickets = await buildTicketsForPaidOrder(paidOrder, dependencies, session);
    await dependencies.notificationService.sendPaymentSuccessNotification(paidOrder).catch(() => {});
    await dependencies.notificationService.sendTicketIssuedNotification(paidOrder, tickets).catch(() => {});

    return {
      order: mapOrderResponse(paidOrder),
      tickets: tickets.map((ticket) => mapTicketResponse(ticket, { includeQr: true })),
    };
  });
}

export async function verifyPayment(reference, dependencies = defaultDependencies) {
  const verification = await dependencies.paystackService.verifyTransaction(reference);

  if (!verification?.status || verification?.data?.status !== "success") {
    const currentOrder = await dependencies.orderRepository.findOrderByPaymentReference(reference);

    if (!currentOrder) {
      return { error: "Payment verification failed", statusCode: HTTP_STATUS.BAD_REQUEST };
    }

    const order = await dependencies.orderRepository.updateOrderByReference(currentOrder.reference, {
      paymentStatus: PAYMENT_STATUS.FAILED,
      orderStatus: ORDER_STATUS.FAILED,
      failedAt: new Date(),
    });

    return { order: mapOrderResponse(order), verified: false };
  }

  return markOrderPaidFromProvider(reference, verification.data, dependencies);
}

export async function handlePaystackWebhook(rawBody, signature, payload, dependencies = defaultDependencies) {
  if (!dependencies.paystackService.verifyWebhookSignature(rawBody, signature)) {
    return { error: "Invalid webhook signature", statusCode: HTTP_STATUS.UNAUTHORIZED };
  }

  const reference = payload?.data?.reference;
  const event = payload?.event;

  if (!reference || !event) {
    return { error: "Invalid webhook payload", statusCode: HTTP_STATUS.BAD_REQUEST };
  }

  try {
    await dependencies.paymentEventRepository.createPaymentEvent({
      provider: "paystack",
      event,
      reference,
      payload,
      processedAt: new Date(),
    });
  } catch (error) {
    if (error?.code === 11000) {
      if (typeof event === "string" && event.startsWith("transfer.")) {
        const transferHandler = dependencies.financeService || financeService;
        return transferHandler.handleTransferWebhook(event, payload.data);
      }
      return { processed: true, duplicate: true };
    }

    throw error;
  }

  if (event === "charge.success") {
    return markOrderPaidFromProvider(reference, payload.data, dependencies);
  }

  if (typeof event === "string" && event.startsWith("transfer.")) {
    const transferHandler = dependencies.financeService || financeService;
    return transferHandler.handleTransferWebhook(event, payload.data);
  }

  return { processed: true };
}

export async function getCustomerOrders(customerId, query = {}, dependencies = defaultDependencies) {
  const pagination = buildPaginationOptions(query, { page: 1, limit: 20, sortBy: "createdAt", sortOrder: -1 });
  const [orders, totalItems] = await Promise.all([
    dependencies.orderRepository.findOrders({ customer: customerId }, pagination),
    dependencies.orderRepository.countOrders({ customer: customerId }),
  ]);

  return {
    orders: orders.map(mapOrderResponse),
    pagination: buildPaginationMeta(totalItems, pagination),
  };
}

export async function getCustomerTickets(customerId, query = {}, dependencies = defaultDependencies) {
  const pagination = buildPaginationOptions(query, { page: 1, limit: 20, sortBy: "createdAt", sortOrder: -1 });
  const [tickets, totalItems] = await Promise.all([
    dependencies.ticketRepository.findTickets({ purchaser: customerId }, pagination),
    dependencies.ticketRepository.countTickets({ purchaser: customerId }),
  ]);

  return {
    tickets: tickets.map((ticket) => mapTicketResponse(ticket, { includeQr: true })),
    pagination: buildPaginationMeta(totalItems, pagination),
  };
}

function getCustomerHistoryStatus(ticket) {
  if (ticket.checkedInAt) {
    return "ATTENDED";
  }

  if (ticket.status === TICKET_STATUS.REFUNDED) {
    return "REFUNDED";
  }

  if (ticket.status === TICKET_STATUS.CANCELED || ticket.event?.status === EVENT_STATUS.CANCELED) {
    return "CANCELED";
  }

  return "COMPLETED";
}

export async function getCustomerHistory(customerId, query = {}, dependencies = defaultDependencies) {
  const pagination = buildPaginationOptions(query, { page: 1, limit: 20, sortBy: "createdAt", sortOrder: -1 });
  const result = await dependencies.ticketRepository.findCustomerHistoryTickets(customerId, {
    ...pagination,
    historyStatus: query.status,
  });

  return {
    history: result.tickets.map((ticket) => ({
      ...mapTicketResponse(ticket, { includeQr: false }),
      historyStatus: getCustomerHistoryStatus(ticket),
    })),
    pagination: buildPaginationMeta(result.totalItems, pagination),
  };
}

async function resolveTicketForValidation(payload, dependencies, options = {}) {
  if (payload.token) {
    return dependencies.ticketRepository.findTicketByTokenHash(hashValue(payload.token), options);
  }

  return dependencies.ticketRepository.findTicketByReference(payload.reference, options);
}

function buildTicketValidationResult(outcome, reason, ticket = null, statusCode = HTTP_STATUS.CONFLICT) {
  const result = {
    valid: outcome === TICKET_VALIDATION_OUTCOME.VALID,
    outcome,
    reason,
    statusCode,
  };

  if (ticket) {
    result.ticket = mapTicketResponse(ticket);
  }

  return result;
}

function isOrderPaidForCheckIn(order, eventId, organizationId) {
  if (!order || typeof order !== "object") {
    return false;
  }

  const acceptedOrderStatuses = [ORDER_STATUS.PAID, ORDER_STATUS.PARTIALLY_REFUNDED];
  const acceptedPaymentStatuses = [PAYMENT_STATUS.PAID, PAYMENT_STATUS.PARTIALLY_REFUNDED];

  return acceptedOrderStatuses.includes(order.orderStatus)
    && acceptedPaymentStatuses.includes(order.paymentStatus)
    && getDocumentId(order.event) === getDocumentId(eventId)
    && getDocumentId(order.organization) === getDocumentId(organizationId);
}

function isEventCheckInEligible(event) {
  return event?.status === EVENT_STATUS.PUBLISHED;
}

async function getEventTicketOperatorContext(organizationId, actorUserId, eventId, dependencies, options = {}) {
  const [actorUser, event] = await Promise.all([
    dependencies.authRepository.findAuthUserById(actorUserId),
    dependencies.eventRepository.findEventByIdAndOrganization(eventId, organizationId, options),
  ]);

  if (!actorUser) {
    return {
      error: "Not authorized",
      outcome: TICKET_VALIDATION_OUTCOME.UNAUTHORIZED,
      statusCode: HTTP_STATUS.UNAUTHORIZED,
    };
  }

  if (![USER_ROLES.ADMIN, USER_ROLES.MANAGER].includes(actorUser.role)) {
    return {
      error: "You do not have access to this resource",
      outcome: TICKET_VALIDATION_OUTCOME.UNAUTHORIZED,
      statusCode: HTTP_STATUS.FORBIDDEN,
    };
  }

  if (getDocumentId(actorUser.organization) !== getDocumentId(organizationId)) {
    return {
      error: "You cannot access another organization",
      outcome: TICKET_VALIDATION_OUTCOME.ORGANIZATION_MISMATCH,
      statusCode: HTTP_STATUS.FORBIDDEN,
    };
  }

  if (!event) {
    return { error: "Event not found", statusCode: HTTP_STATUS.NOT_FOUND };
  }

  if (actorUser.role === USER_ROLES.ADMIN) {
    if (!hasOrganizationPermission(actorUser, ORGANIZATION_PERMISSIONS.ORGANIZATION_UPDATE, event.organization)) {
      return {
        error: "You do not have access to this resource",
        outcome: TICKET_VALIDATION_OUTCOME.UNAUTHORIZED,
        statusCode: HTTP_STATUS.FORBIDDEN,
      };
    }

    return { actorUser, event, assignment: null };
  }

  const assignment = await dependencies.eventManagerAssignmentRepository.findActiveEventManagerAssignment(
    eventId,
    actorUserId,
    options
  );

  if (!assignment || getDocumentId(assignment.event?.organization) !== getDocumentId(organizationId)) {
    return {
      error: "Manager is not assigned to this event",
      outcome: TICKET_VALIDATION_OUTCOME.MANAGER_NOT_ASSIGNED,
      statusCode: HTTP_STATUS.FORBIDDEN,
    };
  }

  return { actorUser, event, assignment };
}

async function getEventTicketValidation(organizationId, actorUserId, eventId, payload, dependencies, options = {}) {
  const context = await getEventTicketOperatorContext(
    organizationId,
    actorUserId,
    eventId,
    dependencies,
    options
  );

  if (context.error) {
    return context;
  }

  if (!isEventCheckInEligible(context.event)) {
    return buildTicketValidationResult(
      TICKET_VALIDATION_OUTCOME.EVENT_NOT_CHECKIN_ELIGIBLE,
      "Event is not eligible for check-in",
      null,
      HTTP_STATUS.BAD_REQUEST
    );
  }

  const ticket = await resolveTicketForValidation(payload, dependencies, options);

  if (!ticket) {
    return buildTicketValidationResult(
      TICKET_VALIDATION_OUTCOME.INVALID_TICKET,
      "Ticket not found",
      null,
      HTTP_STATUS.NOT_FOUND
    );
  }

  if (getDocumentId(ticket.event) !== getDocumentId(eventId)) {
    return buildTicketValidationResult(
      TICKET_VALIDATION_OUTCOME.WRONG_EVENT,
      "Ticket belongs to a different event"
    );
  }

  if (getDocumentId(ticket.organization) !== getDocumentId(organizationId)) {
    return buildTicketValidationResult(
      TICKET_VALIDATION_OUTCOME.ORGANIZATION_MISMATCH,
      "Ticket does not belong to this organization"
    );
  }

  if (ticket.status === TICKET_STATUS.CANCELED) {
    return buildTicketValidationResult(
      TICKET_VALIDATION_OUTCOME.CANCELED_TICKET,
      "Ticket has been canceled",
      ticket
    );
  }

  if (ticket.status === TICKET_STATUS.REFUNDED) {
    return buildTicketValidationResult(
      TICKET_VALIDATION_OUTCOME.REFUNDED_TICKET,
      "Ticket has been refunded",
      ticket
    );
  }

  if (ticket.status === TICKET_STATUS.USED || ticket.checkedInAt) {
    return buildTicketValidationResult(
      TICKET_VALIDATION_OUTCOME.ALREADY_CHECKED_IN,
      "Ticket is already checked in",
      ticket
    );
  }

  if (!isOrderPaidForCheckIn(ticket.order, eventId, organizationId)) {
    return buildTicketValidationResult(
      TICKET_VALIDATION_OUTCOME.ORDER_NOT_PAID,
      "Ticket does not belong to a paid order",
      ticket
    );
  }

  if (!ticket.ticketType || ticket.ticketType.status !== TICKET_TYPE_STATUS.ACTIVE) {
    return buildTicketValidationResult(
      TICKET_VALIDATION_OUTCOME.INACTIVE_TICKET,
      "Ticket type is inactive",
      ticket
    );
  }

  const existingAttendance = await dependencies.eventAttendanceRepository.findAttendanceByTicket(
    ticket._id,
    options
  );

  if (existingAttendance) {
    return {
      ...buildTicketValidationResult(
        TICKET_VALIDATION_OUTCOME.ALREADY_CHECKED_IN,
        "Ticket is already checked in",
        ticket
      ),
      attendance: mapEventAttendanceResponse(existingAttendance),
    };
  }

  return {
    ...buildTicketValidationResult(
      TICKET_VALIDATION_OUTCOME.VALID,
      "Ticket is valid for check-in",
      ticket,
      HTTP_STATUS.OK
    ),
    ticketDocument: ticket,
    event: context.event,
  };
}

function toPublicTicketValidation(validation) {
  const { ticketDocument, event, ...result } = validation;
  return result;
}

export async function validateEventTicket(organizationId, actorUserId, eventId, payload, dependencies = defaultDependencies) {
  const validation = await getEventTicketValidation(
    organizationId,
    actorUserId,
    eventId,
    payload,
    dependencies
  );

  return toPublicTicketValidation(validation);
}

export async function checkInEventTicket(organizationId, actorUserId, eventId, payload, dependencies = defaultDependencies) {
  try {
    return await runInTransaction(dependencies, async (session) => {
      const options = { session };
      const validation = await getEventTicketValidation(
        organizationId,
        actorUserId,
        eventId,
        payload,
        dependencies,
        options
      );

      if (validation.error || !validation.valid) {
        return toPublicTicketValidation(validation);
      }

      const ticket = validation.ticketDocument;
      const currentAttendanceCount = await dependencies.eventAttendanceRepository.countAttendanceByEvent(
        eventId,
        options
      );

      if (currentAttendanceCount >= Number(validation.event.capacity)) {
        return {
          error: "Event capacity has been reached",
          outcome: TICKET_VALIDATION_OUTCOME.EVENT_NOT_CHECKIN_ELIGIBLE,
          statusCode: HTTP_STATUS.CONFLICT,
        };
      }

      const usedTicket = await dependencies.ticketRepository.markTicketUsed(ticket._id, actorUserId, options);

      if (!usedTicket) {
        const existingAttendance = await dependencies.eventAttendanceRepository.findAttendanceByTicket(
          ticket._id,
          options
        );

        return {
          ...buildTicketValidationResult(
            TICKET_VALIDATION_OUTCOME.ALREADY_CHECKED_IN,
            "Ticket is already checked in",
            ticket
          ),
          attendance: mapEventAttendanceResponse(existingAttendance),
        };
      }

      const attendee = usedTicket.attendee || ticket.attendee || {};
      let attendance;

      try {
        attendance = await dependencies.eventAttendanceRepository.createEventAttendance(
          {
            event: eventId,
            organization: organizationId,
            customer: getDocumentId(usedTicket.purchaser),
            attendeeName: attendee.name,
            attendeePhone: attendee.phone,
            attendeeEmail: normalizeEmail(attendee.email),
            checkedInBy: actorUserId,
            checkedInAt: usedTicket.checkedInAt || new Date(),
            ticket: usedTicket._id,
            order: getDocumentId(usedTicket.order),
          },
          options
        );
      } catch (error) {
        if (!session && error?.code === 11000) {
          const existingAttendance = await dependencies.eventAttendanceRepository.findAttendanceByTicket(
            usedTicket._id
          );

          if (existingAttendance) {
            return {
              ...buildTicketValidationResult(
                TICKET_VALIDATION_OUTCOME.ALREADY_CHECKED_IN,
                "Ticket is already checked in",
                usedTicket
              ),
              attendance: mapEventAttendanceResponse(existingAttendance),
            };
          }
        }

        if (!session && dependencies.ticketRepository.revertTicketCheckIn) {
          await dependencies.ticketRepository.revertTicketCheckIn(
            usedTicket._id,
            actorUserId,
            usedTicket.checkedInAt
          );
        }

        throw error;
      }

      return {
        checkedIn: true,
        valid: true,
        outcome: TICKET_VALIDATION_OUTCOME.VALID,
        ticket: mapTicketResponse(usedTicket),
        attendance: mapEventAttendanceResponse(attendance),
        totalAttendees: currentAttendanceCount + 1,
      };
    });
  } catch (error) {
    const ticket = await resolveTicketForValidation(payload, dependencies).catch(() => null);
    const attendance = ticket
      ? await dependencies.eventAttendanceRepository.findAttendanceByTicket(ticket._id).catch(() => null)
      : null;

    if (attendance || ticket?.status === TICKET_STATUS.USED || ticket?.checkedInAt) {
      return {
        ...buildTicketValidationResult(
          TICKET_VALIDATION_OUTCOME.ALREADY_CHECKED_IN,
          "Ticket is already checked in",
          ticket
        ),
        attendance: mapEventAttendanceResponse(attendance),
      };
    }

    return {
      error: "Check-in could not be completed",
      statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    };
  }
}

export async function createOrderRefund(organizationId, actorUserId, orderReference, payload, dependencies = defaultDependencies) {
  const order = await dependencies.orderRepository.findOrderByReference(orderReference);

  if (!order) {
    return { error: "Order not found", statusCode: HTTP_STATUS.NOT_FOUND };
  }

  if (getDocumentId(order.organization) !== getDocumentId(organizationId)) {
    return { error: "You cannot access another organization", statusCode: HTTP_STATUS.FORBIDDEN };
  }

  const refundableAmount = Number(order.total || 0) - Number(order.refundedAmount || 0);
  const refundAmount = payload.amount || refundableAmount;

  if (refundAmount > refundableAmount) {
    return { error: "Refund amount exceeds refundable balance", statusCode: HTTP_STATUS.BAD_REQUEST };
  }

  const refund = await dependencies.refundRepository.createRefund({
    reference: createReference("ref"),
    order: order._id,
    organization: organizationId,
    event: getDocumentId(order.event),
    requestedBy: actorUserId,
    amount: refundAmount,
    reason: payload.reason,
    status: REFUND_STATUS.PENDING,
  });

  const providerRefund = await dependencies.paystackService.createRefund?.({
    transaction: order.paymentReference,
    amount: refundAmount,
    currency: order.currency || DEFAULT_CURRENCY,
    customerNote: payload.reason,
    merchantNote: `Refund for order ${order.reference}`,
  });

  let finalRefund = refund;

  if (providerRefund?.status) {
    const nextRefundedAmount = Number(order.refundedAmount || 0) + refundAmount;
    const isFullRefund = nextRefundedAmount >= Number(order.total || 0);

    const updatedRefund = await dependencies.refundRepository.updateRefundByReference(refund.reference, {
      status: REFUND_STATUS.SUCCEEDED,
      providerReference: providerRefund.data?.reference || providerRefund.data?.id || "",
      processedAt: new Date(),
    });
    finalRefund = updatedRefund?.amount === undefined ? { ...refund, ...updatedRefund } : updatedRefund;

    await dependencies.orderRepository.updateOrderByReference(order.reference, {
      refundedAmount: nextRefundedAmount,
      paymentStatus: isFullRefund ? PAYMENT_STATUS.REFUNDED : PAYMENT_STATUS.PARTIALLY_REFUNDED,
      orderStatus: isFullRefund ? ORDER_STATUS.REFUNDED : ORDER_STATUS.PARTIALLY_REFUNDED,
    });

    if (isFullRefund) {
      await dependencies.ticketRepository.markTicketsByOrder(order._id, TICKET_STATUS.REFUNDED);
    }
  } else if (providerRefund?.configured) {
    const updatedRefund = await dependencies.refundRepository.updateRefundByReference(refund.reference, {
      status: REFUND_STATUS.FAILED,
      failureReason: providerRefund.message || "Refund provider request failed",
    });
    finalRefund = updatedRefund?.amount === undefined ? { ...refund, ...updatedRefund } : updatedRefund;
  }

  await dependencies.notificationService.sendRefundStatusNotification(finalRefund).catch(() => {});

  return {
    refund: mapRefundResponse(finalRefund),
    refundableAmount: refundableAmount - refundAmount,
  };
}

export async function getEventFinancialSummary(organizationId, actorUserId, eventId, dependencies = defaultDependencies) {
  const analyticsDependencies = dependencies.analyticsRepository
    ? dependencies
    : undefined;
  const result = await analyticsService.getEventAnalytics(
    organizationId,
    actorUserId,
    eventId,
    { preset: "all", timezoneOffsetMinutes: 0 },
    analyticsDependencies
  );

  if (result.error) return result;

  return {
    summary: {
      ...result.summary,
      totalInventory: result.summary.sellableInventory,
      refundedAmount: result.summary.refunds,
      paidOrders: result.summary.successfulOrders,
      noShows: Math.max(0, result.summary.ticketsSold - result.summary.ticketLinkedAttendance),
      ticketTypes: result.ticketTypes,
    },
  };
}

export async function requestWithdrawal(organizationId, actorUserId, payload, dependencies = defaultDependencies) {
  const balance = await getOrganizationWithdrawalBalance(organizationId, actorUserId, dependencies);

  if (balance.error) {
    return balance;
  }

  const availableBalance = balance.availableBalance;

  if (payload.amount > availableBalance) {
    return { error: "Withdrawal amount exceeds available balance", statusCode: HTTP_STATUS.BAD_REQUEST };
  }

  const withdrawal = await dependencies.withdrawalRepository.createWithdrawal({
    reference: createReference("wd"),
    organization: organizationId,
    requestedBy: actorUserId,
    amount: payload.amount,
    status: WITHDRAWAL_STATUS.PENDING,
  });

  return { withdrawal: mapWithdrawalResponse(withdrawal), availableBalance: availableBalance - payload.amount };
}

export async function getOrganizationWithdrawalBalance(organizationId, actorUserId, dependencies = defaultDependencies) {
  const actorContext = await getOrganizationActorContext(organizationId, actorUserId, dependencies);

  if (actorContext.error) {
    return actorContext;
  }

  const financial = await dependencies.orderRepository.getOrganizationFinancialAggregation(organizationId);
  const committedWithdrawals = await dependencies.withdrawalRepository.sumWithdrawals(organizationId, [
    WITHDRAWAL_STATUS.PENDING,
    WITHDRAWAL_STATUS.APPROVED,
    WITHDRAWAL_STATUS.PROCESSING,
    WITHDRAWAL_STATUS.PAID,
  ]);
  const availableBalance = Math.max(0, Number(financial.grossSales || 0) - Number(financial.refundedAmount || 0) - committedWithdrawals);

  return {
    grossSales: Number(financial.grossSales || 0),
    refundedAmount: Number(financial.refundedAmount || 0),
    committedWithdrawals,
    availableBalance,
  };
}

function buildWithdrawalFilter(query = {}, organizationId = null) {
  const filter = {};

  if (organizationId) {
    filter.organization = organizationId;
  }

  if (query.status) {
    filter.status = query.status;
  }

  return filter;
}

export async function getOrganizationWithdrawals(organizationId, actorUserId, query = {}, dependencies = defaultDependencies) {
  const actorContext = await getOrganizationActorContext(organizationId, actorUserId, dependencies);

  if (actorContext.error) {
    return actorContext;
  }

  const pagination = buildPaginationOptions(query, { page: 1, limit: 20, sortBy: "createdAt", sortOrder: -1 });
  const filter = buildWithdrawalFilter(query, organizationId);
  const [withdrawals, totalItems, balance] = await Promise.all([
    dependencies.withdrawalRepository.findWithdrawals(filter, pagination),
    dependencies.withdrawalRepository.countWithdrawals(filter),
    getOrganizationWithdrawalBalance(organizationId, actorUserId, dependencies),
  ]);

  return {
    withdrawals: withdrawals.map(mapWithdrawalResponse),
    balance,
    pagination: buildPaginationMeta(totalItems, pagination),
  };
}

export async function getPlatformWithdrawals(query = {}, dependencies = defaultDependencies) {
  const pagination = buildPaginationOptions(query, { page: 1, limit: 20, sortBy: "createdAt", sortOrder: -1 });
  const filter = buildWithdrawalFilter(query);
  const [withdrawals, totalItems] = await Promise.all([
    dependencies.withdrawalRepository.findWithdrawals(filter, pagination),
    dependencies.withdrawalRepository.countWithdrawals(filter),
  ]);

  return {
    withdrawals: withdrawals.map(mapWithdrawalResponse),
    pagination: buildPaginationMeta(totalItems, pagination),
  };
}

export async function reviewWithdrawal(withdrawalId, reviewerId, action, payload = {}, dependencies = defaultDependencies) {
  const withdrawal = await dependencies.withdrawalRepository.findWithdrawalById(withdrawalId);

  if (!withdrawal) {
    return { error: "Withdrawal not found", statusCode: HTTP_STATUS.NOT_FOUND };
  }

  if (withdrawal.status !== WITHDRAWAL_STATUS.PENDING) {
    return { error: "Withdrawal has already been reviewed", statusCode: HTTP_STATUS.CONFLICT };
  }

  if (action === "reject") {
    const rejected = await dependencies.withdrawalRepository.updateWithdrawalById(withdrawalId, {
      status: WITHDRAWAL_STATUS.REJECTED,
      reviewedBy: reviewerId,
      reviewedAt: new Date(),
      failureReason: payload.reason,
    });

    return { withdrawal: mapWithdrawalResponse(rejected) };
  }

  const approved = await dependencies.withdrawalRepository.updateWithdrawalById(withdrawalId, {
    status: WITHDRAWAL_STATUS.APPROVED,
    reviewedBy: reviewerId,
    reviewedAt: new Date(),
  });

  if (!payload.recipientCode) {
    return { withdrawal: mapWithdrawalResponse(approved) };
  }

  const transferReference = createReference("trf");
  const transfer = await dependencies.paystackService.initiateTransfer?.({
    amount: withdrawal.amount,
    recipient: payload.recipientCode,
    reason: payload.reason || `Withdrawal ${withdrawal.reference}`,
    reference: transferReference,
  });

  if (transfer?.status) {
    const paid = await dependencies.withdrawalRepository.updateWithdrawalById(withdrawalId, {
      status: WITHDRAWAL_STATUS.PAID,
      transferReference: transfer.data?.reference || transferReference,
      paidAt: new Date(),
    });

    return { withdrawal: mapWithdrawalResponse(paid), transfer: transfer.data || null };
  }

  if (transfer?.configured) {
    const failed = await dependencies.withdrawalRepository.updateWithdrawalById(withdrawalId, {
      status: WITHDRAWAL_STATUS.FAILED,
      transferReference,
      failureReason: transfer.message || "Transfer provider request failed",
    });

    return { withdrawal: mapWithdrawalResponse(failed), transfer: null };
  }

  return { withdrawal: mapWithdrawalResponse(approved), transfer: null };
}

export function buildOrderSearchFilter(query = {}) {
  if (!query.search) {
    return {};
  }

  const expression = new RegExp(escapeRegex(query.search), "i");
  return {
    $or: [
      { reference: expression },
      { paymentReference: expression },
      { "customerInfo.email": expression },
      { "customerInfo.name": expression },
    ],
  };
}
