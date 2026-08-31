import {
  Bell,
  Building2,
  CircleUserRound,
  LayoutDashboard,
  LogOut,
  Settings2,
  Ticket,
  Users,
  FileText,
  ShieldCheck,
  ChartColumn,
  CalendarDays,
  UserCog,
} from "lucide-react";
import { ROUTE_PATHS } from "../routes/routePaths";
import { USER_ROLES } from "./roles.constants";
import { ORGANIZATION_PERMISSIONS } from "./organizationPermissions.constants";

const sharedFooterItems = [
  {
    label: "Profile",
    icon: CircleUserRound,
    action: "profile",
  },
  {
    label: "Logout",
    icon: LogOut,
    action: "logout",
    tone: "danger",
  },
];

export const SUPER_ADMIN_NAVIGATION = {
  main: [
    {
      label: "Dashboard",
      icon: LayoutDashboard,
      to: ROUTE_PATHS.SUPER_ADMIN_DASHBOARD,
      exact: true,
    },
    {
      label: "Organizations",
      icon: Building2,
      to: ROUTE_PATHS.SUPER_ADMIN_ORGANIZATIONS,
    },
    {
      label: "Users",
      icon: Users,
      to: ROUTE_PATHS.SUPER_ADMIN_USERS,
    },
  ],
  overflow: [
    {
      label: "Roles & Permissions",
      icon: UserCog,
      to: ROUTE_PATHS.SUPER_ADMIN_ROLES_PERMISSIONS,
    },
    {
      label: "Withdrawals",
      icon: CreditCard,
      to: ROUTE_PATHS.SUPER_ADMIN_WITHDRAWALS,
    },
    {
      label: "Reports",
      icon: FileText,
      comingSoon: true,
    },
    {
      label: "Settings",
      icon: Settings2,
      comingSoon: true,
    },
  ],
  footer: sharedFooterItems,
};

export const ADMIN_NAVIGATION = {
  main: [
    {
      label: "Dashboard",
      icon: LayoutDashboard,
      to: ROUTE_PATHS.ORGANIZATION_DASHBOARD,
      exact: true,
      permission: ORGANIZATION_PERMISSIONS.DASHBOARD_VIEW,
    },
    {
      label: "Events",
      icon: CalendarDays,
      to: ROUTE_PATHS.ORGANIZATION_EVENTS,
      permission: ORGANIZATION_PERMISSIONS.ORGANIZATION_UPDATE,
    },
    {
      label: "Organization",
      icon: Building2,
      to: ROUTE_PATHS.ORGANIZATION_PROFILE,
      permission: ORGANIZATION_PERMISSIONS.ORGANIZATION_VIEW,
    },
    {
      label: "Settings",
      icon: Settings2,
      to: ROUTE_PATHS.ORGANIZATION_SETTINGS,
      permission: ORGANIZATION_PERMISSIONS.SETTINGS_VIEW,
    },
  ],
  overflow: [
    {
      label: "Reports",
      icon: ChartColumn,
      permission: ORGANIZATION_PERMISSIONS.SETTINGS_VIEW,
      comingSoon: true,
    },
  ],
  footer: sharedFooterItems,
};

export const MANAGER_NAVIGATION = {
  main: [
    {
      label: "Dashboard",
      icon: LayoutDashboard,
      to: ROUTE_PATHS.MANAGER_DASHBOARD,
      exact: true,
    },
    {
      label: "Events",
      icon: CalendarDays,
      to: ROUTE_PATHS.MANAGER_EVENTS,
    },
    {
      label: "Analytics",
      icon: ChartColumn,
      comingSoon: true,
    },
  ],
  overflow: [
    {
      label: "Notifications",
      icon: Bell,
      comingSoon: true,
    },
    {
      label: "Settings",
      icon: Settings2,
      comingSoon: true,
    },
  ],
  footer: sharedFooterItems,
};

export const CUSTOMER_NAVIGATION = {
  main: [
    {
      label: "Dashboard",
      icon: LayoutDashboard,
      to: ROUTE_PATHS.CUSTOMER_DASHBOARD,
      exact: true,
    },
    {
      label: "Tickets",
      icon: Ticket,
      to: ROUTE_PATHS.CUSTOMER_TICKETS,
    },
    {
      label: "Bookings",
      icon: ShieldCheck,
      to: ROUTE_PATHS.CUSTOMER_ORDERS,
    },
  ],
  overflow: [
    {
      label: "Settings",
      icon: Settings2,
      comingSoon: true,
    },
  ],
  footer: sharedFooterItems,
};

const ORGANIZATION_NAVIGATION = {
  main: [
    {
      label: "Dashboard",
      icon: LayoutDashboard,
      to: ROUTE_PATHS.ORGANIZATION_DASHBOARD,
      exact: true,
      permission: ORGANIZATION_PERMISSIONS.DASHBOARD_VIEW,
    },
    {
      label: "Events",
      icon: CalendarDays,
      to: ROUTE_PATHS.ORGANIZATION_EVENTS,
      permission: ORGANIZATION_PERMISSIONS.ORGANIZATION_UPDATE,
    },
    {
      label: "Organization",
      icon: Building2,
      to: ROUTE_PATHS.ORGANIZATION_PROFILE,
      permission: ORGANIZATION_PERMISSIONS.ORGANIZATION_VIEW,
    },
    {
      label: "Settings",
      icon: Settings2,
      to: ROUTE_PATHS.ORGANIZATION_SETTINGS,
      permission: ORGANIZATION_PERMISSIONS.SETTINGS_VIEW,
    },
  ],
  overflow: [
    {
      label: "Members",
      icon: Users,
      to: ROUTE_PATHS.ORGANIZATION_MEMBERS,
      permission: ORGANIZATION_PERMISSIONS.MEMBERS_VIEW,
    },
  ],
  footer: sharedFooterItems,
};

function filterNavigationItems(items = [], permissions = []) {
  return items.filter((item) => {
    if (!item.permission) {
      return true;
    }

    return permissions.includes(item.permission);
  });
}

export function getNavigationForRole(role) {
  switch (role) {
    case USER_ROLES.SUPER_ADMIN:
      return SUPER_ADMIN_NAVIGATION;
    case USER_ROLES.ADMIN:
      return ADMIN_NAVIGATION;
    case USER_ROLES.MANAGER:
      return MANAGER_NAVIGATION;
    case USER_ROLES.CUSTOMER:
    default:
      return CUSTOMER_NAVIGATION;
  }
}

export function getOrganizationNavigation(permissions = []) {
  return {
    main: filterNavigationItems(ORGANIZATION_NAVIGATION.main, permissions),
    overflow: filterNavigationItems(ORGANIZATION_NAVIGATION.overflow, permissions),
    footer: ORGANIZATION_NAVIGATION.footer,
  };
}

export function filterDashboardNavigationByPermissions(navigation, permissions = []) {
  return {
    main: filterNavigationItems(navigation.main, permissions),
    overflow: filterNavigationItems(navigation.overflow, permissions),
    footer: navigation.footer || [],
  };
}
