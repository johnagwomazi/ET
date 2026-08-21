export const ORGANIZATION_STATUS_META = {
  PENDING: {
    label: "Pending",
    tone: "warning",
  },
  APPROVED: {
    label: "Approved",
    tone: "success",
  },
  REJECTED: {
    label: "Rejected",
    tone: "danger",
  },
  SUSPENDED: {
    label: "Suspended",
    tone: "neutral",
  },
};

export const USER_STATUS_META = {
  ACTIVE: {
    label: "Active",
    tone: "success",
  },
  INACTIVE: {
    label: "Inactive",
    tone: "neutral",
  },
  SUSPENDED: {
    label: "Suspended",
    tone: "neutral",
  },
  PENDING_VERIFICATION: {
    label: "Pending verification",
    tone: "warning",
  },
};

export const DEFAULT_STATUS_META = {
  label: "Unknown",
  tone: "neutral",
};

export const DEFAULT_TABLE_PAGE_SIZE = 10;

export const DASHBOARD_STAT_KEYS = {
  USERS: "totalUsers",
  ORGANIZATIONS: "totalOrganizations",
  PENDING_ORGANIZATIONS: "pendingOrganizations",
  REVENUE: "totalRevenue",
  EVENTS: "totalEvents",
};
