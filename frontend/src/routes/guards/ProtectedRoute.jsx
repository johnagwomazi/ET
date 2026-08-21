import { Navigate, Outlet } from "react-router-dom";
import { useSessionStore } from "../../store/useSessionStore";
import { ROUTE_PATHS } from "../routePaths";
import LoadingState from "../../components/common/LoadingState";

function ProtectedRoute() {
  const isAuthenticated = useSessionStore((state) => state.isAuthenticated);
  const isInitializing = useSessionStore((state) => state.isInitializing);

  if (isInitializing) {
    return <LoadingState label="Preparing your session..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTE_PATHS.LOGIN} replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
