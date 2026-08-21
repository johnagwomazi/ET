import { create } from "zustand";
import { ORGANIZATION_LIFECYCLE_STATUS } from "../constants/organizationLifecycle.constants";
import { normalizeOrganizationPermissions } from "../utils/organizationPermissions";
import * as authService from "../services/auth.service";
import { useSessionStore } from "./useSessionStore";

const initialState = {
  organization: null,
  organizationId: null,
  role: null,
  permissions: [],
  status: null,
  lifecycleStatus: ORGANIZATION_LIFECYCLE_STATUS.UNKNOWN,
  isLoading: false,
  isInitialized: false,
  error: null,
};

function getOrganizationId(organization) {
  if (!organization) {
    return null;
  }

  if (typeof organization === "string") {
    return organization;
  }

  return organization._id || null;
}

function getLifecycleStatus(organization) {
  if (!organization) {
    return ORGANIZATION_LIFECYCLE_STATUS.UNKNOWN;
  }

  if (organization.isDeleted) {
    return ORGANIZATION_LIFECYCLE_STATUS.DELETED;
  }

  if (organization.status === "SUSPENDED") {
    return ORGANIZATION_LIFECYCLE_STATUS.SUSPENDED;
  }

  if (organization.status === "APPROVED") {
    return ORGANIZATION_LIFECYCLE_STATUS.ACTIVE;
  }

  if (organization.status === "PENDING") {
    return ORGANIZATION_LIFECYCLE_STATUS.PENDING;
  }

  if (organization.status === "REJECTED") {
    return ORGANIZATION_LIFECYCLE_STATUS.REJECTED;
  }

  return ORGANIZATION_LIFECYCLE_STATUS.UNKNOWN;
}

function buildOrganizationStateFromUser(user) {
  const organization = user?.organization || null;
  const permissions = normalizeOrganizationPermissions(user?.organizationPermissions || []);

  return {
    organization,
    organizationId: getOrganizationId(organization),
    role: user?.role || null,
    permissions,
    status: organization?.status || null,
    lifecycleStatus: getLifecycleStatus(organization),
    isLoading: false,
    isInitialized: true,
    error: null,
  };
}

export const useOrganizationContextStore = create((set, get) => ({
  ...initialState,

  syncFromUser(user) {
    if (!user || !user.organization || user.role === "SUPER_ADMIN") {
      set({
        ...initialState,
        isInitialized: false,
      });

      return;
    }

    set(buildOrganizationStateFromUser(user));
  },

  clearOrganizationContext() {
    set({
      ...initialState,
      isInitialized: false,
    });
  },

  async refreshOrganizationContext() {
    set({ isLoading: true, error: null });

    try {
      const user = await useSessionStore.getState().refreshCurrentUser();

      if (!user || !user.organization || user.role === "SUPER_ADMIN") {
        set({
          ...initialState,
          isInitialized: false,
        });

        return null;
      }

      const nextState = buildOrganizationStateFromUser(user);

      set(nextState);

      return nextState.organization;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Something went wrong";

      set({
        ...initialState,
        isInitialized: true,
        error: message,
      });

      throw error;
    }
  },

  async loadOrganizationContext() {
    set({ isLoading: true, error: null });

    try {
      const response = await authService.getCurrentUser();
      const user = response?.user || null;
      const organizationPermissions = response?.organizationPermissions || [];

      if (!user || !user.organization || user.role === "SUPER_ADMIN") {
        set({
          ...initialState,
          isInitialized: true,
        });

        return null;
      }

      const nextUser = {
        ...user,
        organizationPermissions,
      };

      const nextState = buildOrganizationStateFromUser(nextUser);

      set(nextState);

      return nextState.organization;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Something went wrong";

      set({
        ...initialState,
        isInitialized: true,
        error: message,
      });

      throw error;
    }
  },
}));
