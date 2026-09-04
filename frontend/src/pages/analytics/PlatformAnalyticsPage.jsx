import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import Card from "../../components/ui/Card";
import ErrorState from "../../components/common/ErrorState";
import SectionHeader from "../../components/dashboard/SectionHeader";
import AnalyticsFilters from "../../components/analytics/AnalyticsFilters";
import AnalyticsSummary from "../../components/analytics/AnalyticsSummary";
import AnalyticsPageSkeleton from "../../components/analytics/AnalyticsPageSkeleton";
import AttendancePerformance from "../../components/analytics/AttendancePerformance";
import RevenueTrendChart from "../../components/analytics/RevenueTrendChart";
import EventPerformanceSection from "../../components/analytics/EventPerformanceSection";
import OrganizationPerformanceSection from "../../components/analytics/OrganizationPerformanceSection";
import { useAnalyticsFilters } from "../../hooks/useAnalyticsFilters";
import { ANALYTICS_PAGE_SIZE } from "../../constants/analytics.constants";
import { formatMoney, formatNumber } from "../../utils/formatters";
import * as analyticsService from "../../services/analytics.service";

const EMPTY_PAGINATION = { page: 1, limit: ANALYTICS_PAGE_SIZE, totalItems: 0, totalPages: 0 };

function PlatformAnalyticsPage() {
  const { filters, setFilters, query, validationError, canRequest } = useAnalyticsFilters();
  const [overview, setOverview] = useState(null);
  const [sales, setSales] = useState(null);
  const [eventPerformance, setEventPerformance] = useState({ events: [], pagination: EMPTY_PAGINATION });
  const [organizationPerformance, setOrganizationPerformance] = useState({ organizations: [], pagination: EMPTY_PAGINATION });
  const [eventPage, setEventPage] = useState(1);
  const [organizationPage, setOrganizationPage] = useState(1);
  const [eventSort, setEventSort] = useState({ sortBy: "netRevenue", sortOrder: "desc" });
  const [organizationSort, setOrganizationSort] = useState({ sortBy: "netRevenue", sortOrder: "desc" });
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [organizationsLoading, setOrganizationsLoading] = useState(true);
  const [summaryError, setSummaryError] = useState(false);
  const [eventsError, setEventsError] = useState(false);
  const [organizationsError, setOrganizationsError] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const queryKey = JSON.stringify(query);
  const isRefreshing = refreshKey > 0 && (summaryLoading || eventsLoading || organizationsLoading);

  useEffect(() => {
    if (!canRequest) { setSummaryLoading(false); return undefined; }
    const controller = new AbortController();
    setSummaryLoading(true);
    setSummaryError(false);
    Promise.all([
      analyticsService.getPlatformAnalyticsOverview(query, { signal: controller.signal }),
      analyticsService.getPlatformSalesAnalytics({ ...query, period: filters.period }, { signal: controller.signal }),
    ]).then(([overviewResponse, salesResponse]) => { setOverview(overviewResponse); setSales(salesResponse); })
      .catch((error) => { if (error.name !== "AbortError") setSummaryError(true); })
      .finally(() => { if (!controller.signal.aborted) setSummaryLoading(false); });
    return () => controller.abort();
  }, [canRequest, filters.period, queryKey, refreshKey]);

  useEffect(() => {
    if (!canRequest) { setEventsLoading(false); return undefined; }
    const controller = new AbortController();
    setEventsLoading(true);
    setEventsError(false);
    analyticsService.getPlatformEventPerformance({ ...query, page: eventPage, limit: ANALYTICS_PAGE_SIZE, ...eventSort }, { signal: controller.signal })
      .then(setEventPerformance)
      .catch((error) => { if (error.name !== "AbortError") setEventsError(true); })
      .finally(() => { if (!controller.signal.aborted) setEventsLoading(false); });
    return () => controller.abort();
  }, [canRequest, eventPage, eventSort.sortBy, eventSort.sortOrder, queryKey, refreshKey]);

  useEffect(() => {
    if (!canRequest) { setOrganizationsLoading(false); return undefined; }
    const controller = new AbortController();
    setOrganizationsLoading(true);
    setOrganizationsError(false);
    analyticsService.getPlatformOrganizationPerformance({ ...query, page: organizationPage, limit: ANALYTICS_PAGE_SIZE, ...organizationSort }, { signal: controller.signal })
      .then(setOrganizationPerformance)
      .catch((error) => { if (error.name !== "AbortError") setOrganizationsError(true); })
      .finally(() => { if (!controller.signal.aborted) setOrganizationsLoading(false); });
    return () => controller.abort();
  }, [canRequest, organizationPage, organizationSort.sortBy, organizationSort.sortOrder, queryKey, refreshKey]);

  function updateFilters(updates) {
    setEventPage(1);
    setOrganizationPage(1);
    setFilters(updates);
  }

  function updateSort(setSort, current, key) {
    setSort({ sortBy: key, sortOrder: current.sortBy === key && current.sortOrder === "desc" ? "asc" : "desc" });
  }

  const topEvent = overview?.topEvents?.[0];
  const topOrganization = overview?.topOrganizations?.[0];

  return (
    <div className="space-y-6">
      <SectionHeader eyebrow="Platform analytics" title="Transaction and performance overview" description="Ticket sales, refunds, attendance, events, and organization performance across the platform." actions={[{ label: "Refresh", icon: RefreshCw, onClick: () => setRefreshKey((value) => value + 1), isLoading: isRefreshing, loadingText: "Refreshing..." }]} />

      <AnalyticsFilters filters={filters} onChange={updateFilters} onRefresh={() => setRefreshKey((value) => value + 1)} validationError={validationError} isRefreshing={isRefreshing} />
      {!canRequest ? <Card className="border-amber-500/20 bg-amber-500/10 p-5 text-sm text-amber-200">Complete the custom date range to load analytics.</Card> : null}
      {canRequest && summaryLoading && !overview ? <AnalyticsPageSkeleton /> : null}
      {canRequest && summaryError && !overview ? <ErrorState title="Platform analytics unavailable" message="Platform analytics could not be loaded." onRetry={() => setRefreshKey((value) => value + 1)} /> : null}
      {canRequest && summaryError && overview ? <Card className="border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-200">The latest refresh failed. Previously loaded platform analytics remain visible.</Card> : null}

      {canRequest && overview ? (
        <>
          <AnalyticsSummary summary={overview.summary} grossLabel="Gross transaction value" showOrganizations />
          <AttendancePerformance summary={overview.summary} />

          {(topEvent || topOrganization) ? (
            <section className="space-y-4">
              <SectionHeader eyebrow="Leaders" title="Top performers" description="Highest net ticket revenue in the selected range." />
              <div className="grid gap-4 lg:grid-cols-2">
                {topEvent ? <Card className="border-slate-800/70 bg-slate-950/85 p-5"><p className="text-xs font-semibold uppercase text-slate-500">Top event</p><p className="mt-2 text-lg font-semibold text-white">{topEvent.event.name}</p><div className="mt-4 flex items-end justify-between gap-3"><div><p className="text-sm text-slate-500">Net revenue</p><p className="mt-1 text-xl font-semibold text-emerald-300">{formatMoney(topEvent.netRevenue, topEvent.currency)}</p></div><p className="text-sm text-slate-400">{formatNumber(topEvent.ticketsSold)} sold</p></div></Card> : null}
                {topOrganization ? <Card className="border-slate-800/70 bg-slate-950/85 p-5"><p className="text-xs font-semibold uppercase text-slate-500">Top organization</p><p className="mt-2 text-lg font-semibold text-white">{topOrganization.organization.name}</p><div className="mt-4 flex items-end justify-between gap-3"><div><p className="text-sm text-slate-500">Net revenue</p><p className="mt-1 text-xl font-semibold text-emerald-300">{formatMoney(topOrganization.netRevenue, topOrganization.currency)}</p></div><p className="text-sm text-slate-400">{formatNumber(topOrganization.events)} events</p></div></Card> : null}
              </div>
            </section>
          ) : null}

          <RevenueTrendChart data={sales?.series || []} period={sales?.period || filters.period} currency={sales?.currency || overview.summary.currency} loading={summaryLoading && !sales} />

          <section className="space-y-4">
            <SectionHeader eyebrow="Event performance" title="Platform events" description="Compare event revenue, ticket demand, and attendance." />
            {eventsError && eventPerformance.events.length ? <p className="text-sm text-rose-300">Platform event performance could not be refreshed.</p> : null}
            {eventsError && !eventPerformance.events.length ? <ErrorState title="Event analytics unavailable" message="Platform event performance could not be loaded." onRetry={() => setRefreshKey((value) => value + 1)} /> : <EventPerformanceSection events={eventPerformance.events} pagination={eventPerformance.pagination} isLoading={eventsLoading} sortBy={eventSort.sortBy} sortOrder={eventSort.sortOrder} onSort={(key) => { setEventPage(1); updateSort(setEventSort, eventSort, key); }} onPageChange={setEventPage} allowDrillDown={false} />}
          </section>

          <section className="space-y-4">
            <SectionHeader eyebrow="Organization performance" title="Organizations" description="Compare transaction activity, events, ticket volume, and attendance." />
            {organizationsError && organizationPerformance.organizations.length ? <p className="text-sm text-rose-300">Organization performance could not be refreshed.</p> : null}
            {organizationsError && !organizationPerformance.organizations.length ? <ErrorState title="Organization analytics unavailable" message="Organization performance could not be loaded." onRetry={() => setRefreshKey((value) => value + 1)} /> : <OrganizationPerformanceSection organizations={organizationPerformance.organizations} pagination={organizationPerformance.pagination} isLoading={organizationsLoading} sortBy={organizationSort.sortBy} sortOrder={organizationSort.sortOrder} onSort={(key) => { setOrganizationPage(1); updateSort(setOrganizationSort, organizationSort, key); }} onPageChange={setOrganizationPage} />}
          </section>
        </>
      ) : null}
    </div>
  );
}

export default PlatformAnalyticsPage;
