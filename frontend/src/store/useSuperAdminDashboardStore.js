import { create } from "zustand";
import * as dashboardService from "../services/dashboard.service";
import * as organizationService from "../services/organization.service";

const initialState = {
  overview: null,
  suspendedOrganizations: [],
  isLoading: false,
  error: null,
};

export const useSuperAdminDashboardStore = create((set, get) => ({
  ...initialState,

  async fetchDashboard() {
    if (get().isLoading) {
      return get().overview;
    }

    set({ isLoading: true, error: null });

    try {
      const [overviewResult, suspendedOrganizationsResult] = await Promise.allSettled([
        dashboardService.getDashboardOverview(),
        organizationService.getOrganizations({
          status: "SUSPENDED",
          page: 1,
          limit: 5,
          sortBy: "createdAt",
          sortOrder: "desc",
        }),
      ]);

      const overview = overviewResult.status === "fulfilled" ? overviewResult.value : get().overview;
      const suspendedOrganizations =
        suspendedOrganizationsResult.status === "fulfilled"
          ? suspendedOrganizationsResult.value?.organizations || []
          : get().suspendedOrganizations;

      const firstError =
        overviewResult.status === "rejected"
          ? overviewResult.reason
          : suspendedOrganizationsResult.status === "rejected"
          ? suspendedOrganizationsResult.reason
          : null;

      set({
        overview,
        suspendedOrganizations,
        isLoading: false,
        error: firstError ? firstError.message || "Something went wrong" : null,
      });

      if (firstError) {
        throw firstError;
      }

      return overview;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Something went wrong";

      set({
        isLoading: false,
        error: message,
      });

      throw error;
    }
  },

  async fetchOverview() {
    return get().fetchDashboard();
  },

  clearError() {
    set({ error: null });
  },
}));
