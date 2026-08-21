import { ORGANIZATION_STATUS } from "../constants/organizationStatus.constants.js";
import { USER_ROLES } from "../constants/roles.constants.js";
import * as organizationRepository from "../repositories/organization.repository.js";
import * as userRepository from "../repositories/user.repository.js";
import { mapOrganizationResponse } from "../utils/organizationResponse.util.js";
import { mapUserResponse } from "../utils/userResponse.util.js";

async function countOrganizationsByStatus(status) {
  return organizationRepository.countOrganizations({
    isDeleted: false,
    status,
  });
}

export async function getDashboardOverview() {
  const [totalUsers, totalCustomers, totalAdmins, totalManagers, pendingOrganizations, approvedOrganizations, rejectedOrganizations, suspendedOrganizations, recentUsers, recentOrganizations] =
    await Promise.all([
      userRepository.countUsers({ isDeleted: false }),
      userRepository.countUsers({ isDeleted: false, role: USER_ROLES.CUSTOMER }),
      userRepository.countUsers({ isDeleted: false, role: USER_ROLES.ADMIN }),
      userRepository.countUsers({ isDeleted: false, role: USER_ROLES.MANAGER }),
      countOrganizationsByStatus(ORGANIZATION_STATUS.PENDING),
      countOrganizationsByStatus(ORGANIZATION_STATUS.APPROVED),
      countOrganizationsByStatus(ORGANIZATION_STATUS.REJECTED),
      countOrganizationsByStatus(ORGANIZATION_STATUS.SUSPENDED),
      userRepository.findUsers({ isDeleted: false }, { sortBy: "createdAt", sortOrder: -1, limit: 5 }),
      organizationRepository.findOrganizations({ isDeleted: false }, { sortBy: "createdAt", sortOrder: -1, limit: 5 }),
    ]);

  return {
    totalUsers,
    totalOrganizations:
      pendingOrganizations + approvedOrganizations + rejectedOrganizations + suspendedOrganizations,
    pendingOrganizations,
    approvedOrganizations,
    rejectedOrganizations,
    suspendedOrganizations,
    totalCustomers,
    totalAdmins,
    totalManagers,
    totalEvents: 0,
    totalRevenue: 0,
    totalTicketsSold: 0,
    recentUsers: recentUsers.map(mapUserResponse),
    recentOrganizations: recentOrganizations.map(mapOrganizationResponse),
    recentActivity: [],
  };
}

export async function getPlatformStatistics() {
  return getDashboardOverview();
}
