import { Navigate, Outlet } from "react-router-dom";
import { useSessionStore } from "../../store/useSessionStore";
import { getDashboardRouteForRole } from "../../utils/auth";
import { ROUTE_PATHS } from "../routePaths";
import LoadingState from "../../components/common/LoadingState";

function RoleRoute({ allowedRoles = [], children }) {
  const currentUser = useSessionStore((state) => state.currentUser);
  const isAuthenticated = useSessionStore((state) => state.isAuthenticated);
  const isInitializing = useSessionStore((state) => state.isInitializing);

  if (isInitializing) {
    return <LoadingState label="Checking permissions..." />;
  }

  if (!isAuthenticated || !currentUser) {
    return <Navigate to={ROUTE_PATHS.LOGIN} replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(currentUser.role)) {
    return <Navigate to={getDashboardRouteForRole(currentUser.role)} replace />;
  }

  if (children) {
    return children;
  }

  return <Outlet />;
}

export default RoleRoute;
