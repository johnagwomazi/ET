import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { CalendarDays, Clock3, TicketCheck, Tickets, WalletCards } from "lucide-react";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import StatCard from "../components/dashboard/StatCard";
import EmptyState from "../components/common/EmptyState";
import ErrorState from "../components/common/ErrorState";
import StatusBadge from "../components/dashboard/StatusBadge";
import Avatar from "../components/dashboard/Avatar";
import SectionHeader from "../components/dashboard/SectionHeader";
import { OrganizationDashboardSkeleton } from "../components/dashboard/DashboardLoadingStates";
import { useSessionStore } from "../store/useSessionStore";
import { useOrganizationContextStore } from "../store/useOrganizationContextStore";
import * as organizationService from "../services/organization.service";
import { formatDateTime, formatMoney, formatNumber } from "../utils/formatters";

function greeting() {
  const hour = new Date().getHours();
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}

function timeUntil(value) {
  const milliseconds = new Date(value).getTime() - Date.now();
  if (!Number.isFinite(milliseconds) || milliseconds <= 0) return "Starting now";
  const days = Math.floor(milliseconds / 86400000);
  const hours = Math.floor((milliseconds % 86400000) / 3600000);
  if (days > 0) return `${days}d ${hours}h to go`;
  const minutes = Math.max(1, Math.floor((milliseconds % 3600000) / 60000));
  return `${hours}h ${minutes}m to go`;
}

function OrganizationDashboardPage() {
  const currentUser = useSessionStore((state) => state.currentUser);
  const contextOrganization = useOrganizationContextStore((state) => state.organization);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  async function load(quiet = false) {
    quiet ? setRefreshing(true) : setLoading(true);
    setError("");
    try {
      setDashboard(await organizationService.getMyOrganizationDashboard());
    } catch (requestError) {
      setError(requestError.message || "The dashboard could not be loaded");
      if (quiet) toast.error("The dashboard could not be refreshed");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, []);
  const organization = dashboard?.organization || contextOrganization || {};
  const stats = dashboard?.stats || {};
  const topEvents = dashboard?.topEvents || [];
  const maxTickets = Math.max(1, ...topEvents.map((event) => Number(event.ticketsSold || 0)));
  const cards = useMemo(() => [
    { label: "Total events", value: formatNumber(stats.totalEvents), icon: CalendarDays },
    { label: "Tickets sold", value: formatNumber(stats.ticketsSold), icon: Tickets },
    { label: "Net revenue", value: formatMoney(stats.revenue, stats.currency), icon: WalletCards },
    { label: "Upcoming events", value: formatNumber(stats.upcomingEvents), icon: TicketCheck },
  ], [stats]);

  if (loading && !dashboard) return <OrganizationDashboardSkeleton />;
  if (error && !dashboard) return <ErrorState title="Unable to load dashboard" message={error} onRetry={() => load()} />;

  return (
    <div className="space-y-4 sm:space-y-6">
      <SectionHeader eyebrow={greeting()} title={organization.name || organization.organizationName || "Dashboard"} description="Your organization performance at a glance." actions={[{ label: refreshing ? "Refreshing..." : "Refresh", variant: "secondary", onClick: () => load(true), isLoading: refreshing }]} />
      <Card className="border-slate-800/70 bg-slate-950/85">
        <div className="flex items-center gap-4"><Avatar name={organization.name} src={organization.logo?.url} size="lg" /><div className="min-w-0"><p className="truncate text-xl font-semibold text-white">{organization.name || "Your organization"}</p><div className="mt-2 flex flex-wrap items-center gap-2"><StatusBadge status={organization.status} /><span className="text-sm text-slate-400">{currentUser?.firstName || "Admin"}</span></div></div></div>
      </Card>
      {error ? <Card className="border-rose-500/20 bg-rose-500/10"><div className="flex items-center justify-between gap-3"><p className="text-sm text-rose-200">{error}</p><Button size="sm" variant="secondary" onClick={() => load(true)}>Retry</Button></div></Card> : null}
      <div className="grid grid-cols-2 gap-2 sm:gap-4 xl:grid-cols-4">{cards.map((card) => <StatCard key={card.label} {...card} loading={loading} />)}</div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border-slate-800/70 bg-slate-950/85">
          <div className="border-b border-slate-800 pb-4"><h2 className="font-semibold text-white">Upcoming events</h2><p className="mt-1 text-sm text-slate-400">Your next published events.</p></div>
          <div className="mt-4 space-y-3">{dashboard?.upcomingEvents?.length ? dashboard.upcomingEvents.map((event) => <div key={event.id} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-medium text-white">{event.eventName}</p><p className="mt-1 text-sm text-slate-400">{formatDateTime(event.startAt)}</p></div><span className="shrink-0 rounded-full bg-app-500/10 px-3 py-1 text-xs font-medium text-app-200">{timeUntil(event.startAt)}</span></div></div>) : <EmptyState title="No upcoming events" message="Published future events will appear here." />}</div>
        </Card>
        <Card className="border-slate-800/70 bg-slate-950/85">
          <div className="border-b border-slate-800 pb-4"><h2 className="font-semibold text-white">Top event performance</h2><p className="mt-1 text-sm text-slate-400">Ticket sales across your leading events.</p></div>
          <div className="mt-5 space-y-4">{topEvents.length ? topEvents.map((event) => <div key={event.id}><div className="mb-2 flex justify-between gap-3 text-sm"><span className="truncate text-slate-200">{event.eventName}</span><span className="text-slate-400">{formatNumber(event.ticketsSold)}</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-app-400" style={{ width: `${Math.max(event.ticketsSold ? 4 : 0, (Number(event.ticketsSold || 0) / maxTickets) * 100)}%` }} /></div></div>) : <EmptyState title="No sales yet" message="Ticket performance will appear after sales are recorded." />}</div>
        </Card>
      </div>

      <Card className="border-slate-800/70 bg-slate-950/85">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4"><div><h2 className="font-semibold text-white">Recent activity</h2><p className="mt-1 text-sm text-slate-400">The latest three recorded organization activities.</p></div><Clock3 className="h-5 w-5 text-app-300" /></div>
        <div className="mt-4 space-y-3">{dashboard?.recentActivity?.length ? dashboard.recentActivity.map((activity) => <div key={activity.id || `${activity.type}-${activity.occurredAt}`} className="flex flex-col justify-between gap-2 rounded-2xl border border-slate-800 bg-slate-950/70 p-4 sm:flex-row"><div><p className="text-sm font-medium text-white">{activity.title}</p><p className="mt-1 text-sm text-slate-400">{activity.description}</p></div><p className="shrink-0 text-xs text-slate-500">{formatDateTime(activity.occurredAt)}</p></div>) : <EmptyState title="No recent activity" message="Recorded event, order, and member activity will appear here." />}</div>
      </Card>
    </div>
  );
}

export default OrganizationDashboardPage;
