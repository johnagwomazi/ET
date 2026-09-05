import { DASHBOARD_ROUTES, USER_ROLES } from "../constants/roles.constants";
import { ROUTE_PATHS } from "../routes/routePaths";

const AUTH_ROUTE_PATHS = new Set([
  ROUTE_PATHS.LOGIN,
  ROUTE_PATHS.ADMIN_LOGIN,
  ROUTE_PATHS.SIGN_UP,
  ROUTE_PATHS.REGISTER_CUSTOMER,
  ROUTE_PATHS.REGISTER_ORGANIZER,
  ROUTE_PATHS.FORGOT_PASSWORD,
  ROUTE_PATHS.RESET_PASSWORD,
  ROUTE_PATHS.VERIFY_EMAIL,
]);

const RETURN_PATH_PREFIXES = {
  [USER_ROLES.SUPER_ADMIN]: ["/super-admin/"],
  [USER_ROLES.ADMIN]: ["/organization/"],
  [USER_ROLES.MANAGER]: ["/manager/"],
  [USER_ROLES.CUSTOMER]: ["/customer/", ROUTE_PATHS.CHECKOUT, ROUTE_PATHS.PAYMENT_CONFIRMATION],
};

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

  if (role === USER_ROLES.CUSTOMER) {
    return DASHBOARD_ROUTES.CUSTOMER;
  }

  return ROUTE_PATHS.HOME;
}

export function getPostLoginRouteForRole(role) {
  if (role === USER_ROLES.CUSTOMER) {
    return ROUTE_PATHS.HOME;
  }

  return getDashboardRouteForRole(role);
}

function getSafeInternalPath(path) {
  if (
    typeof path !== "string" ||
    !path.startsWith("/") ||
    path.startsWith("//") ||
    path.includes("\\") ||
    /%5c/i.test(path) ||
    /[\u0000-\u001f\u007f]/.test(path)
  ) {
    return null;
  }

  const pathname = path.split(/[?#]/)[0];

  if (AUTH_ROUTE_PATHS.has(pathname)) {
    return null;
  }

  return path;
}

export function getPostLoginRouteForUser(user, requestedPath) {
  const defaultRoute = getPostLoginRouteForRole(user?.role);
  const safeRequestedPath = getSafeInternalPath(requestedPath);

  if (!safeRequestedPath) {
    return defaultRoute;
  }

  const pathname = safeRequestedPath.split(/[?#]/)[0];
  const allowedPrefixes = RETURN_PATH_PREFIXES[user?.role] || [];
  const canReturn = allowedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(prefix));

  return canReturn ? safeRequestedPath : defaultRoute;
}
