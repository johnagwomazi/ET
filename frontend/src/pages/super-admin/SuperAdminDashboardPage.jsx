import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, BarChart3, Building2, CreditCard, ShoppingBag, Ticket, Users } from "lucide-react";
import Card from "../../components/ui/Card";
import EmptyState from "../../components/common/EmptyState";
import ErrorState from "../../components/common/ErrorState";
import SectionHeader from "../../components/dashboard/SectionHeader";
import StatCard from "../../components/dashboard/StatCard";
import Avatar from "../../components/dashboard/Avatar";
import StatusBadge from "../../components/dashboard/StatusBadge";
import Button from "../../components/ui/Button";
import { SuperAdminDashboardSkeleton } from "../../components/dashboard/DashboardLoadingStates";
import EventPerformanceSection from "../../components/analytics/EventPerformanceSection";
import { formatDate, formatDateTime, formatMoney, formatNumber } from "../../utils/formatters";
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
    key: DASHBOARD_STAT_KEYS.REVENUE,
    label: "Gross Ticket Sales",
    icon: CreditCard,
  },
  {
    key: DASHBOARD_STAT_KEYS.EVENTS,
    label: "Total Events",
    icon: Ticket,
  },
  {
    key: DASHBOARD_STAT_KEYS.ACTIVE_EVENTS,
    label: "Active Events",
    icon: Activity,
  },
];

const activityIcons = {
  ORGANIZATION_CREATED: Building2,
  EVENT_CREATED: Ticket,
  TICKET_PURCHASED: ShoppingBag,
};

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
  const suspendedOrganizations = useSuperAdminDashboardStore((state) => state.suspendedOrganizations);
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

  const recentActivity = overview?.recentActivity || [];
  const analyticsSummary = overview?.platformAnalytics?.summary || {};
  const topEvents = overview?.platformAnalytics?.topEvents || [];
  const showLoadingState = !overview && (!hasTriggeredLoad || isLoading);

  if (showLoadingState) {
    return <SuperAdminDashboardSkeleton />;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <SectionHeader
        eyebrow="Platform overview"
        title="Super Admin Dashboard"
        description="Track platform health, manage organizations, and monitor high-level growth signals from one place."
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

      <div className="grid grid-cols-2 gap-2 sm:gap-4 xl:grid-cols-5">
        {statCards.map((card) => {
          const value = card.key === DASHBOARD_STAT_KEYS.REVENUE
            ? analyticsSummary.grossSales
            : card.key === DASHBOARD_STAT_KEYS.EVENTS
              ? overview?.totalEvents
              : overview?.[card.key];

          return (
            <StatCard
              key={card.key}
              icon={card.icon}
              label={card.label}
              value={card.key === DASHBOARD_STAT_KEYS.REVENUE ? formatMoney(value, analyticsSummary.currency) : formatNumber(value)}
              loading={showLoadingState}
            />
          );
        })}
      </div>

      <Card className="border-slate-800/70 bg-slate-950/85">
        <SectionHeader
          eyebrow="Event performance"
          title="Top-performing events"
          description="All-time gross sales, ticket demand, and attendance from successful ticket orders."
          className="mb-5"
          actions={[{ label: "Open analytics", icon: BarChart3, onClick: () => navigate(ROUTE_PATHS.SUPER_ADMIN_ANALYTICS) }]}
        />
        <EventPerformanceSection events={topEvents} pagination={{}} allowDrillDown={false} />
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border-slate-800/70 bg-slate-950/85">
          <SectionHeader
            eyebrow="Recent activity"
            title="Platform activity"
            description="Recent organization, event, and successful ticket-purchase activity."
            className="mb-5"
          />

          <div className="space-y-3">
            {recentActivity.length > 0 ? (
              recentActivity.map((item) => {
                const Icon = activityIcons[item.type] || Activity;
                return (
                  <div key={item.id} className="flex items-start gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                    <div className="shrink-0 rounded-xl bg-app-500/10 p-2 text-app-300 ring-1 ring-app-500/20">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                        <p className="text-sm font-semibold text-white">{item.title}</p>
                        <p className="shrink-0 text-xs text-slate-500">{formatDateTime(item.occurredAt)}</p>
                      </div>
                      <p className="mt-1 text-sm leading-5 text-slate-400">{item.description}</p>
                    </div>
                  </div>
                );
              })
            ) : (
              <EmptyState title="No recent activity" message="Platform activity will appear here as organizations, events, and ticket sales are recorded." />
            )}
          </div>
        </Card>

        <Card className="border-slate-800/70 bg-slate-950/85">
          <SectionHeader
            eyebrow="Access management"
            title="Suspended Organizations"
            description="Organizations whose platform access is currently restricted."
            className="mb-5"
          />

          <div className="space-y-3">
            {suspendedOrganizations.length > 0 ? (
              suspendedOrganizations.map((organization) => (
                <DashboardListItem
                  key={organization._id}
                  title={organization.organizationName}
                  subtitle={organization.primaryAdmin ? `${organization.primaryAdmin.firstName} ${organization.primaryAdmin.lastName}` : organization.businessEmail}
                  status={organization.status}
                  meta={formatDate(organization.createdAt)}
                  avatarName={organization.organizationName}
                  avatarSrc={organization.logo?.url}
                  actionLabel="Manage"
                  onAction={() => navigate(`${ROUTE_PATHS.SUPER_ADMIN_ORGANIZATIONS}/${organization._id}`)}
                />
              ))
            ) : (
              <EmptyState title="No suspended organizations" message="Suspended organizations will appear here for access management." />
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

export default SuperAdminDashboardPage;
