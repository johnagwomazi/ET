import { create } from "zustand";
import * as authService from "../services/auth.service";
import { setSessionExpiredHandler } from "../api/httpClient";
import { useNotificationStore } from "./useNotificationStore";

let initializeSessionPromise = null;
let refreshCurrentUserPromise = null;
const LEGACY_ACCESS_TOKEN_STORAGE_KEY = "events_access_token";

const initialState = {
  currentUser: null,
  isAuthenticated: false,
  isLoading: false,
  isInitializing: true,
  requiresReauthentication: false,
};

function getAuthErrorMessage(error) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong";
}

function normalizeSessionUser(user, organizationPermissions = []) {
  if (!user) {
    return null;
  }

  return {
    ...user,
    organizationPermissions: Array.isArray(organizationPermissions) ? organizationPermissions : [],
  };
}

function clearLegacyAccessToken() {
  try {
    window.localStorage.removeItem(LEGACY_ACCESS_TOKEN_STORAGE_KEY);
  } catch (error) {
    // Cookie-based authentication still works when browser storage is unavailable.
  }
}

export const useSessionStore = create((set, get) => ({
  ...initialState,

  setSession(user, organizationPermissions = []) {
    set({
      currentUser: normalizeSessionUser(user, organizationPermissions),
      isAuthenticated: Boolean(user),
      isLoading: false,
      isInitializing: false,
      requiresReauthentication: false,
    });
  },

  clearSession() {
    useNotificationStore.getState().reset();
    set({
      ...initialState,
      isInitializing: false,
    });
  },

  async initializeSession() {
    clearLegacyAccessToken();
    const { currentUser } = get();

    if (currentUser) {
      return currentUser;
    }

    if (initializeSessionPromise) {
      return initializeSessionPromise;
    }

    set({ isLoading: true });

    initializeSessionPromise = (async () => {
      const response = await authService.getCurrentUser();
      const user = response?.user || null;
      const organizationPermissions = response?.organizationPermissions || user?.organizationPermissions || [];

      set({
        currentUser: normalizeSessionUser(user, organizationPermissions),
        isAuthenticated: Boolean(user),
        isLoading: false,
        isInitializing: false,
      });

      return user;
    })();

    try {
      return await initializeSessionPromise;
    } catch (error) {
      const { currentUser: latestCurrentUser, isAuthenticated } = get();

      if (!latestCurrentUser && !isAuthenticated) {
        useNotificationStore.getState().reset();
        set({
          ...initialState,
          isInitializing: false,
        });
      } else {
        set({
          isLoading: false,
          isInitializing: false,
        });
      }

      throw new Error(getAuthErrorMessage(error));
    } finally {
      initializeSessionPromise = null;
    }
  },

  async login(credentials) {
    set({ isLoading: true });

    try {
      await authService.login(credentials);

      const currentUserResponse = await authService.getCurrentUser();
      const user = currentUserResponse?.user || null;
      const organizationPermissions =
        currentUserResponse?.organizationPermissions || user?.organizationPermissions || [];

      set({
        currentUser: normalizeSessionUser(user, organizationPermissions),
        isAuthenticated: Boolean(user),
        isLoading: false,
        isInitializing: false,
        requiresReauthentication: false,
      });

      return user;
    } catch (error) {
      set({ isLoading: false, isInitializing: false });
      throw new Error(getAuthErrorMessage(error));
    }
  },

  async adminLogin(credentials) {
    set({ isLoading: true });

    try {
      await authService.adminLogin(credentials);

      const currentUserResponse = await authService.getCurrentUser();
      const user = currentUserResponse?.user || null;
      const organizationPermissions =
        currentUserResponse?.organizationPermissions || user?.organizationPermissions || [];

      set({
        currentUser: normalizeSessionUser(user, organizationPermissions),
        isAuthenticated: Boolean(user),
        isLoading: false,
        isInitializing: false,
        requiresReauthentication: false,
      });

      return user;
    } catch (error) {
      set({ isLoading: false, isInitializing: false });
      throw new Error(getAuthErrorMessage(error));
    }
  },

  async logout() {
    set({ isLoading: true });

    try {
      await authService.logout();
    } catch (error) {
      // Local session state must still be cleared when the server is unreachable.
    } finally {
      useNotificationStore.getState().reset();
      set({
        ...initialState,
        isInitializing: false,
      });
    }
  },

  markSessionExpired() {
    const { currentUser, requiresReauthentication } = get();

    if (!currentUser) {
      useNotificationStore.getState().reset();
      set({
        ...initialState,
        isInitializing: false,
      });
      return;
    }

    if (requiresReauthentication) return;

    useNotificationStore.getState().reset();
    set({
      isAuthenticated: false,
      isLoading: false,
      isInitializing: false,
      requiresReauthentication: true,
    });
  },

  async reauthenticate(credentials) {
    const existingUser = get().currentUser;
    set({ isLoading: true });

    try {
      if (existingUser?.role === "SUPER_ADMIN") {
        await authService.adminLogin(credentials);
      } else {
        await authService.login(credentials);
      }

      const currentUserResponse = await authService.getCurrentUser();
      const user = currentUserResponse?.user || null;
      const organizationPermissions =
        currentUserResponse?.organizationPermissions || user?.organizationPermissions || [];

      const existingUserId = existingUser?.id || existingUser?._id;
      const userId = user?.id || user?._id;

      if (existingUserId && userId && String(existingUserId) !== String(userId)) {
        await authService.logout().catch(() => {});
        throw new Error("Sign in with the same account to continue.");
      }

      set({
        currentUser: normalizeSessionUser(user, organizationPermissions),
        isAuthenticated: Boolean(user),
        isLoading: false,
        isInitializing: false,
        requiresReauthentication: false,
      });

      return user;
    } catch (error) {
      set({ isLoading: false });
      throw new Error(getAuthErrorMessage(error));
    }
  },

  async refreshCurrentUser() {
    if (currentUserRefreshInProgress()) {
      return refreshCurrentUserPromise;
    }

    set({ isLoading: true });

    refreshCurrentUserPromise = (async () => {
      const response = await authService.getCurrentUser();
      const user = response?.user || null;
      const organizationPermissions = response?.organizationPermissions || user?.organizationPermissions || [];

      set({
        currentUser: normalizeSessionUser(user, organizationPermissions),
        isAuthenticated: Boolean(user),
        isLoading: false,
        isInitializing: false,
        requiresReauthentication: false,
      });

      return normalizeSessionUser(user, organizationPermissions);
    })();

    try {
      return await refreshCurrentUserPromise;
    } catch (error) {
      const { currentUser: latestCurrentUser, isAuthenticated } = get();

      if (!latestCurrentUser && !isAuthenticated) {
        useNotificationStore.getState().reset();
        set({
          ...initialState,
          isInitializing: false,
        });
      } else {
        set({
          isLoading: false,
          isInitializing: false,
        });
      }

      throw new Error(getAuthErrorMessage(error));
    } finally {
      refreshCurrentUserPromise = null;
    }
  },
}));

function currentUserRefreshInProgress() {
  return Boolean(refreshCurrentUserPromise);
}

export const useAuthStore = useSessionStore;

setSessionExpiredHandler(() => {
  useSessionStore.getState().markSessionExpired();
});
