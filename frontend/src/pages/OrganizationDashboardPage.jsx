import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  ArrowRight,
  Activity,
  Building2,
  Clock3,
  ShieldAlert,
  UserCheck,
  Users,
  UserX,
} from "lucide-react";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import StatCard from "../components/dashboard/StatCard";
import EmptyState from "../components/common/EmptyState";
import ErrorState from "../components/common/ErrorState";
import StatusBadge from "../components/dashboard/StatusBadge";
import Avatar from "../components/dashboard/Avatar";
import SectionHeader from "../components/dashboard/SectionHeader";
import { OrganizationDashboardSkeleton } from "../components/dashboard/DashboardLoadingStates";
import { ROUTE_PATHS } from "../routes/routePaths";
import { useSessionStore } from "../store/useSessionStore";
import { useOrganizationContextStore } from "../store/useOrganizationContextStore";
import * as organizationService from "../services/organization.service";
import { formatDateTime, formatNumber } from "../utils/formatters";

const QUICK_ACTION_ROUTE_MAP = {
  "/organizations/me": ROUTE_PATHS.ORGANIZATION_PROFILE,
  "/organizations/me/settings": ROUTE_PATHS.ORGANIZATION_SETTINGS,
};

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) {
    return "Good morning";
  }

  if (hour < 18) {
    return "Good afternoon";
  }

  return "Good evening";
}

function getDisplayName(user) {
  return `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || "there";
}

function getStatCards(stats = {}) {
  return [
    {
      label: "Total members",
      value: formatNumber(stats.totalMembers || 0),
      helperText: "All organization members",
      icon: Users,
    },
    {
      label: "Active members",
      value: formatNumber(stats.activeMembers || 0),
      helperText: "Accounts currently active",
      icon: UserCheck,
    },
    {
      label: "Suspended members",
      value: formatNumber(stats.suspendedMembers || 0),
      helperText: "Accounts currently suspended",
      icon: ShieldAlert,
    },
    {
      label: "Pending verification",
      value: formatNumber(stats.pendingVerificationMembers || 0),
      helperText: "Waiting for email verification",
      icon: Clock3,
    },
    {
      label: "Inactive members",
      value: formatNumber(stats.inactiveMembers || 0),
      helperText: "Accounts marked inactive",
      icon: UserX,
    },
  ];
}

function OrganizationDashboardPage() {
  const navigate = useNavigate();
  const currentUser = useSessionStore((state) => state.currentUser);
  const organizationContext = useOrganizationContextStore((state) => state.organization);

  const [dashboard, setDashboard] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const organization = dashboard?.organization || organizationContext || null;
  const stats = dashboard?.stats || {};
  const recentActivity = dashboard?.recentActivity || [];
  const quickActions = dashboard?.quickActions || [];

  async function loadDashboard({ quiet = false } = {}) {
    const hasExistingDashboard = Boolean(dashboard);

    if (quiet) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    setError(null);

    try {
      const response = await organizationService.getMyOrganizationDashboard();
      setDashboard(response || null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Something went wrong");

      if (quiet || hasExistingDashboard) {
        toast.error(loadError instanceof Error ? loadError.message : "Unable to refresh dashboard");
      }

      throw loadError;
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    loadDashboard().catch(() => {});
  }, []);

  const statCards = useMemo(() => getStatCards(stats), [stats]);

  const summaryFields = useMemo(
    () => [
      { label: "Organization", value: organization?.name || organization?.organizationName || "Organization" },
      { label: "Business email", value: organization?.businessEmail || "Not provided" },
      { label: "Business phone", value: organization?.businessPhone || "Not provided" },
      { label: "Created", value: formatDateTime(organization?.createdAt) },
      { label: "Approved", value: formatDateTime(organization?.approvedAt) },
      { label: "Primary admin", value: organization?.primaryAdmin ? `${organization.primaryAdmin.firstName || ""} ${organization.primaryAdmin.lastName || ""}`.trim() : "Unassigned" },
    ],
    [organization]
  );

  if (isLoading && !dashboard) {
    return <OrganizationDashboardSkeleton />;
  }

  if (error && !dashboard) {
    return (
      <ErrorState
        title="Unable to load dashboard"
        message={error}
        onRetry={() => {
          loadDashboard().catch(() => {});
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Organization overview"
        title="Dashboard"
        description="A quick snapshot of your organization's current activity and member status."
        actions={[
          {
            label: isRefreshing ? "Refreshing..." : "Refresh",
            variant: "secondary",
            onClick: () => loadDashboard({ quiet: true }).catch(() => {}),
            isLoading: isRefreshing,
            loadingText: "Refreshing...",
          },
        ]}
      />

      <Card className="border-slate-800/70 bg-slate-950/85">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <Avatar
              name={organization?.name || organization?.organizationName}
              src={organization?.logo?.url}
              size="lg"
              className="h-16 w-16 shrink-0"
            />
            <div className="min-w-0 space-y-2">
              <div className="space-y-1">
                <p className="text-sm text-slate-400">
                  {getGreeting()}, {getDisplayName(currentUser)}
                </p>
                <h2 className="truncate text-2xl font-semibold text-white">
                  {organization?.name || organization?.organizationName || "Your organization"}
                </h2>
                <p className="max-w-2xl text-sm leading-6 text-slate-400">
                  Here's what's happening with your organization right now.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={organization?.status} />
                <span className="rounded-full border border-slate-800 bg-slate-950/60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  {currentUser?.role || "Member"}
                </span>
                <span className="rounded-full border border-slate-800 bg-slate-950/60 px-3 py-1 text-xs text-slate-400">
                  {organization?.businessEmail || "No business email"}
                </span>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[20rem]">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Organization status</p>
              <div className="mt-2">
                <StatusBadge status={organization?.status} />
              </div>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Members</p>
              <p className="mt-2 text-2xl font-semibold text-white">{formatNumber(stats.totalMembers || 0)}</p>
            </div>
          </div>
        </div>
      </Card>

      {error && dashboard ? (
        <Card className="border-rose-500/20 bg-rose-500/10">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-rose-200">Dashboard refresh failed</p>
              <p className="text-sm text-rose-100/80">{error}</p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => loadDashboard({ quiet: true }).catch(() => {})}>
              Try again
            </Button>
          </div>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {statCards.map((card) => (
          <StatCard
            key={card.label}
            icon={card.icon}
            label={card.label}
            value={card.value}
            helperText={card.helperText}
            loading={isLoading && !dashboard}
          />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-slate-800/70 bg-slate-950/85">
          <div className="flex items-center justify-between gap-3 border-b border-slate-800/70 pb-4">
            <div>
              <p className="text-sm font-semibold text-white">Organization overview</p>
              <p className="text-sm text-slate-400">Key details surfaced from the dashboard API.</p>
            </div>
            <Building2 className="h-5 w-5 text-app-300" aria-hidden="true" />
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {summaryFields.map((field) => (
              <div key={field.label} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{field.label}</p>
                <p className="mt-2 text-sm text-slate-200">{field.value}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="border-slate-800/70 bg-slate-950/85">
          <div className="flex items-center justify-between gap-3 border-b border-slate-800/70 pb-4">
            <div>
              <p className="text-sm font-semibold text-white">Quick actions</p>
              <p className="text-sm text-slate-400">Shortcuts based on the backend response.</p>
            </div>
            <Activity className="h-5 w-5 text-app-300" aria-hidden="true" />
          </div>

          <div className="mt-5 grid gap-3">
            {quickActions.length > 0 ? (
              quickActions.map((action) => {
                const targetRoute = QUICK_ACTION_ROUTE_MAP[action.path];
                const isComingSoon = !targetRoute;

                return (
                  <button
                    key={action.label}
                    type="button"
                    disabled={isComingSoon}
                    onClick={() => {
                      if (!targetRoute) {
                        toast("This section will be available in a later phase.");
                        return;
                      }

                      navigate(targetRoute);
                    }}
                    className="flex items-center justify-between rounded-2xl border border-slate-800 px-4 py-3 text-left text-sm text-slate-200 transition hover:border-app-500/30 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span className="min-w-0">
                      <span className="block font-medium">{action.label}</span>
                      <span className="block text-xs text-slate-500">
                        {isComingSoon ? "Coming soon" : "Open now"}
                      </span>
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
                  </button>
                );
              })
            ) : (
              <EmptyState
                title="No quick actions"
                message="The backend did not return any dashboard shortcuts yet."
              />
            )}
          </div>
        </Card>
      </div>

      <Card className="border-slate-800/70 bg-slate-950/85">
        <div className="flex items-center justify-between gap-3 border-b border-slate-800/70 pb-4">
          <div>
            <p className="text-sm font-semibold text-white">Recent activity</p>
            <p className="text-sm text-slate-400">Recent organization and member activity.</p>
          </div>
          <Clock3 className="h-5 w-5 text-app-300" aria-hidden="true" />
        </div>

        <div className="mt-5">
          {recentActivity.length > 0 ? (
            <div className="grid gap-3">
              {recentActivity.map((activity) => (
                <div
                  key={`${activity.type}-${activity.occurredAt}`}
                  className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-white">{activity.title}</p>
                      <p className="text-sm leading-6 text-slate-400">{activity.description || "No additional details provided."}</p>
                    </div>
                    <p className="shrink-0 text-xs uppercase tracking-[0.18em] text-slate-500">
                      {formatDateTime(activity.occurredAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No recent activity"
              message="There has not been any recent organization activity yet."
            />
          )}
        </div>
      </Card>
    </div>
  );
}

export default OrganizationDashboardPage;
