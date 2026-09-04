import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BarChart3, Building2, CreditCard, LayoutDashboard, Ticket, Users } from "lucide-react";
import Card from "../../components/ui/Card";
import EmptyState from "../../components/common/EmptyState";
import ErrorState from "../../components/common/ErrorState";
import SectionHeader from "../../components/dashboard/SectionHeader";
import StatCard from "../../components/dashboard/StatCard";
import Avatar from "../../components/dashboard/Avatar";
import StatusBadge from "../../components/dashboard/StatusBadge";
import Button from "../../components/ui/Button";
import { SuperAdminDashboardSkeleton } from "../../components/dashboard/DashboardLoadingStates";
import { formatDate, formatMoney, formatNumber } from "../../utils/formatters";
import { DASHBOARD_STAT_KEYS } from "../../constants/dashboard.constants";
import { ROUTE_PATHS } from "../../routes/routePaths";
import { useSuperAdminDashboardStore } from "../../store/useSuperAdminDashboardStore";

const statCards = [
  {
    key: DASHBOARD_STAT_KEYS.USERS,
    label: "Total Users",
    icon: Users,
  },
  {
    key: DASHBOARD_STAT_KEYS.ORGANIZATIONS,
    label: "Organizations",
    icon: Building2,
  },
  {
    key: DASHBOARD_STAT_KEYS.PENDING_ORGANIZATIONS,
    label: "Pending Organizations",
    icon: LayoutDashboard,
  },
  {
    key: DASHBOARD_STAT_KEYS.REVENUE,
    label: "Gross Sales",
    icon: CreditCard,
    helper: "Successful ticket orders",
  },
  {
    key: DASHBOARD_STAT_KEYS.EVENTS,
    label: "Events",
    icon: Ticket,
    helper: "Platform events",
  },
];

function DashboardListItem({ title, subtitle, status, meta, avatarName, avatarSrc, actionLabel, onAction }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <Avatar name={avatarName || title} src={avatarSrc} size="sm" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">{title}</p>
          <p className="truncate text-xs text-slate-400">{subtitle}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3 text-right">
        <div className="flex flex-col items-end gap-1">
          {status ? <StatusBadge status={status} /> : null}
          {meta ? <span className="text-xs text-slate-500">{meta}</span> : null}
        </div>
        {actionLabel ? (
          <Button size="sm" variant="secondary" onClick={onAction}>
            {actionLabel}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function SuperAdminDashboardPage() {
  const navigate = useNavigate();
  const overview = useSuperAdminDashboardStore((state) => state.overview);
  const pendingOrganizations = useSuperAdminDashboardStore((state) => state.pendingOrganizations);
  const isLoading = useSuperAdminDashboardStore((state) => state.isLoading);
  const error = useSuperAdminDashboardStore((state) => state.error);
  const fetchDashboard = useSuperAdminDashboardStore((state) => state.fetchDashboard);
  const clearError = useSuperAdminDashboardStore((state) => state.clearError);
  const [hasTriggeredLoad, setHasTriggeredLoad] = useState(false);

  useEffect(() => {
    if (!hasTriggeredLoad && !overview && !isLoading) {
      setHasTriggeredLoad(true);
      fetchDashboard().catch(() => {});
    }
  }, [fetchDashboard, hasTriggeredLoad, isLoading, overview]);

  if (error && !overview) {
    return <ErrorState title="Dashboard unavailable" message={error} onRetry={fetchDashboard} />;
  }

  const recentOrganizations = overview?.recentOrganizations || [];
  const recentUsers = overview?.recentUsers || [];
  const analyticsSummary = overview?.platformAnalytics?.summary || {};
  const showLoadingState = !overview && (!hasTriggeredLoad || isLoading);

  if (showLoadingState) {
    return <SuperAdminDashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Platform overview"
        title="Super Admin Dashboard"
        description="Track platform health, review organization approvals, and monitor high-level growth signals from one place."
        actions={[
          {
            label: "Refresh",
            variant: "secondary",
            onClick: () => {
              clearError();
              fetchDashboard().catch(() => {});
            },
            isLoading,
          },
        ]}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {statCards.map((card) => {
          const value = card.key === DASHBOARD_STAT_KEYS.REVENUE
            ? analyticsSummary.grossSales
            : card.key === DASHBOARD_STAT_KEYS.EVENTS
              ? analyticsSummary.events
              : overview?.[card.key];

          return (
            <StatCard
              key={card.key}
              icon={card.icon}
              label={card.label}
              value={card.key === DASHBOARD_STAT_KEYS.REVENUE ? formatMoney(value, analyticsSummary.currency) : formatNumber(value)}
              helperText={card.helper}
              loading={showLoadingState}
            />
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border-slate-800/70 bg-slate-950/85">
          <SectionHeader
            eyebrow="Recent activity"
            title="Recent Organizations"
            description="The latest organizations created on the platform."
            className="mb-5"
          />

          <div className="space-y-3">
            {recentOrganizations.length > 0 ? (
              recentOrganizations.map((organization) => (
                <DashboardListItem
                  key={organization._id}
                  title={organization.organizationName}
                  subtitle={organization.primaryAdmin ? `${organization.primaryAdmin.firstName} ${organization.primaryAdmin.lastName}` : "No admin assigned"}
                  status={organization.status}
                  meta={formatDate(organization.createdAt)}
                  avatarName={organization.organizationName}
                  avatarSrc={organization.logo?.url}
                />
              ))
            ) : (
              <EmptyState title="No organizations yet" message="Organizations will appear here once they are created." />
            )}
          </div>
        </Card>

        <Card className="border-slate-800/70 bg-slate-950/85">
          <SectionHeader
            eyebrow="Approval queue"
            title="Pending Organizations"
            description="Organizations waiting for Super Admin review."
            className="mb-5"
          />

          <div className="space-y-3">
            {pendingOrganizations.length > 0 ? (
              pendingOrganizations.map((organization) => (
                <DashboardListItem
                  key={organization._id}
                  title={organization.organizationName}
                  subtitle={organization.primaryAdmin ? `${organization.primaryAdmin.firstName} ${organization.primaryAdmin.lastName}` : organization.businessEmail}
                  status={organization.status}
                  meta={formatDate(organization.createdAt)}
                  avatarName={organization.organizationName}
                  avatarSrc={organization.logo?.url}
                  actionLabel="Review"
                  onAction={() => navigate(ROUTE_PATHS.SUPER_ADMIN_ORGANIZATIONS)}
                />
              ))
            ) : (
              <EmptyState title="No pending reviews" message="New organizations will show up here for approval." />
            )}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border-slate-800/70 bg-slate-950/85">
          <SectionHeader
            eyebrow="Users"
            title="Recent Users"
            description="A quick look at the latest platform accounts."
            className="mb-5"
          />

          <div className="space-y-3">
            {recentUsers.length > 0 ? (
              recentUsers.map((user) => (
                <DashboardListItem
                  key={user._id}
                  title={`${user.firstName} ${user.lastName}`}
                  subtitle={user.email}
                  status={user.accountStatus}
                  meta={user.role}
                  avatarName={`${user.firstName} ${user.lastName}`}
                />
              ))
            ) : (
              <EmptyState title="No users yet" message="User accounts will appear here as they join the platform." />
            )}
          </div>
        </Card>

        <Card className="border-slate-800/70 bg-slate-950/85">
          <SectionHeader
            eyebrow="Platform metrics"
            title="High-level snapshot"
            description="All-time ticket transaction and attendance totals."
            className="mb-5"
            actions={[{ label: "Open analytics", icon: BarChart3, onClick: () => navigate(ROUTE_PATHS.SUPER_ADMIN_ANALYTICS) }]}
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Net revenue</p>
              <p className="mt-2 text-2xl font-semibold text-emerald-300">{formatMoney(analyticsSummary.netRevenue || 0, analyticsSummary.currency)}</p>
              <p className="mt-1 text-sm text-slate-500">Gross sales less successful refunds</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Events</p>
              <p className="mt-2 text-2xl font-semibold text-white">{formatNumber(analyticsSummary.events || 0)}</p>
              <p className="mt-1 text-sm text-slate-500">Platform event total</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Tickets sold</p>
              <p className="mt-2 text-2xl font-semibold text-white">{formatNumber(analyticsSummary.ticketsSold || 0)}</p>
              <p className="mt-1 text-sm text-slate-500">Attached to successful orders</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Attendance</p>
              <p className="mt-2 text-2xl font-semibold text-white">{formatNumber(analyticsSummary.attendance || 0)}</p>
              <p className="mt-1 text-sm text-slate-500">Recorded check-ins</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default SuperAdminDashboardPage;
