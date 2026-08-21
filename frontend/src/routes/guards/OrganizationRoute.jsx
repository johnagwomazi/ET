import { Navigate, Outlet } from "react-router-dom";
import { useSessionStore } from "../../store/useSessionStore";
import { useOrganizationContextStore } from "../../store/useOrganizationContextStore";
import LoadingState from "../../components/common/LoadingState";
import { ROUTE_PATHS } from "../routePaths";
import { ORGANIZATION_LIFECYCLE_STATUS } from "../../constants/organizationLifecycle.constants";
import { getDashboardRouteForRole } from "../../utils/auth";
import { USER_ROLES } from "../../constants/roles.constants";

function getOrganizationAccessMessage(lifecycleStatus) {
  if (lifecycleStatus === ORGANIZATION_LIFECYCLE_STATUS.SUSPENDED) {
    return "Your organization is suspended. Please contact a super admin to restore access.";
  }

  if (lifecycleStatus === ORGANIZATION_LIFECYCLE_STATUS.DELETED) {
    return "Your organization is no longer available.";
  }

  return "Your organization is not active yet.";
}

function OrganizationRoute() {
  const currentUser = useSessionStore((state) => state.currentUser);
  const isAuthenticated = useSessionStore((state) => state.isAuthenticated);
  const isInitializing = useSessionStore((state) => state.isInitializing);
  const organization = useOrganizationContextStore((state) => state.organization);
  const lifecycleStatus = useOrganizationContextStore((state) => state.lifecycleStatus);
  const isOrgInitialized = useOrganizationContextStore((state) => state.isInitialized);
  const isOrgLoading = useOrganizationContextStore((state) => state.isLoading);

  if (!isAuthenticated || !currentUser) {
    return <Navigate to={ROUTE_PATHS.LOGIN} replace />;
  }

  if (currentUser.role === USER_ROLES.SUPER_ADMIN) {
    return <Navigate to={getDashboardRouteForRole(currentUser.role)} replace />;
  }

  if (isInitializing || (!isOrgInitialized && Boolean(currentUser.organization)) || isOrgLoading) {
    return <LoadingState label="Loading organization context..." />;
  }

  if (!organization) {
    return (
      <Navigate
        to={ROUTE_PATHS.FORBIDDEN}
        replace
        state={{
          title: "Organization access required",
          message: "Your account is not linked to an organization.",
          reason: "organization-missing",
        }}
      />
    );
  }

  if (
    lifecycleStatus === ORGANIZATION_LIFECYCLE_STATUS.SUSPENDED ||
    lifecycleStatus === ORGANIZATION_LIFECYCLE_STATUS.DELETED ||
    lifecycleStatus === ORGANIZATION_LIFECYCLE_STATUS.PENDING ||
    lifecycleStatus === ORGANIZATION_LIFECYCLE_STATUS.REJECTED
  ) {
    return (
      <Navigate
        to={ROUTE_PATHS.FORBIDDEN}
        replace
        state={{
          title: "Organization unavailable",
          message: getOrganizationAccessMessage(lifecycleStatus),
          reason: "organization-status",
        }}
      />
    );
  }

  return <Outlet />;
}

export default OrganizationRoute;
