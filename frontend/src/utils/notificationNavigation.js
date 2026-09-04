import { NOTIFICATION_NAVIGATION_KEYS } from "../constants/notification.constants";
import { USER_ROLES } from "../constants/roles.constants";
import { ROUTE_PATHS } from "../routes/routePaths";

function eventRoute(pattern, eventId) {
  if (!eventId || typeof eventId !== "string") return null;
  return pattern.replace(":eventId", encodeURIComponent(eventId));
}

const roleDestinations = {
  [USER_ROLES.CUSTOMER]: {
    [NOTIFICATION_NAVIGATION_KEYS.PUBLIC_EVENT]: ({ eventId }) =>
      eventRoute(ROUTE_PATHS.PUBLIC_EVENT_DETAILS, eventId),
    [NOTIFICATION_NAVIGATION_KEYS.CUSTOMER_TICKETS]: () => ROUTE_PATHS.CUSTOMER_TICKETS,
    [NOTIFICATION_NAVIGATION_KEYS.CUSTOMER_HISTORY]: () => ROUTE_PATHS.CUSTOMER_HISTORY,
  },
  [USER_ROLES.ADMIN]: {
    [NOTIFICATION_NAVIGATION_KEYS.ORGANIZATION_EVENT]: ({ eventId }) =>
      eventRoute(ROUTE_PATHS.ORGANIZATION_EVENT_DETAILS, eventId),
    [NOTIFICATION_NAVIGATION_KEYS.ORGANIZATION_FINANCE]: () => ROUTE_PATHS.ORGANIZATION_FINANCE,
  },
  [USER_ROLES.MANAGER]: {
    [NOTIFICATION_NAVIGATION_KEYS.MANAGER_EVENT]: ({ eventId }) =>
      eventRoute(ROUTE_PATHS.MANAGER_EVENT_DETAILS, eventId),
  },
  [USER_ROLES.SUPER_ADMIN]: {
    [NOTIFICATION_NAVIGATION_KEYS.SUPER_ADMIN_WITHDRAWALS]: () => ROUTE_PATHS.SUPER_ADMIN_WITHDRAWALS,
  },
};

export function getNotificationDestination(notification, role) {
  const key = notification?.navigation?.key;
  const resolver = roleDestinations[role]?.[key];
  if (!resolver) return null;

  return resolver(notification?.navigation?.params || {});
}

export function getNotificationHistoryRoute(role) {
  const routes = {
    [USER_ROLES.CUSTOMER]: ROUTE_PATHS.CUSTOMER_NOTIFICATIONS,
    [USER_ROLES.ADMIN]: ROUTE_PATHS.ORGANIZATION_NOTIFICATIONS,
    [USER_ROLES.MANAGER]: ROUTE_PATHS.MANAGER_NOTIFICATIONS,
    [USER_ROLES.SUPER_ADMIN]: ROUTE_PATHS.SUPER_ADMIN_NOTIFICATIONS,
  };

  return routes[role] || null;
}

