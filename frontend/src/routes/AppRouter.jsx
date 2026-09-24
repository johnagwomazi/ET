import { lazy, Suspense } from "react";
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
import { ORGANIZATION_PERMISSIONS } from "../constants/organizationPermissions.constants";
import { MARKETPLACE_BUYER_ROLES, USER_ROLES } from "../constants/roles.constants";
import { Navigate } from "react-router-dom";
import RouteLoadingState from "../components/common/RouteLoadingState";

const SignUpChoicePage = lazy(() => import("../pages/SignUpChoicePage"));
const CustomerRegisterPage = lazy(() => import("../pages/CustomerRegisterPage"));
const OrganizerRegisterPage = lazy(() => import("../pages/OrganizerRegisterPage"));
const LoginPage = lazy(() => import("../pages/LoginPage"));
const CheckoutPage = lazy(() => import("../pages/CheckoutPage"));
const PaymentConfirmationPage = lazy(() => import("../pages/PaymentConfirmationPage"));
const AdminLoginPage = lazy(() => import("../pages/AdminLoginPage"));
const ForgotPasswordPage = lazy(() => import("../pages/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("../pages/ResetPasswordPage"));
const VerifyEmailPage = lazy(() => import("../pages/VerifyEmailPage"));
const GoogleRegistrationPage = lazy(() => import("../pages/GoogleRegistrationPage"));
const OrganizationDashboardPage = lazy(() => import("../pages/OrganizationDashboardPage"));
const EventsPage = lazy(() => import("../pages/events/EventsPage"));
const EventDetailsPage = lazy(() => import("../pages/events/EventDetailsPage"));
const EventEditorPage = lazy(() => import("../pages/events/EventEditorPage"));
const OrganizationProfilePage = lazy(() => import("../pages/organization/OrganizationProfilePage"));
const OrganizationSettingsPage = lazy(() => import("../pages/organization/OrganizationSettingsPage"));
const OrganizationMembersPage = lazy(() => import("../pages/organization/OrganizationMembersPage"));
const OrganizationFinancePage = lazy(() => import("../pages/organization/OrganizationFinancePage"));
const CustomerTicketsPage = lazy(() => import("../pages/customer/CustomerTicketsPage"));
const CustomerProfilePage = lazy(() => import("../pages/customer/CustomerProfilePage"));
const CustomerHistoryPage = lazy(() => import("../pages/customer/CustomerHistoryPage"));
const SuperAdminRolesPermissionsPage = lazy(() => import("../pages/super-admin/SuperAdminRolesPermissionsPage"));
const SuperAdminDashboardPage = lazy(() => import("../pages/super-admin/SuperAdminDashboardPage"));
const OrganizationsPage = lazy(() => import("../pages/super-admin/OrganizationsPage"));
const OrganizationDetailsPage = lazy(() => import("../pages/super-admin/OrganizationDetailsPage"));
const UsersPage = lazy(() => import("../pages/super-admin/UsersPage"));
const WithdrawalsPage = lazy(() => import("../pages/super-admin/WithdrawalsPage"));
const OrganizationAnalyticsPage = lazy(() => import("../pages/analytics/OrganizationAnalyticsPage"));
const EventAnalyticsPage = lazy(() => import("../pages/analytics/EventAnalyticsPage"));
const PlatformAnalyticsPage = lazy(() => import("../pages/analytics/PlatformAnalyticsPage"));
const NotificationHistoryPage = lazy(() => import("../pages/notifications/NotificationHistoryPage"));
const ForbiddenPage = lazy(() => import("../pages/ForbiddenPage"));
const PublicEventDetailsPage = lazy(() => import("../pages/events/PublicEventDetailsPage"));
const NotFoundPage = lazy(() => import("../pages/NotFoundPage"));

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
        element: <RoleRoute allowedRoles={MARKETPLACE_BUYER_ROLES} />,
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
                path: ROUTE_PATHS.CUSTOMER_TICKETS,
                element: <CustomerTicketsPage />,
              },
              {
                path: ROUTE_PATHS.CUSTOMER_HISTORY,
                element: <CustomerHistoryPage />,
              },
              {
                path: ROUTE_PATHS.CUSTOMER_ORDERS,
                element: <Navigate to={ROUTE_PATHS.CUSTOMER_HISTORY} replace />,
              },
            ],
          },
        ],
      },
      {
        element: <RoleRoute allowedRoles={[USER_ROLES.CUSTOMER]} />,
        children: [
          {
            element: <PublicLayout />,
            children: [
              {
                path: ROUTE_PATHS.CUSTOMER_PROFILE,
                element: <CustomerProfilePage />,
              },
              {
                path: ROUTE_PATHS.CUSTOMER_NOTIFICATIONS,
                element: <NotificationHistoryPage />,
              },
              {
                path: ROUTE_PATHS.CUSTOMER_DASHBOARD,
                element: <Navigate to={ROUTE_PATHS.CUSTOMER_PROFILE} replace />,
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
            path: ROUTE_PATHS.GOOGLE_COMPLETE,
            element: <GoogleRegistrationPage />,
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
                path: ROUTE_PATHS.SUPER_ADMIN_ORGANIZATION_DETAILS,
                element: <OrganizationDetailsPage />,
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
  return (
    <Suspense fallback={<RouteLoadingState />}>
      <RouterProvider router={router} future={{ v7_startTransition: true }} />
    </Suspense>
  );
}

export default AppRouter;
