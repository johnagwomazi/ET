import { Navigate, Outlet } from "react-router-dom";
import { useSessionStore } from "../../store/useSessionStore";
import LoadingState from "../../components/common/LoadingState";
import { ROUTE_PATHS } from "../routePaths";
import { useOrganizationPermissions } from "../../hooks/useOrganizationPermissions";

function PermissionRoute({ permission, permissions = [], children }) {
  const isAuthenticated = useSessionStore((state) => state.isAuthenticated);
  const isInitializing = useSessionStore((state) => state.isInitializing);
  const { isInitialized, isLoading, hasPermission, hasAnyPermission } = useOrganizationPermissions();

  if (isInitializing || (isAuthenticated && !isInitialized) || isLoading) {
    return <LoadingState label="Checking permissions..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTE_PATHS.LOGIN} replace />;
  }

  const allowed = permission
    ? hasPermission(permission)
    : hasAnyPermission(permissions);

  if (!allowed) {
    return (
      <Navigate
        to={ROUTE_PATHS.FORBIDDEN}
        replace
        state={{
          title: "Permission denied",
          message: "You do not have permission to access this page.",
          reason: "permission-denied",
        }}
      />
    );
  }

  if (children) {
    return children;
  }

  return <Outlet />;
}

export default PermissionRoute;
