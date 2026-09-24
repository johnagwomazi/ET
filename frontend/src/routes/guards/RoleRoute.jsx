import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useSessionStore } from "../../store/useSessionStore";
import { ROUTE_PATHS } from "../routePaths";
import LoadingState from "../../components/common/LoadingState";

function RoleRoute({ allowedRoles = [], children, loginPath = ROUTE_PATHS.LOGIN }) {
  const location = useLocation();
  const currentUser = useSessionStore((state) => state.currentUser);
  const isAuthenticated = useSessionStore((state) => state.isAuthenticated);
  const isInitializing = useSessionStore((state) => state.isInitializing);
  const requiresReauthentication = useSessionStore((state) => state.requiresReauthentication);

  if (isInitializing) {
    return <LoadingState label="Checking permissions..." />;
  }

  if ((!isAuthenticated && !requiresReauthentication) || !currentUser) {
    return (
      <Navigate
        to={loginPath}
        replace
        state={{ from: `${location.pathname}${location.search}${location.hash}` }}
      />
    );
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(currentUser.role)) {
    return (
      <Navigate
        to={ROUTE_PATHS.FORBIDDEN}
        replace
        state={{
          title: "Role access denied",
          message: "Your account role does not have access to this page.",
          reason: "role-denied",
        }}
      />
    );
  }

  if (children) {
    return children;
  }

  return <Outlet />;
}

export default RoleRoute;
