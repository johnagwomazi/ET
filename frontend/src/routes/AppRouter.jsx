import { createBrowserRouter, RouterProvider } from "react-router-dom";
import PublicLayout from "../layouts/PublicLayout";
import AuthLayout from "../layouts/AuthLayout";
import DashboardLayout from "../layouts/DashboardLayout";
import OrganizationLayout from "../layouts/OrganizationLayout";
import GuestRoute from "./guards/GuestRoute";
import ProtectedRoute from "./guards/ProtectedRoute";
import RoleRoute from "./guards/RoleRoute";
import OrganizationRoute from "./guards/OrganizationRoute";
import PermissionRoute from "./guards/PermissionRoute";
import { ROUTE_PATHS } from "./routePaths";
import HomePage from "../pages/HomePage";
import SignUpChoicePage from "../pages/SignUpChoicePage";
import CustomerRegisterPage from "../pages/CustomerRegisterPage";
import OrganizerRegisterPage from "../pages/OrganizerRegisterPage";
import LoginPage from "../pages/LoginPage";
import CheckoutPage from "../pages/CheckoutPage";
import PaymentConfirmationPage from "../pages/PaymentConfirmationPage";
import AdminLoginPage from "../pages/AdminLoginPage";
import ForgotPasswordPage from "../pages/ForgotPasswordPage";
import ResetPasswordPage from "../pages/ResetPasswordPage";
import VerifyEmailPage from "../pages/VerifyEmailPage";
import OrganizationDashboardPage from "../pages/OrganizationDashboardPage";
import EventsPage from "../pages/events/EventsPage";
import EventDetailsPage from "../pages/events/EventDetailsPage";
import EventEditorPage from "../pages/events/EventEditorPage";
import OrganizationProfilePage from "../pages/organization/OrganizationProfilePage";
import OrganizationSettingsPage from "../pages/organization/OrganizationSettingsPage";
import OrganizationMembersPage from "../pages/organization/OrganizationMembersPage";
import OrganizationFinancePage from "../pages/organization/OrganizationFinancePage";
import CustomerTicketsPage from "../pages/customer/CustomerTicketsPage";
import CustomerProfilePage from "../pages/customer/CustomerProfilePage";
import CustomerHistoryPage from "../pages/customer/CustomerHistoryPage";
import SuperAdminRolesPermissionsPage from "../pages/super-admin/SuperAdminRolesPermissionsPage";
import SuperAdminDashboardPage from "../pages/super-admin/SuperAdminDashboardPage";
import OrganizationsPage from "../pages/super-admin/OrganizationsPage";
import UsersPage from "../pages/super-admin/UsersPage";
import WithdrawalsPage from "../pages/super-admin/WithdrawalsPage";
import OrganizationAnalyticsPage from "../pages/analytics/OrganizationAnalyticsPage";
import EventAnalyticsPage from "../pages/analytics/EventAnalyticsPage";
import PlatformAnalyticsPage from "../pages/analytics/PlatformAnalyticsPage";
import NotificationHistoryPage from "../pages/notifications/NotificationHistoryPage";
import ForbiddenPage from "../pages/ForbiddenPage";
import PublicEventDetailsPage from "../pages/events/PublicEventDetailsPage";
import { ORGANIZATION_PERMISSIONS } from "../constants/organizationPermissions.constants";
import { USER_ROLES } from "../constants/roles.constants";
import NotFoundPage from "../pages/NotFoundPage";
import { Navigate } from "react-router-dom";

const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      {
        path: ROUTE_PATHS.HOME,
        element: <HomePage />,
      },
      {
        path: ROUTE_PATHS.PUBLIC_EVENT_DETAILS,
        element: <PublicEventDetailsPage />,
      },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <RoleRoute allowedRoles={[USER_ROLES.CUSTOMER]} />,
        children: [
          {
            element: <PublicLayout />,
            children: [
              {
                path: ROUTE_PATHS.CHECKOUT,
                element: <CheckoutPage />,
              },
              {
                path: ROUTE_PATHS.PAYMENT_CONFIRMATION,
                element: <PaymentConfirmationPage />,
              },
              {
                path: ROUTE_PATHS.CUSTOMER_PROFILE,
                element: <CustomerProfilePage />,
              },
              {
                path: ROUTE_PATHS.CUSTOMER_TICKETS,
                element: <CustomerTicketsPage />,
              },
              {
                path: ROUTE_PATHS.CUSTOMER_HISTORY,
                element: <CustomerHistoryPage />,
              },
              {
                path: ROUTE_PATHS.CUSTOMER_NOTIFICATIONS,
                element: <NotificationHistoryPage />,
              },
              {
                path: ROUTE_PATHS.CUSTOMER_DASHBOARD,
                element: <Navigate to={ROUTE_PATHS.CUSTOMER_PROFILE} replace />,
              },
              {
                path: ROUTE_PATHS.CUSTOMER_ORDERS,
                element: <Navigate to={ROUTE_PATHS.CUSTOMER_HISTORY} replace />,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    element: <GuestRoute />,
    children: [
      {
        element: <AuthLayout />,
        children: [
          {
            path: ROUTE_PATHS.SIGN_UP,
            element: <SignUpChoicePage />,
          },
          {
            path: ROUTE_PATHS.REGISTER_CUSTOMER,
            element: <CustomerRegisterPage />,
          },
          {
            path: ROUTE_PATHS.REGISTER_ORGANIZER,
            element: <OrganizerRegisterPage />,
          },
          {
            path: ROUTE_PATHS.LOGIN,
            element: <LoginPage />,
          },
          {
            path: ROUTE_PATHS.FORGOT_PASSWORD,
            element: <ForgotPasswordPage />,
          },
          {
            path: ROUTE_PATHS.RESET_PASSWORD,
            element: <ResetPasswordPage />,
          },
          {
            path: ROUTE_PATHS.VERIFY_EMAIL,
            element: <VerifyEmailPage />,
          },
          {
            path: ROUTE_PATHS.ADMIN_LOGIN,
            element: <AdminLoginPage />,
          },
        ],
      },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: ROUTE_PATHS.FORBIDDEN,
        element: <ForbiddenPage />,
      },
      {
        element: <DashboardLayout />,
        children: [
          {
            path: ROUTE_PATHS.MANAGER_DASHBOARD,
            element: (
              <RoleRoute allowedRoles={[USER_ROLES.MANAGER]}>
                <Navigate to={ROUTE_PATHS.MANAGER_EVENTS} replace />
              </RoleRoute>
            ),
          },
          {
            path: ROUTE_PATHS.MANAGER_EVENTS,
            element: (
              <RoleRoute allowedRoles={[USER_ROLES.MANAGER]}>
                <EventsPage scope="manager" />
              </RoleRoute>
            ),
          },
          {
            path: ROUTE_PATHS.MANAGER_EVENT_DETAILS,
            element: (
              <RoleRoute allowedRoles={[USER_ROLES.MANAGER]}>
                <EventDetailsPage scope="manager" />
              </RoleRoute>
            ),
          },
          {
            path: ROUTE_PATHS.MANAGER_NOTIFICATIONS,
            element: (
              <RoleRoute allowedRoles={[USER_ROLES.MANAGER]}>
                <NotificationHistoryPage />
              </RoleRoute>
            ),
          },
        ],
      },
      {
        path: ROUTE_PATHS.ORGANIZATION_ROOT,
        element: <OrganizationRoute />,
        children: [
          {
            element: <OrganizationLayout />,
            children: [
              {
                index: true,
                element: <Navigate to={ROUTE_PATHS.ORGANIZATION_PROFILE} replace />,
              },
              {
                path: ROUTE_PATHS.ORGANIZATION_DASHBOARD,
                element: (
                  <PermissionRoute permission={ORGANIZATION_PERMISSIONS.DASHBOARD_VIEW}>
                    <OrganizationDashboardPage />
                  </PermissionRoute>
                ),
              },
              {
                path: ROUTE_PATHS.ORGANIZATION_EVENTS,
                element: (
                  <PermissionRoute permission={ORGANIZATION_PERMISSIONS.ORGANIZATION_UPDATE}>
                    <EventsPage scope="organization" />
                  </PermissionRoute>
                ),
              },
              {
                path: ROUTE_PATHS.ORGANIZATION_EVENT_CREATE,
                element: (
                  <PermissionRoute permission={ORGANIZATION_PERMISSIONS.ORGANIZATION_UPDATE}>
                    <EventEditorPage mode="create" />
                  </PermissionRoute>
                ),
              },
              {
                path: ROUTE_PATHS.ORGANIZATION_EVENT_EDIT,
                element: (
                  <PermissionRoute permission={ORGANIZATION_PERMISSIONS.ORGANIZATION_UPDATE}>
                    <EventEditorPage mode="edit" />
                  </PermissionRoute>
                ),
              },
              {
                path: ROUTE_PATHS.ORGANIZATION_EVENT_DETAILS,
                element: (
                  <PermissionRoute permission={ORGANIZATION_PERMISSIONS.ORGANIZATION_UPDATE}>
                    <EventDetailsPage scope="organization" />
                  </PermissionRoute>
                ),
              },
              {
                path: ROUTE_PATHS.ORGANIZATION_EVENT_ANALYTICS,
                element: (
                  <RoleRoute allowedRoles={[USER_ROLES.ADMIN]}>
                    <PermissionRoute permission={ORGANIZATION_PERMISSIONS.ORGANIZATION_UPDATE}>
                      <EventAnalyticsPage />
                    </PermissionRoute>
                  </RoleRoute>
                ),
              },
              {
                path: ROUTE_PATHS.ORGANIZATION_ANALYTICS,
                element: (
                  <RoleRoute allowedRoles={[USER_ROLES.ADMIN]}>
                    <PermissionRoute permission={ORGANIZATION_PERMISSIONS.ORGANIZATION_UPDATE}>
                      <OrganizationAnalyticsPage />
                    </PermissionRoute>
                  </RoleRoute>
                ),
              },
              {
                path: ROUTE_PATHS.ORGANIZATION_FINANCE,
                element: (
                  <RoleRoute allowedRoles={[USER_ROLES.ADMIN]}>
                    <PermissionRoute permission={ORGANIZATION_PERMISSIONS.SETTINGS_VIEW}>
                      <OrganizationFinancePage />
                    </PermissionRoute>
                  </RoleRoute>
                ),
              },
              {
                path: ROUTE_PATHS.ORGANIZATION_PROFILE,
                element: (
                  <PermissionRoute permission={ORGANIZATION_PERMISSIONS.ORGANIZATION_VIEW}>
                    <OrganizationProfilePage />
                  </PermissionRoute>
                ),
              },
              {
                path: ROUTE_PATHS.ORGANIZATION_SETTINGS,
                element: (
                  <PermissionRoute permission={ORGANIZATION_PERMISSIONS.SETTINGS_VIEW}>
                    <OrganizationSettingsPage />
                  </PermissionRoute>
                ),
              },
              {
                path: ROUTE_PATHS.ORGANIZATION_MEMBERS,
                element: (
                  <PermissionRoute permission={ORGANIZATION_PERMISSIONS.MEMBERS_VIEW}>
                    <OrganizationMembersPage />
                  </PermissionRoute>
                ),
              },
              {
                path: ROUTE_PATHS.ORGANIZATION_NOTIFICATIONS,
                element: (
                  <RoleRoute allowedRoles={[USER_ROLES.ADMIN]}>
                    <NotificationHistoryPage />
                  </RoleRoute>
                ),
              },
            ],
          },
        ],
      },
    ],
  },
  {
    element: <ProtectedRoute loginPath={ROUTE_PATHS.ADMIN_LOGIN} />,
    children: [
      {
        element: (
          <RoleRoute
            allowedRoles={[USER_ROLES.SUPER_ADMIN]}
            loginPath={ROUTE_PATHS.ADMIN_LOGIN}
          />
        ),
        children: [
          {
            element: <DashboardLayout />,
            children: [
              {
                path: ROUTE_PATHS.SUPER_ADMIN_DASHBOARD,
                element: <SuperAdminDashboardPage />,
              },
              {
                path: ROUTE_PATHS.SUPER_ADMIN_ORGANIZATIONS,
                element: <OrganizationsPage />,
              },
              {
                path: ROUTE_PATHS.SUPER_ADMIN_USERS,
                element: <UsersPage />,
              },
              {
                path: ROUTE_PATHS.SUPER_ADMIN_ROLES_PERMISSIONS,
                element: <SuperAdminRolesPermissionsPage />,
              },
              {
                path: ROUTE_PATHS.SUPER_ADMIN_WITHDRAWALS,
                element: <WithdrawalsPage />,
              },
              {
                path: ROUTE_PATHS.SUPER_ADMIN_ANALYTICS,
                element: <PlatformAnalyticsPage />,
              },
              {
                path: ROUTE_PATHS.SUPER_ADMIN_NOTIFICATIONS,
                element: <NotificationHistoryPage />,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    path: ROUTE_PATHS.NOT_FOUND,
    element: <NotFoundPage />,
  },
]);

function AppRouter() {
  return <RouterProvider router={router} />;
}

export default AppRouter;
