import { Navigate, Outlet } from "react-router-dom";
import { useSessionStore } from "../../store/useSessionStore";
import { getPostLoginRouteForRole } from "../../utils/auth";
import LoadingState from "../../components/common/LoadingState";

function GuestRoute() {
  const isAuthenticated = useSessionStore((state) => state.isAuthenticated);
  const currentUser = useSessionStore((state) => state.currentUser);
  const isInitializing = useSessionStore((state) => state.isInitializing);

  if (isInitializing) {
    return <LoadingState label="Preparing your session..." />;
  }

  if (isAuthenticated && currentUser) {
    return <Navigate to={getPostLoginRouteForRole(currentUser.role)} replace />;
  }

  return <Outlet />;
}

export default GuestRoute;
