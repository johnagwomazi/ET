import { Navigate, Outlet } from "react-router-dom";
import { useSessionStore } from "../../store/useSessionStore";
import { getDashboardRouteForRole } from "../../utils/auth";

function GuestRoute() {
  const isAuthenticated = useSessionStore((state) => state.isAuthenticated);
  const currentUser = useSessionStore((state) => state.currentUser);
  const isInitializing = useSessionStore((state) => state.isInitializing);

  if (isInitializing) {
    return null;
  }

  if (isAuthenticated && currentUser) {
    return <Navigate to={getDashboardRouteForRole(currentUser.role)} replace />;
  }

  return <Outlet />;
}

export default GuestRoute;
