import { HTTP_STATUS } from "../constants/httpStatus.constants.js";
import { EVENT_STATUS } from "../constants/eventStatus.constants.js";
import { ORGANIZATION_STATUS } from "../constants/organizationStatus.constants.js";
import { DEFAULT_CURRENCY } from "../constants/ticketing.constants.js";
import * as analyticsRepository from "../repositories/analytics.repository.js";
import * as authRepository from "../repositories/auth.repository.js";
import * as eventRepository from "../repositories/event.repository.js";
import * as orderRepository from "../repositories/order.repository.js";
import * as organizationRepository from "../repositories/organization.repository.js";
import * as userRepository from "../repositories/user.repository.js";
import * as withdrawalRepository from "../repositories/withdrawal.repository.js";
import { buildAnalyticsSummary } from "./analytics.service.js";
import { calculateOrganizationFinancialPosition } from "./finance.service.js";
import { fromMinorUnits } from "../utils/analytics.util.js";
import { mapFinanceWithdrawal, mapFinancialPosition } from "../utils/financeResponse.util.js";
import { buildPaginationMeta, buildPaginationOptions, escapeRegex } from "../utils/query.util.js";
import { getDocumentId, mapOrderResponse } from "../utils/ticketingResponse.util.js";
import { trustedOperator } from "../utils/trustedFilter.util.js";
import {
  mapOrganizationProfileResponse,
  mapOrganizationResponse,
  mapOrganizationSettingsResponse,
} from "../utils/organizationResponse.util.js";

const organizationDetailsDependencies = {
  analyticsRepository,
  eventRepository,
  orderRepository,
  organizationRepository,
  userRepository,
  withdrawalRepository,
  calculateOrganizationFinancialPosition,
};

function buildOrganizationFilter(query = {}) {
  const filter = {
    isDeleted: false,
  };

  if (query.status) {
    filter.status = query.status;
  }

  if (query.search) {
    const searchExpression = new RegExp(escapeRegex(query.search), "i");

    filter.$or = [
      { organizationName: searchExpression },
      { businessEmail: searchExpression },
    ];
  }

  return filter;
}

function canApproveOrganization(organization) {
  return organization.status === ORGANIZATION_STATUS.PENDING || organization.status === ORGANIZATION_STATUS.REJECTED;
}

function canRejectOrganization(organization) {
  return organization.status === ORGANIZATION_STATUS.PENDING;
}

function canSuspendOrganization(organization) {
  return organization.status === ORGANIZATION_STATUS.APPROVED;
}

function canReactivateOrganization(organization) {
  return organization.status === ORGANIZATION_STATUS.SUSPENDED;
}

function buildApprovalMetadata(actorUserId) {
  return {
    approvedBy: actorUserId,
    approvedAt: new Date(),
    rejectedBy: null,
    rejectedAt: null,
    rejectionReason: "",
    status: ORGANIZATION_STATUS.APPROVED,
  };
}

function buildRejectionMetadata(actorUserId, rejectionReason) {
  return {
    rejectedBy: actorUserId,
    rejectedAt: new Date(),
    rejectionReason,
    status: ORGANIZATION_STATUS.REJECTED,
  };
}

function buildSuspensionMetadata(actorUserId, suspensionReason) {
  return {
    suspendedBy: actorUserId,
    suspendedAt: new Date(),
    suspensionReason,
    status: ORGANIZATION_STATUS.SUSPENDED,
  };
}

function buildReactivationMetadata(actorUserId) {
  return {
    reactivatedBy: actorUserId,
    reactivatedAt: new Date(),
    status: ORGANIZATION_STATUS.APPROVED,
  };
}

function normalizeEmail(email) {
  if (!email) {
    return "";
  }

  return email.trim().toLowerCase();
}

function buildOrganizationProfileUpdateData(profileData = {}, currentOrganization = {}) {
  const updateData = {};

  if (profileData.organizationName !== undefined) {
    updateData.organizationName = profileData.organizationName;
  }

  if (profileData.businessEmail !== undefined) {
    updateData.businessEmail = normalizeEmail(profileData.businessEmail);
  }

  if (profileData.businessPhone !== undefined) {
    updateData.businessPhone = profileData.businessPhone;
  }

  if (profileData.website !== undefined) {
    updateData.website = profileData.website;
  }

  if (profileData.address !== undefined) {
    updateData.address = profileData.address;
  }

  if (profileData.logo !== undefined) {
    updateData.logo = {
      ...(currentOrganization.logo || {}),
      ...profileData.logo,
    };
  }

  return updateData;
}

function buildOrganizationSettingsUpdateData(settingsData = {}, currentOrganization = {}) {
  const updateData = {};

  if (settingsData.socialLinks !== undefined) {
    updateData.socialLinks = {
      ...(currentOrganization.socialLinks || {}),
      ...settingsData.socialLinks,
    };
  }

  return updateData;
}

function buildOrganizationDashboardSummary(organization) {
  const organizationResponse = mapOrganizationProfileResponse(organization);

  return {
    id: organizationResponse._id || null,
    name: organizationResponse.organizationName || "",
    status: organizationResponse.status || null,
    businessEmail: organizationResponse.businessEmail || "",
    businessPhone: organizationResponse.businessPhone || "",
    createdAt: organizationResponse.createdAt || null,
    approvedAt: organizationResponse.approvedAt || null,
    suspendedAt: organizationResponse.suspendedAt || null,
    reactivatedAt: organizationResponse.reactivatedAt || null,
    logo: organizationResponse.logo || {},
    primaryAdmin: organizationResponse.primaryAdmin || null,
  };
}

function addActivityItem(activityItems, activityType, title, occurredAt, description = "") {
  if (!occurredAt) {
    return;
  }

  activityItems.push({
    type: activityType,
    title,
    description,
    occurredAt,
  });
}

function buildRecentActivity(organization, recentMemberDocuments) {
  const activityItems = [];

  addActivityItem(
    activityItems,
    "ORGANIZATION_CREATED",
    "Organization created",
    organization.createdAt,
    "The organization record was created."
  );
  addActivityItem(
    activityItems,
    "ORGANIZATION_APPROVED",
    "Organization approved",
    organization.approvedAt,
    "The organization was approved by a super admin."
  );
  addActivityItem(
    activityItems,
    "ORGANIZATION_REJECTED",
    "Organization rejected",
    organization.rejectedAt,
    "The organization was rejected by a super admin."
  );
  addActivityItem(
    activityItems,
    "ORGANIZATION_SUSPENDED",
    "Organization suspended",
    organization.suspendedAt,
    "The organization was suspended by a super admin."
  );
  addActivityItem(
    activityItems,
    "ORGANIZATION_REACTIVATED",
    "Organization reactivated",
    organization.reactivatedAt,
    "The organization was reactivated by a super admin."
  );

  recentMemberDocuments.forEach((memberDocument) => {
    const memberName = [memberDocument.firstName, memberDocument.lastName].filter(Boolean).join(" ").trim();
    const displayName = memberName || memberDocument.email || "Member";

    addActivityItem(
      activityItems,
      "MEMBER_REGISTERED",
      `${displayName} joined the organization`,
      memberDocument.createdAt,
      "A new organization member was created."
    );
    addActivityItem(
      activityItems,
      "MEMBER_SUSPENDED",
      `${displayName} was suspended`,
      memberDocument.suspendedAt,
      memberDocument.suspensionReason || "An organization member was suspended."
    );
    addActivityItem(
      activityItems,
      "MEMBER_REACTIVATED",
      `${displayName} was reactivated`,
      memberDocument.reactivatedAt,
      "An organization member was reactivated."
    );
    addActivityItem(
      activityItems,
      "MEMBER_DELETED",
      `${displayName} was removed`,
      memberDocument.deletedAt,
      "An organization member was removed from the organization."
    );
  });

  return activityItems.sort((firstActivity, secondActivity) => {
    const firstTime = new Date(firstActivity.occurredAt).getTime();
    const secondTime = new Date(secondActivity.occurredAt).getTime();

    return secondTime - firstTime;
  }).slice(0, 5);
}

function mapOrganizationEventPerformance(row) {
  const ticketsSold = Number(row.ticketsSold || 0);
  const sellableInventory = Number(row.sellableInventory || 0);

  return {
    id: getDocumentId(row),
    eventName: row.eventName || "Untitled event",
    status: row.status || null,
    startAt: row.startAt || null,
    endAt: row.endAt || null,
    capacity: Number(row.capacity || 0),
    currency: DEFAULT_CURRENCY,
    ticketsSold,
    successfulOrders: Number(row.successfulOrders || 0),
    grossSales: fromMinorUnits(row.grossSalesMinor),
    refunds: fromMinorUnits(row.refundsMinor),
    netRevenue: fromMinorUnits(row.netRevenueMinor),
    sellableInventory,
    ticketsRemaining: Math.max(0, sellableInventory - Number(row.reservedInventory || 0)),
  };
}

function mapOrganizationMember(memberDocument, organization) {
  const member = typeof memberDocument?.toObject === "function"
    ? memberDocument.toObject()
    : memberDocument || {};
  const memberId = getDocumentId(member);

  return {
    id: memberId,
    firstName: member.firstName || "",
    lastName: member.lastName || "",
    email: member.email || "",
    role: member.role || null,
    accountStatus: member.accountStatus || null,
    isEmailVerified: Boolean(member.isEmailVerified),
    isOwner: memberId === getDocumentId(organization.primaryAdmin),
    lastLoginAt: member.lastLoginAt || null,
    createdAt: member.createdAt || null,
  };
}

function buildOrganizationDetailsActivity(
  organization,
  recentMembers = [],
  recentEvents = [],
  recentOrders = [],
  recentWithdrawals = []
) {
  const activityItems = [...buildRecentActivity(organization, recentMembers)];

  recentEvents.forEach((eventDocument) => {
    const event = typeof eventDocument?.toObject === "function" ? eventDocument.toObject() : eventDocument;
    addActivityItem(
      activityItems,
      "EVENT_CREATED",
      `${event?.eventName || "Event"} was created`,
      event?.createdAt,
      `Event status: ${event?.status || "unknown"}.`
    );
  });

  recentOrders.forEach((orderDocument) => {
    const order = typeof orderDocument?.toObject === "function" ? orderDocument.toObject() : orderDocument;
    addActivityItem(
      activityItems,
      "TICKET_ORDER_CREATED",
      `Ticket order ${order?.reference || "created"}`,
      order?.createdAt,
      `${order?.customerInfo?.name || "A customer"} placed an order for ${order?.currency || DEFAULT_CURRENCY} ${Number(order?.total || 0).toLocaleString("en-US")}.`
    );
  });

  recentWithdrawals.forEach((withdrawalDocument) => {
    const withdrawal = typeof withdrawalDocument?.toObject === "function"
      ? withdrawalDocument.toObject()
      : withdrawalDocument;
    addActivityItem(
      activityItems,
      "WITHDRAWAL_REQUESTED",
      `Withdrawal ${withdrawal?.reference || "requested"}`,
      withdrawal?.createdAt,
      `Withdrawal status: ${withdrawal?.status || "unknown"}.`
    );
  });

  return activityItems
    .sort((firstActivity, secondActivity) => (
      new Date(secondActivity.occurredAt).getTime() - new Date(firstActivity.occurredAt).getTime()
    ))
    .slice(0, 20)
    .map((activity, index) => ({
      id: `${activity.type}-${new Date(activity.occurredAt).getTime()}-${index}`,
      ...activity,
    }));
}

function detailsPagination(page, limit, sortBy = "createdAt") {
  return buildPaginationOptions(
    { page, limit, sortBy, sortOrder: "desc" },
    { page: 1, limit: 10, sortBy, sortOrder: -1 }
  );
}

export async function getOrganizations(query) {
  const pagination = buildPaginationOptions(query, {
    page: 1,
    limit: 10,
    sortBy: "createdAt",
  });
  const filter = buildOrganizationFilter(query);
  const [organizations, totalItems] = await Promise.all([
    organizationRepository.findOrganizations(filter, pagination),
    organizationRepository.countOrganizations(filter),
  ]);

  return {
    organizations: organizations.map(mapOrganizationResponse),
    pagination: buildPaginationMeta(totalItems, pagination),
  };
}

export async function getOrganizationById(organizationId) {
  const organization = await organizationRepository.findOrganizationDetailsById(organizationId);

  if (!organization) {
    return {
      error: "Organization not found",
      statusCode: HTTP_STATUS.NOT_FOUND,
    };
  }

  return {
    organization: mapOrganizationResponse(organization),
  };
}

export async function getOrganizationDetails(
  organizationId,
  query = {},
  dependencies = organizationDetailsDependencies
) {
  const organization = await dependencies.organizationRepository.findOrganizationDetailsById(organizationId);

  if (!organization) {
    return {
      error: "Organization not found",
      statusCode: HTTP_STATUS.NOT_FOUND,
    };
  }

  const limit = query.limit || 10;
  const eventPage = detailsPagination(query.eventsPage, limit, "netRevenue");
  const salesPage = detailsPagination(query.salesPage, limit);
  const withdrawalPage = detailsPagination(query.withdrawalsPage, limit);
  const memberPage = detailsPagination(query.membersPage, limit);
  const organizationFilter = { organization: organizationId };
  const memberFilter = { organization: organizationId, isDeleted: false };
  const now = new Date();
  const currentEventFilter = {
    organization: organizationId,
    status: trustedOperator({ $in: [EVENT_STATUS.PUBLISHED, EVENT_STATUS.POSTPONED] }),
    endAt: trustedOperator({ $gte: now }),
  };

  const [
    rawOverview,
    currentEvents,
    eventPerformance,
    sales,
    salesTotal,
    financialPosition,
    withdrawals,
    withdrawalsTotal,
    members,
    membersTotal,
    recentEvents,
    recentOrders,
    recentWithdrawals,
    recentMembers,
  ] = await Promise.all([
    dependencies.analyticsRepository.getScopeOverview({ organizationId }, {}),
    dependencies.eventRepository.countEvents(currentEventFilter),
    dependencies.analyticsRepository.getEventPerformance({ organizationId }, {}, eventPage),
    dependencies.orderRepository.findOrders(organizationFilter, salesPage),
    dependencies.orderRepository.countOrders(organizationFilter),
    dependencies.calculateOrganizationFinancialPosition(organizationId, dependencies),
    dependencies.withdrawalRepository.findWithdrawals(organizationFilter, withdrawalPage),
    dependencies.withdrawalRepository.countWithdrawals(organizationFilter),
    dependencies.userRepository.findOrganizationMembers(memberFilter, memberPage),
    dependencies.userRepository.countUsers(memberFilter),
    dependencies.eventRepository.findEvents(organizationFilter, { limit: 5, sortBy: "createdAt", sortOrder: -1 }),
    dependencies.orderRepository.findOrders(organizationFilter, { limit: 5, sortBy: "createdAt", sortOrder: -1 }),
    dependencies.withdrawalRepository.findWithdrawals(organizationFilter, { limit: 5, sortBy: "createdAt", sortOrder: -1 }),
    dependencies.userRepository.findOrganizationRecentMemberActivity(organizationId, 5),
  ]);

  const analyticsSummary = buildAnalyticsSummary(rawOverview);
  const financialSummary = mapFinancialPosition(financialPosition);
  const organizationResponse = mapOrganizationResponse(organization);

  return {
    organization: organizationResponse,
    summary: {
      totalEvents: Number(analyticsSummary.events || 0),
      currentEvents: Number(currentEvents || 0),
      ticketsSold: Number(analyticsSummary.ticketsSold || 0),
      grossTicketSales: Number(analyticsSummary.grossSales || 0),
      availableBalance: Number(financialSummary.availableBalance || 0),
      pendingWithdrawals: Number(financialSummary.pendingWithdrawals || 0),
      totalWithdrawn: Number(financialSummary.completedWithdrawals || 0),
      currency: financialSummary.currency || analyticsSummary.currency || DEFAULT_CURRENCY,
    },
    overview: {
      ...analyticsSummary,
      financialSummary,
    },
    events: {
      items: (eventPerformance.items || []).map(mapOrganizationEventPerformance),
      pagination: buildPaginationMeta(eventPerformance.totalItems || 0, eventPage),
    },
    ticketSales: {
      items: sales.map(mapOrderResponse),
      pagination: buildPaginationMeta(salesTotal, salesPage),
    },
    finance: {
      ...financialSummary,
      withdrawals: withdrawals.map(mapFinanceWithdrawal),
      pagination: buildPaginationMeta(withdrawalsTotal, withdrawalPage),
    },
    members: {
      items: members.map((member) => mapOrganizationMember(member, organization)),
      pagination: buildPaginationMeta(membersTotal, memberPage),
    },
    activity: buildOrganizationDetailsActivity(
      organization,
      recentMembers,
      recentEvents,
      recentOrders,
      recentWithdrawals
    ),
  };
}

export async function approveOrganization(organizationId, actorUserId) {
  const organization = await organizationRepository.findOrganizationDetailsById(organizationId);

  if (!organization) {
    return {
      error: "Organization not found",
      statusCode: HTTP_STATUS.NOT_FOUND,
    };
  }

  if (!canApproveOrganization(organization)) {
    return {
      error: "This organization cannot be approved from its current state",
      statusCode: HTTP_STATUS.BAD_REQUEST,
    };
  }

  const updatedOrganization = await organizationRepository.updateOrganizationStatusById(organizationId, {
    ...buildApprovalMetadata(actorUserId),
  });

  return {
    organization: mapOrganizationResponse(updatedOrganization),
  };
}

export async function rejectOrganization(organizationId, actorUserId, rejectionReason) {
  const organization = await organizationRepository.findOrganizationDetailsById(organizationId);

  if (!organization) {
    return {
      error: "Organization not found",
      statusCode: HTTP_STATUS.NOT_FOUND,
    };
  }

  if (!canRejectOrganization(organization)) {
    return {
      error: "Only pending organizations can be rejected",
      statusCode: HTTP_STATUS.BAD_REQUEST,
    };
  }

  const updatedOrganization = await organizationRepository.updateOrganizationStatusById(organizationId, {
    ...buildRejectionMetadata(actorUserId, rejectionReason),
  });

  return {
    organization: mapOrganizationResponse(updatedOrganization),
  };
}

export async function suspendOrganization(organizationId, actorUserId, suspensionReason) {
  const organization = await organizationRepository.findOrganizationDetailsById(organizationId);

  if (!organization) {
    return {
      error: "Organization not found",
      statusCode: HTTP_STATUS.NOT_FOUND,
    };
  }

  if (!canSuspendOrganization(organization)) {
    return {
      error: "Only approved organizations can be suspended",
      statusCode: HTTP_STATUS.BAD_REQUEST,
    };
  }

  const updatedOrganization = await organizationRepository.updateOrganizationStatusById(organizationId, {
    ...buildSuspensionMetadata(actorUserId, suspensionReason),
  });

  return {
    organization: mapOrganizationResponse(updatedOrganization),
  };
}

export async function reactivateOrganization(organizationId, actorUserId) {
  const organization = await organizationRepository.findOrganizationDetailsById(organizationId);

  if (!organization) {
    return {
      error: "Organization not found",
      statusCode: HTTP_STATUS.NOT_FOUND,
    };
  }

  if (!canReactivateOrganization(organization)) {
    return {
      error: "Only suspended organizations can be reactivated",
      statusCode: HTTP_STATUS.BAD_REQUEST,
    };
  }

  const updatedOrganization = await organizationRepository.updateOrganizationStatusById(organizationId, {
    ...buildReactivationMetadata(actorUserId),
  });

  return {
    organization: mapOrganizationResponse(updatedOrganization),
  };
}

export async function deleteOrganization(organizationId, actorUserId) {
  const organization = await organizationRepository.findOrganizationDetailsById(organizationId);

  if (!organization) {
    return {
      error: "Organization not found",
      statusCode: HTTP_STATUS.NOT_FOUND,
    };
  }

  const updatedOrganization = await organizationRepository.softDeleteOrganizationById(organizationId, {
    isDeleted: true,
    deletedAt: new Date(),
    deletedBy: actorUserId,
  });

  return {
    organization: mapOrganizationResponse(updatedOrganization),
  };
}

export async function getMyOrganizationProfile(organizationId) {
  const organization = await organizationRepository.findOrganizationDetailsById(organizationId);

  if (!organization) {
    return {
      error: "Organization not found",
      statusCode: HTTP_STATUS.NOT_FOUND,
    };
  }

  return {
    organization: mapOrganizationProfileResponse(organization),
  };
}

export async function updateMyOrganizationProfile(organizationId, profileData) {
  const organization = await organizationRepository.findOrganizationDetailsById(organizationId);

  if (!organization) {
    return {
      error: "Organization not found",
      statusCode: HTTP_STATUS.NOT_FOUND,
    };
  }

  const normalizedBusinessEmail = profileData.businessEmail ? normalizeEmail(profileData.businessEmail) : "";

  if (
    normalizedBusinessEmail &&
    normalizedBusinessEmail !== organization.businessEmail &&
    (await authRepository.isEmailAlreadyUsed(normalizedBusinessEmail))
  ) {
    return {
      error: "Email already in use",
      statusCode: HTTP_STATUS.CONFLICT,
    };
  }

  const updateData = buildOrganizationProfileUpdateData(profileData, organization);

  if (Object.keys(updateData).length === 0) {
    return {
      organization: mapOrganizationProfileResponse(organization),
    };
  }

  const updatedOrganization = await organizationRepository.updateOrganizationById(organizationId, updateData);

  if (!updatedOrganization) {
    return {
      error: "Organization not found",
      statusCode: HTTP_STATUS.NOT_FOUND,
    };
  }

  const organizationDetails = await organizationRepository.findOrganizationDetailsById(organizationId);

  return {
    organization: mapOrganizationProfileResponse(organizationDetails || updatedOrganization),
  };
}

export async function getMyOrganizationSettings(organizationId) {
  const organization = await organizationRepository.findOrganizationDetailsById(organizationId);

  if (!organization) {
    return {
      error: "Organization not found",
      statusCode: HTTP_STATUS.NOT_FOUND,
    };
  }

  return {
    settings: mapOrganizationSettingsResponse(organization),
  };
}

export async function updateMyOrganizationSettings(organizationId, settingsData) {
  const organization = await organizationRepository.findOrganizationDetailsById(organizationId);

  if (!organization) {
    return {
      error: "Organization not found",
      statusCode: HTTP_STATUS.NOT_FOUND,
    };
  }

  const updateData = buildOrganizationSettingsUpdateData(settingsData, organization);

  if (Object.keys(updateData).length === 0) {
    return {
      settings: mapOrganizationSettingsResponse(organization),
    };
  }

  const updatedOrganization = await organizationRepository.updateOrganizationById(organizationId, updateData);

  if (!updatedOrganization) {
    return {
      error: "Organization not found",
      statusCode: HTTP_STATUS.NOT_FOUND,
    };
  }

  const organizationDetails = await organizationRepository.findOrganizationDetailsById(organizationId);

  return {
    settings: mapOrganizationSettingsResponse(organizationDetails || updatedOrganization),
  };
}

export async function getOrganizationDashboard(organizationId) {
  if (!organizationId) {
    return {
      error: "Organization access is required",
      statusCode: HTTP_STATUS.FORBIDDEN,
    };
  }

  const organization = await organizationRepository.findOrganizationDetailsById(organizationId);

  if (!organization) {
    return {
      error: "Organization not found",
      statusCode: HTTP_STATUS.NOT_FOUND,
    };
  }

  const [memberStats, recentMemberDocuments] = await Promise.all([
    userRepository.getOrganizationMemberStatistics(organizationId),
    userRepository.findOrganizationRecentMemberActivity(organizationId, 5),
  ]);

  const organizationSummary = buildOrganizationDashboardSummary(organization);
  const recentActivity = buildRecentActivity(organization, recentMemberDocuments);

  return {
    organization: organizationSummary,
    stats: memberStats,
    recentActivity,
    quickActions: [
      {
        label: "Manage Organization",
        path: "/organizations/me",
      },
      {
        label: "Manage Members",
        path: "/organizations/me/members",
      },
      {
        label: "Organization Settings",
        path: "/organizations/me/settings",
      },
    ],
  };
}
