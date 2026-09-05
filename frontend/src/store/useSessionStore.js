import { create } from "zustand";
import * as authService from "../services/auth.service";
import { clearStoredAccessToken } from "../utils/authToken";
import { useNotificationStore } from "./useNotificationStore";

let initializeSessionPromise = null;
let refreshCurrentUserPromise = null;

const initialState = {
  currentUser: null,
  isAuthenticated: false,
  isLoading: false,
  isInitializing: true,
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

export const useSessionStore = create((set, get) => ({
  ...initialState,

  setSession(user, organizationPermissions = []) {
    set({
      currentUser: normalizeSessionUser(user, organizationPermissions),
      isAuthenticated: Boolean(user),
      isLoading: false,
      isInitializing: false,
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
    const { currentUser } = get();

    if (currentUser) {
      return currentUser;
    }

    if (initializeSessionPromise) {
      return initializeSessionPromise;
    }

    set({ isLoading: true });
    clearStoredAccessToken();

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
        clearStoredAccessToken();
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
      const response = await authService.login(credentials);

      const currentUserResponse = await authService.getCurrentUser();
      const user = currentUserResponse?.user || null;
      const organizationPermissions =
        currentUserResponse?.organizationPermissions || user?.organizationPermissions || [];

      set({
        currentUser: normalizeSessionUser(user, organizationPermissions),
        isAuthenticated: Boolean(user),
        isLoading: false,
        isInitializing: false,
      });

      return user;
    } catch (error) {
      clearStoredAccessToken();
      set({ isLoading: false, isInitializing: false });
      throw new Error(getAuthErrorMessage(error));
    }
  },

  async adminLogin(credentials) {
    set({ isLoading: true });

    try {
      const response = await authService.adminLogin(credentials);

      const currentUserResponse = await authService.getCurrentUser();
      const user = currentUserResponse?.user || null;
      const organizationPermissions =
        currentUserResponse?.organizationPermissions || user?.organizationPermissions || [];

      set({
        currentUser: normalizeSessionUser(user, organizationPermissions),
        isAuthenticated: Boolean(user),
        isLoading: false,
        isInitializing: false,
      });

      return user;
    } catch (error) {
      clearStoredAccessToken();
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
      clearStoredAccessToken();
      useNotificationStore.getState().reset();
      set({
        ...initialState,
        isInitializing: false,
      });
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
