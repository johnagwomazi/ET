import { create } from "zustand";
import * as organizationService from "../services/organization.service";
import { DEFAULT_TABLE_PAGE_SIZE } from "../constants/dashboard.constants";

const initialQuery = {
  search: "",
  status: "",
  page: 1,
  limit: DEFAULT_TABLE_PAGE_SIZE,
  sortBy: "createdAt",
  sortOrder: "desc",
};

const initialState = {
  organizations: [],
  selectedOrganization: null,
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

function updateOrganizationList(list, updatedOrganization) {
  return list.map((organization) =>
    organization._id === updatedOrganization._id ? updatedOrganization : organization
  );
}

export const useOrganizationStore = create((set, get) => ({
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

  async fetchOrganizations(overrides = {}) {
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
      const response = await organizationService.getOrganizations(query);

      set({
        organizations: response?.organizations || [],
        pagination: response?.pagination || initialState.pagination,
        query,
        isLoading: false,
      });

      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Something went wrong";

      set({
        isLoading: false,
        error: message,
      });

      throw error;
    }
  },

  async fetchOrganizationById(organizationId) {
    set({ isDetailLoading: true, detailError: null });

    try {
      const response = await organizationService.getOrganizationById(organizationId);
      const organization = response?.organization || null;

      set({
        selectedOrganization: organization,
        isDetailLoading: false,
      });

      return organization;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Something went wrong";

      set({
        isDetailLoading: false,
        detailError: message,
      });

      throw error;
    }
  },

  setSelectedOrganization(organization) {
    set({
      selectedOrganization: organization || null,
      detailError: null,
    });
  },

  clearError() {
    set({
      error: null,
      detailError: null,
    });
  },

  async approveOrganization(organizationId) {
    set({ isMutating: true, error: null });

    try {
      const response = await organizationService.approveOrganization(organizationId);
      const updatedOrganization = response?.organization || null;

      set({
        organizations: updatedOrganization
          ? updateOrganizationList(get().organizations, updatedOrganization)
          : get().organizations,
        selectedOrganization:
          get().selectedOrganization && get().selectedOrganization._id === organizationId
            ? updatedOrganization
            : get().selectedOrganization,
        isMutating: false,
      });

      return updatedOrganization;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Something went wrong";

      set({
        isMutating: false,
        error: message,
      });

      throw error;
    }
  },

  async rejectOrganization(organizationId, payload) {
    set({ isMutating: true, error: null });

    try {
      const response = await organizationService.rejectOrganization(organizationId, payload);
      const updatedOrganization = response?.organization || null;

      set({
        organizations: updatedOrganization
          ? updateOrganizationList(get().organizations, updatedOrganization)
          : get().organizations,
        selectedOrganization:
          get().selectedOrganization && get().selectedOrganization._id === organizationId
            ? updatedOrganization
            : get().selectedOrganization,
        isMutating: false,
      });

      return updatedOrganization;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Something went wrong";

      set({
        isMutating: false,
        error: message,
      });

      throw error;
    }
  },

  async suspendOrganization(organizationId, payload) {
    set({ isMutating: true, error: null });

    try {
      const response = await organizationService.suspendOrganization(organizationId, payload);
      const updatedOrganization = response?.organization || null;

      set({
        organizations: updatedOrganization
          ? updateOrganizationList(get().organizations, updatedOrganization)
          : get().organizations,
        selectedOrganization:
          get().selectedOrganization && get().selectedOrganization._id === organizationId
            ? updatedOrganization
            : get().selectedOrganization,
        isMutating: false,
      });

      return updatedOrganization;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Something went wrong";

      set({
        isMutating: false,
        error: message,
      });

      throw error;
    }
  },

  async reactivateOrganization(organizationId) {
    set({ isMutating: true, error: null });

    try {
      const response = await organizationService.reactivateOrganization(organizationId);
      const updatedOrganization = response?.organization || null;

      set({
        organizations: updatedOrganization
          ? updateOrganizationList(get().organizations, updatedOrganization)
          : get().organizations,
        selectedOrganization:
          get().selectedOrganization && get().selectedOrganization._id === organizationId
            ? updatedOrganization
            : get().selectedOrganization,
        isMutating: false,
      });

      return updatedOrganization;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Something went wrong";

      set({
        isMutating: false,
        error: message,
      });

      throw error;
    }
  },

  async deleteOrganization(organizationId) {
    set({ isMutating: true, error: null });

    try {
      const response = await organizationService.deleteOrganization(organizationId);
      const deletedOrganization = response?.organization || null;

      set({
        organizations: get().organizations.filter((organization) => organization._id !== organizationId),
        selectedOrganization:
          get().selectedOrganization && get().selectedOrganization._id === organizationId
            ? deletedOrganization
            : get().selectedOrganization,
        isMutating: false,
      });

      return deletedOrganization;
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
