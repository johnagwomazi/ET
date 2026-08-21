import { DASHBOARD_ROUTES, USER_ROLES } from "../constants/roles.constants";

export function getDashboardRouteForRole(role) {
  if (role === USER_ROLES.SUPER_ADMIN) {
    return DASHBOARD_ROUTES.SUPER_ADMIN;
  }

  if (role === USER_ROLES.ADMIN) {
    return DASHBOARD_ROUTES.ADMIN;
  }

  if (role === USER_ROLES.MANAGER) {
    return DASHBOARD_ROUTES.MANAGER;
  }

  return DASHBOARD_ROUTES.CUSTOMER;
}
