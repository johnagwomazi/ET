import { create } from "zustand";
import * as userService from "../services/user.service";
import { DEFAULT_TABLE_PAGE_SIZE } from "../constants/dashboard.constants";

let listController = null;
let detailController = null;

const initialQuery = {
  search: "",
  role: "",
  status: "",
  page: 1,
  limit: DEFAULT_TABLE_PAGE_SIZE,
  sortBy: "createdAt",
  sortOrder: "desc",
};

const initialState = {
  users: [],
  selectedUser: null,
  pagination: {
    page: 1,
    limit: DEFAULT_TABLE_PAGE_SIZE,
    totalItems: 0,
    totalPages: 0,
  },
  query: initialQuery,
  isLoading: false,
  isDetailLoading: false,
  isMutating: false,
  error: null,
  detailError: null,
};

function updateUserList(list, updatedUser) {
  return list.map((user) => (user._id === updatedUser._id ? updatedUser : user));
}

export const useUserStore = create((set, get) => ({
  ...initialState,

  setQuery(partialQuery) {
    set({
      query: {
        ...get().query,
        ...partialQuery,
      },
    });
  },

  resetQuery() {
    set({ query: initialQuery });
  },

  async fetchUsers(overrides = {}) {
    listController?.abort();
    const controller = new AbortController();
    listController = controller;
    const query = {
      ...get().query,
      ...overrides,
    };

    set({
      query,
      isLoading: true,
      error: null,
    });

    try {
      const response = await userService.getUsers(query, { signal: controller.signal });
      if (controller.signal.aborted) return null;

      set({
        users: response?.users || [],
        pagination: response?.pagination || initialState.pagination,
        query,
        isLoading: false,
      });

      return response;
    } catch (error) {
      if (controller.signal.aborted) return null;
      const message = error instanceof Error ? error.message : "Something went wrong";

      set({
        isLoading: false,
        error: message,
      });

      throw error;
    } finally {
      if (listController === controller) listController = null;
    }
  },

  async fetchUserById(userId) {
    detailController?.abort();
    const controller = new AbortController();
    detailController = controller;
    set({ isDetailLoading: true, detailError: null });

    try {
      const response = await userService.getUserById(userId, { signal: controller.signal });
      if (controller.signal.aborted) return null;
      const user = response?.user || null;

      set({
        selectedUser: user,
        isDetailLoading: false,
      });

      return user;
    } catch (error) {
      if (controller.signal.aborted) return null;
      const message = error instanceof Error ? error.message : "Something went wrong";

      set({
        isDetailLoading: false,
        detailError: message,
      });

      throw error;
    } finally {
      if (detailController === controller) detailController = null;
    }
  },

  setSelectedUser(user) {
    set({
      selectedUser: user || null,
      detailError: null,
    });
  },

  clearError() {
    set({
      error: null,
      detailError: null,
    });
  },

  async suspendUser(userId, payload) {
    set({ isMutating: true, error: null });

    try {
      const response = await userService.suspendUser(userId, payload);
      const updatedUser = response?.user || null;

      set({
        users: updatedUser ? updateUserList(get().users, updatedUser) : get().users,
        selectedUser:
          get().selectedUser && get().selectedUser._id === userId ? updatedUser : get().selectedUser,
        isMutating: false,
      });

      return updatedUser;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Something went wrong";

      set({
        isMutating: false,
        error: message,
      });

      throw error;
    }
  },

  async reactivateUser(userId) {
    set({ isMutating: true, error: null });

    try {
      const response = await userService.reactivateUser(userId);
      const updatedUser = response?.user || null;

      set({
        users: updatedUser ? updateUserList(get().users, updatedUser) : get().users,
        selectedUser:
          get().selectedUser && get().selectedUser._id === userId ? updatedUser : get().selectedUser,
        isMutating: false,
      });

      return updatedUser;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Something went wrong";

      set({
        isMutating: false,
        error: message,
      });

      throw error;
    }
  },

  async deleteUser(userId) {
    set({ isMutating: true, error: null });

    try {
      const response = await userService.deleteUser(userId);
      const deletedUser = response?.user || null;

      set({
        users: get().users.filter((user) => user._id !== userId),
        selectedUser:
          get().selectedUser && get().selectedUser._id === userId ? deletedUser : get().selectedUser,
        isMutating: false,
      });

      return deletedUser;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Something went wrong";

      set({
        isMutating: false,
        error: message,
      });

      throw error;
    }
  },
}));
