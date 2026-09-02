import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useSessionStore } from "../../store/useSessionStore";
import { ROUTE_PATHS } from "../routePaths";
import LoadingState from "../../components/common/LoadingState";

function ProtectedRoute({ loginPath = ROUTE_PATHS.LOGIN }) {
  const location = useLocation();
  const isAuthenticated = useSessionStore((state) => state.isAuthenticated);
  const isInitializing = useSessionStore((state) => state.isInitializing);

  if (isInitializing) {
    return <LoadingState label="Preparing your session..." />;
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to={loginPath}
        replace
        state={{ from: `${location.pathname}${location.search}${location.hash}` }}
      />
    );
  }

  return <Outlet />;
}

export default ProtectedRoute;
