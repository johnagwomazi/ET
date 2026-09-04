import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, RefreshCw } from "lucide-react";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import ErrorState from "../../components/common/ErrorState";
import SectionHeader from "../../components/dashboard/SectionHeader";
import StatusBadge from "../../components/dashboard/StatusBadge";
import AnalyticsFilters from "../../components/analytics/AnalyticsFilters";
import AnalyticsSummary from "../../components/analytics/AnalyticsSummary";
import AnalyticsPageSkeleton from "../../components/analytics/AnalyticsPageSkeleton";
import AttendancePerformance from "../../components/analytics/AttendancePerformance";
import RevenueTrendChart from "../../components/analytics/RevenueTrendChart";
import TicketTypePerformanceSection from "../../components/analytics/TicketTypePerformanceSection";
import { useAnalyticsFilters } from "../../hooks/useAnalyticsFilters";
import { ROUTE_PATHS } from "../../routes/routePaths";
import { formatDateTime, formatNumber } from "../../utils/formatters";
import * as analyticsService from "../../services/analytics.service";

function EventAnalyticsPage() {
  const { eventId } = useParams();
  const { filters, setFilters, query, validationError, canRequest } = useAnalyticsFilters({ eventId });
  const [analytics, setAnalytics] = useState(null);
  const [sales, setSales] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const queryKey = JSON.stringify(query);

  useEffect(() => {
    if (!canRequest) { setIsLoading(false); return undefined; }
    const controller = new AbortController();
    setIsLoading(true);
    setError(false);
    Promise.all([
      analyticsService.getEventAnalytics(eventId, query, { signal: controller.signal }),
      analyticsService.getOrganizationSalesAnalytics({ ...query, eventId, period: filters.period }, { signal: controller.signal }),
    ]).then(([analyticsResponse, salesResponse]) => {
      setAnalytics(analyticsResponse);
      setSales(salesResponse);
    }).catch((requestError) => {
      if (requestError.name !== "AbortError") setError(true);
    }).finally(() => { if (!controller.signal.aborted) setIsLoading(false); });
    return () => controller.abort();
  }, [canRequest, eventId, filters.period, queryKey, refreshKey]);

  const backQuery = useMemo(() => {
    const params = new URLSearchParams();
    params.set("preset", filters.preset);
    params.set("period", filters.period);
    if (filters.startDate) params.set("startDate", filters.startDate);
    if (filters.endDate) params.set("endDate", filters.endDate);
    return params.toString();
  }, [filters.endDate, filters.period, filters.preset, filters.startDate]);

  const event = analytics?.event;
  const ticketPagination = { page: 1, limit: Math.max(analytics?.ticketTypes?.length || 0, 1), totalItems: analytics?.ticketTypes?.length || 0, totalPages: analytics?.ticketTypes?.length ? 1 : 0 };

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Event analytics"
        title={event?.name || "Event performance"}
        description="Revenue, ticket inventory, and attendance for this event."
        actions={[
          { label: "Back", as: Link, to: `${ROUTE_PATHS.ORGANIZATION_ANALYTICS}?${backQuery}`, icon: ArrowLeft },
          { label: "Refresh", onClick: () => setRefreshKey((value) => value + 1), isLoading, loadingText: "Refreshing...", icon: RefreshCw },
        ]}
      />

      <AnalyticsFilters filters={filters} onChange={setFilters} onRefresh={() => setRefreshKey((value) => value + 1)} showPeriod validationError={validationError} isRefreshing={isLoading && Boolean(analytics)} />

      {!canRequest ? <Card className="border-amber-500/20 bg-amber-500/10 p-5 text-sm text-amber-200">Complete the custom date range to load analytics.</Card> : null}
      {canRequest && isLoading && !analytics ? <AnalyticsPageSkeleton /> : null}
      {canRequest && error && !analytics ? <ErrorState title="Event analytics unavailable" message="This event's analytics could not be loaded." onRetry={() => setRefreshKey((value) => value + 1)} /> : null}
      {canRequest && error && analytics ? <Card className="border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-200">The latest refresh failed. Previously loaded event analytics remain visible.</Card> : null}

      {canRequest && analytics ? (
        <>
          <Card className="border-slate-800/70 bg-slate-950/85 p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div><div className="flex flex-wrap items-center gap-3"><h2 className="text-xl font-semibold text-white">{event.name}</h2><StatusBadge status={event.status} /></div><p className="mt-2 text-sm text-slate-400">{formatDateTime(event.startAt)} to {formatDateTime(event.endAt)}</p></div>
              <div className="text-left sm:text-right"><p className="text-xs font-semibold uppercase text-slate-500">Capacity</p><p className="mt-1 text-2xl font-semibold text-white">{formatNumber(event.capacity)}</p></div>
            </div>
          </Card>

          <AnalyticsSummary summary={analytics.summary} loading={false} hideEvents showRemaining />
          <AttendancePerformance summary={analytics.summary} />
          <RevenueTrendChart data={sales?.series || []} period={sales?.period || filters.period} currency={sales?.currency || analytics.summary.currency} loading={isLoading && !sales} />

          <section className="space-y-4">
            <SectionHeader eyebrow="Ticket breakdown" title="Ticket-type performance" description="Sales value and current inventory for every ticket type configured on this event." />
            <TicketTypePerformanceSection ticketTypes={analytics.ticketTypes || []} pagination={ticketPagination} />
          </section>
        </>
      ) : null}
    </div>
  );
}

export default EventAnalyticsPage;
