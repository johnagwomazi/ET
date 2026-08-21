import { create } from "zustand";
import * as authService from "../services/auth.service";

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
    set({
      ...initialState,
      isInitializing: false,
    });
  },

  async initializeSession() {
    const { currentUser, isInitializing } = get();

    if (!isInitializing && currentUser) {
      return currentUser;
    }

    set({ isLoading: true });

    try {
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
    } catch (error) {
      set({
        ...initialState,
        isInitializing: false,
      });

      throw new Error(getAuthErrorMessage(error));
    }
  },

  async login(credentials) {
    set({ isLoading: true });

    try {
      const response = await authService.login(credentials);
      const currentUserResponse = await authService.getCurrentUser().catch(() => null);
      const user = currentUserResponse?.user || response?.user || null;
      const organizationPermissions =
        currentUserResponse?.organizationPermissions || response?.organizationPermissions || user?.organizationPermissions || [];

      set({
        currentUser: normalizeSessionUser(user, organizationPermissions),
        isAuthenticated: Boolean(user),
        isLoading: false,
        isInitializing: false,
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
      const response = await authService.adminLogin(credentials);
      const currentUserResponse = await authService.getCurrentUser().catch(() => null);
      const user = currentUserResponse?.user || response?.user || null;
      const organizationPermissions =
        currentUserResponse?.organizationPermissions || response?.organizationPermissions || user?.organizationPermissions || [];

      set({
        currentUser: normalizeSessionUser(user, organizationPermissions),
        isAuthenticated: Boolean(user),
        isLoading: false,
        isInitializing: false,
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
      console.log(error);
    } finally {
      set({
        ...initialState,
        isInitializing: false,
      });
    }
  },

  async refreshCurrentUser() {
    set({ isLoading: true });

    try {
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
    } catch (error) {
      set({
        ...initialState,
        isInitializing: false,
      });

      throw new Error(getAuthErrorMessage(error));
    }
  },
}));

export const useAuthStore = useSessionStore;
