import { useEffect, useMemo, useState } from "react";
import Card from "../../components/ui/Card";
import ErrorState from "../../components/common/ErrorState";
import SectionHeader from "../../components/dashboard/SectionHeader";
import AnalyticsFilters from "../../components/analytics/AnalyticsFilters";
import AnalyticsSummary from "../../components/analytics/AnalyticsSummary";
import AnalyticsPageSkeleton from "../../components/analytics/AnalyticsPageSkeleton";
import EventPerformanceSection from "../../components/analytics/EventPerformanceSection";
import { useAnalyticsFilters } from "../../hooks/useAnalyticsFilters";
import { ANALYTICS_PAGE_SIZE } from "../../constants/analytics.constants";
import * as analyticsService from "../../services/analytics.service";
import * as eventService from "../../services/event.service";

const EMPTY_PAGINATION = { page: 1, limit: ANALYTICS_PAGE_SIZE, totalItems: 0, totalPages: 0 };

function OrganizationAnalyticsPage() {
  const { filters, setFilters, query, validationError, canRequest } = useAnalyticsFilters({ allowEvent: true });
  const [eventOptions, setEventOptions] = useState([]);
  const [overview, setOverview] = useState(null);
  const [eventPerformance, setEventPerformance] = useState({ events: [], pagination: EMPTY_PAGINATION });
  const [eventPage, setEventPage] = useState(1);
  const [eventSort, setEventSort] = useState({ sortBy: "netRevenue", sortOrder: "desc" });
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [summaryError, setSummaryError] = useState(false);
  const [eventsError, setEventsError] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const queryKey = JSON.stringify(query);
  const isRefreshing = refreshKey > 0 && (summaryLoading || eventsLoading);

  useEffect(() => {
    const controller = new AbortController();
    eventService.getOrganizationEvents({ page: 1, limit: 100, sortBy: "startAt", sortOrder: "desc" }, { signal: controller.signal })
      .then((response) => setEventOptions((response?.events || []).map((event) => ({ value: event._id || event.id, label: event.eventName || "Untitled event" }))))
      .catch((error) => { if (error.name !== "AbortError") setEventOptions([]); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!canRequest) { setSummaryLoading(false); return undefined; }
    const controller = new AbortController();
    setSummaryLoading(true);
    setSummaryError(false);
    analyticsService.getOrganizationAnalyticsOverview(query, { signal: controller.signal })
      .then(setOverview)
      .catch((error) => {
        if (error.name !== "AbortError") setSummaryError(true);
      }).finally(() => { if (!controller.signal.aborted) setSummaryLoading(false); });
    return () => controller.abort();
  }, [canRequest, queryKey, refreshKey]);

  useEffect(() => {
    if (!canRequest) { setEventsLoading(false); return undefined; }
    const controller = new AbortController();
    setEventsLoading(true);
    setEventsError(false);
    analyticsService.getOrganizationEventPerformance({ ...query, page: eventPage, limit: ANALYTICS_PAGE_SIZE, ...eventSort }, { signal: controller.signal })
      .then(setEventPerformance)
      .catch((error) => { if (error.name !== "AbortError") setEventsError(true); })
      .finally(() => { if (!controller.signal.aborted) setEventsLoading(false); });
    return () => controller.abort();
  }, [canRequest, eventPage, eventSort.sortBy, eventSort.sortOrder, queryKey, refreshKey]);

  function updateFilters(updates) {
    setEventPage(1);
    setFilters(updates);
  }

  function updateSort(setSort, current, key) {
    setSort({ sortBy: key, sortOrder: current.sortBy === key && current.sortOrder === "desc" ? "asc" : "desc" });
  }

  const drillDownQuery = useMemo(() => {
    const params = new URLSearchParams();
    params.set("preset", filters.preset);
    params.set("period", filters.period);
    if (filters.startDate) params.set("startDate", filters.startDate);
    if (filters.endDate) params.set("endDate", filters.endDate);
    return params.toString();
  }, [filters.endDate, filters.period, filters.preset, filters.startDate]);

  return (
    <div className="space-y-6">
      <SectionHeader eyebrow="Revenue and analytics" title="Organization performance" description="Sales, ticket demand, refunds, and attendance across your events." />

      <AnalyticsFilters filters={filters} onChange={updateFilters} onRefresh={() => setRefreshKey((value) => value + 1)} eventOptions={eventOptions} showEvent showPeriod={false} validationError={validationError} isRefreshing={isRefreshing} />

      {!canRequest ? <Card className="border-amber-500/20 bg-amber-500/10 p-5 text-sm text-amber-200">Complete the custom date range to load analytics.</Card> : null}

      {canRequest && summaryLoading && !overview ? <AnalyticsPageSkeleton /> : null}

      {canRequest && summaryError && !overview ? <ErrorState title="Analytics unavailable" message="Organization analytics could not be loaded." onRetry={() => setRefreshKey((value) => value + 1)} /> : null}
      {canRequest && summaryError && overview ? <Card className="border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-200">The latest refresh failed. Previously loaded analytics remain visible.</Card> : null}

      {canRequest && (overview || (!summaryLoading && !summaryError)) ? (
        <>
          <AnalyticsSummary summary={overview?.summary || {}} loading={summaryLoading && !overview} showRemaining />

          <section className="space-y-4">
            <SectionHeader eyebrow="Event performance" title="Compare events" description="Revenue, demand, and attendance for each event in the selected range." />
            {eventsError && eventPerformance.events.length ? <p className="text-sm text-rose-300">Event performance could not be refreshed.</p> : null}
            {eventsError && !eventPerformance.events.length ? <ErrorState title="Event analytics unavailable" message="Event performance could not be loaded." onRetry={() => setRefreshKey((value) => value + 1)} /> : <EventPerformanceSection events={eventPerformance.events} pagination={eventPerformance.pagination} isLoading={eventsLoading} sortBy={eventSort.sortBy} sortOrder={eventSort.sortOrder} onSort={(key) => { setEventPage(1); updateSort(setEventSort, eventSort, key); }} onPageChange={setEventPage} queryString={drillDownQuery} />}
          </section>
        </>
      ) : null}
    </div>
  );
}

export default OrganizationAnalyticsPage;
