import { useMemo } from "react";
import { useOrganizationContextStore } from "../store/useOrganizationContextStore";
import { hasAnyOrganizationPermission, hasOrganizationPermission } from "../utils/organizationPermissions";

export function useOrganizationPermissions() {
  const organization = useOrganizationContextStore((state) => state.organization);
  const permissions = useOrganizationContextStore((state) => state.permissions);
  const role = useOrganizationContextStore((state) => state.role);
  const status = useOrganizationContextStore((state) => state.status);
  const lifecycleStatus = useOrganizationContextStore((state) => state.lifecycleStatus);
  const isLoading = useOrganizationContextStore((state) => state.isLoading);
  const error = useOrganizationContextStore((state) => state.error);
  const isInitialized = useOrganizationContextStore((state) => state.isInitialized);

  const helpers = useMemo(() => {
    return {
      hasPermission: (permission) => hasOrganizationPermission(permissions, permission),
      hasAnyPermission: (requiredPermissions) => hasAnyOrganizationPermission(permissions, requiredPermissions),
    };
  }, [permissions]);

  return {
    organization,
    permissions,
    role,
    status,
    lifecycleStatus,
    isLoading,
    error,
    isInitialized,
    ...helpers,
  };
}

