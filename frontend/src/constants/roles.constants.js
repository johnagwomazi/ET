export const USER_ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMIN",
  MANAGER: "MANAGER",
  CUSTOMER: "CUSTOMER",
};

export const MARKETPLACE_BUYER_ROLES = [
  USER_ROLES.CUSTOMER,
  USER_ROLES.ADMIN,
];

export const DASHBOARD_ROUTES = {
  SUPER_ADMIN: "/super-admin/dashboard",
  ADMIN: "/organization/dashboard",
  MANAGER: "/manager/dashboard",
  CUSTOMER: "/customer/dashboard",
};
