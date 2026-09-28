import { ANALYTICS_SUCCESSFUL_PAYMENT_STATUSES } from "../constants/analytics.constants.js";
import { ORGANIZATION_STATUS } from "../constants/organizationStatus.constants.js";
import { USER_ROLES } from "../constants/roles.constants.js";
import { TICKET_SOURCE } from "../constants/ticketing.constants.js";
import * as eventRepository from "../repositories/event.repository.js";
import * as orderRepository from "../repositories/order.repository.js";
import * as organizationRepository from "../repositories/organization.repository.js";
import * as userRepository from "../repositories/user.repository.js";
import { mapOrganizationResponse } from "../utils/organizationResponse.util.js";
import { PUBLIC_DISCOVERY_STATUSES } from "../utils/eventDiscovery.util.js";
import { trustedOperator } from "../utils/trustedFilter.util.js";
import { mapUserResponse } from "../utils/userResponse.util.js";

const defaultDependencies = {
  eventRepository,
  orderRepository,
  organizationRepository,
  userRepository,
};

async function countOrganizationsByStatus(status, dependencies) {
  return dependencies.organizationRepository.countOrganizations({
    isDeleted: false,
    status,
  });
}

function documentValue(document) {
  return typeof document?.toObject === "function" ? document.toObject() : document || {};
}

function documentId(document) {
  const value = document?._id || document?.id;
  return value ? String(value) : "unknown";
}

function buildRecentActivity(recentOrganizations, recentEvents, recentOrders) {
  const organizationActivity = recentOrganizations.map((organizationDocument) => {
    const organization = documentValue(organizationDocument);
    return {
      id: `organization-${documentId(organization)}`,
      type: "ORGANIZATION_CREATED",
      title: "Organization created",
      description: `${organization.organizationName || "A new organization"} joined the platform.`,
      occurredAt: organization.createdAt,
    };
  });

  const eventActivity = recentEvents.map((eventDocument) => {
    const event = documentValue(eventDocument);
    return {
      id: `event-${documentId(event)}`,
      type: "EVENT_CREATED",
      title: "Event created",
      description: `${event.eventName || "A new event"} was created with ${String(event.status || "draft").toLowerCase()} status.`,
      occurredAt: event.createdAt,
    };
  });

  const orderActivity = recentOrders.map((orderDocument) => {
    const order = documentValue(orderDocument);
    const event = documentValue(order.event);
    const ticketQuantity = (order.items || []).reduce((total, item) => total + Number(item.quantity || 0), 0);
    return {
      id: `order-${documentId(order)}`,
      type: "TICKET_PURCHASED",
      title: "Ticket purchase completed",
      description: `${ticketQuantity} ticket${ticketQuantity === 1 ? "" : "s"} purchased for ${event.eventName || "an event"}.`,
      occurredAt: order.paidAt || order.createdAt,
    };
  });

  return [...organizationActivity, ...eventActivity, ...orderActivity]
    .filter((activity) => activity.occurredAt)
    .sort((first, second) => new Date(second.occurredAt).getTime() - new Date(first.occurredAt).getTime())
    .slice(0, 8);
}

export async function getDashboardOverview(dependencies = defaultDependencies, now = new Date()) {
  const activeEventFilter = {
    status: trustedOperator({ $in: PUBLIC_DISCOVERY_STATUSES }),
    endAt: trustedOperator({ $gt: now }),
  };
  const paidOrderFilter = {
    paymentStatus: trustedOperator({ $in: ANALYTICS_SUCCESSFUL_PAYMENT_STATUSES }),
    source: trustedOperator({ $ne: TICKET_SOURCE.COMPLIMENTARY }),
  };

  const [
    totalUsers,
    totalCustomers,
    totalAdmins,
    totalManagers,
    totalOrganizations,
    activeOrganizations,
    suspendedOrganizations,
    totalEvents,
    activeEvents,
    recentUsers,
    recentOrganizations,
    recentEvents,
    recentOrders,
  ] =
    await Promise.all([
      dependencies.userRepository.countUsers({ isDeleted: false }),
      dependencies.userRepository.countUsers({ isDeleted: false, role: USER_ROLES.CUSTOMER }),
      dependencies.userRepository.countUsers({ isDeleted: false, role: USER_ROLES.ADMIN }),
      dependencies.userRepository.countUsers({ isDeleted: false, role: USER_ROLES.MANAGER }),
      dependencies.organizationRepository.countOrganizations({ isDeleted: false }),
      countOrganizationsByStatus(ORGANIZATION_STATUS.ACTIVE, dependencies),
      countOrganizationsByStatus(ORGANIZATION_STATUS.SUSPENDED, dependencies),
      dependencies.eventRepository.countEvents(),
      dependencies.eventRepository.countEvents(activeEventFilter),
      dependencies.userRepository.findUsers({ isDeleted: false }, { sortBy: "createdAt", sortOrder: -1, limit: 5 }),
      dependencies.organizationRepository.findOrganizations({ isDeleted: false }, { sortBy: "createdAt", sortOrder: -1, limit: 5 }),
      dependencies.eventRepository.findEvents({}, { sortBy: "createdAt", sortOrder: -1, limit: 5 }),
      dependencies.orderRepository.findOrders(paidOrderFilter, { sortBy: "paidAt", sortOrder: -1, limit: 5 }),
    ]);

  return {
    totalUsers,
    totalOrganizations,
    activeOrganizations,
    suspendedOrganizations,
    totalCustomers,
    totalAdmins,
    totalManagers,
    totalEvents,
    activeEvents,
    totalRevenue: 0,
    totalTicketsSold: 0,
    recentUsers: recentUsers.map(mapUserResponse),
    recentOrganizations: recentOrganizations.map(mapOrganizationResponse),
    recentActivity: buildRecentActivity(recentOrganizations, recentEvents, recentOrders),
  };
}

export async function getPlatformStatistics() {
  return getDashboardOverview();
}
