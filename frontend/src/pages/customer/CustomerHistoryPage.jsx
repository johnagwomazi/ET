import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BadgeCheck, CalendarDays, MapPin, ReceiptText, Ticket } from "lucide-react";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import PageContainer from "../../components/ui/PageContainer";
import EmptyState from "../../components/common/EmptyState";
import ErrorState from "../../components/common/ErrorState";
import { Skeleton } from "../../components/common/Skeleton";
import Pagination from "../../components/dashboard/Pagination";
import StatusBadge from "../../components/dashboard/StatusBadge";
import { ROUTE_PATHS } from "../../routes/routePaths";
import * as ticketingService from "../../services/ticketing.service";
import { formatDateTime, formatMoney } from "../../utils/formatters";
import { getEventImageUrl } from "../../utils/eventImage";

const HISTORY_FILTERS = [
  { value: "", label: "All" },
  { value: "ATTENDED", label: "Attended" },
  { value: "CANCELED", label: "Cancelled" },
  { value: "REFUNDED", label: "Refunded" },
  { value: "COMPLETED", label: "Completed" },
];

function getVenue(record) {
  const venue = record.eventDetails?.venue;
  return [venue?.name, venue?.address?.city].filter(Boolean).join(", ") || "Venue unavailable";
}

function HistoryCard({ record }) {
  const event = record.eventDetails;
  const order = record.orderDetails;

  return (
    <Card className="overflow-hidden border-slate-800/70 bg-slate-950/85 p-0">
      <div className="grid sm:grid-cols-[160px_1fr]">
        <div className="aspect-[16/9] bg-slate-900 sm:aspect-auto sm:min-h-48">
          {getEventImageUrl(event) ? (
            <img src={getEventImageUrl(event)} alt={event.eventName || "Event banner"} className="block h-full w-full object-cover" loading="lazy" decoding="async" />
          ) : (
            <div className="flex h-full min-h-36 items-center justify-center"><Ticket className="h-9 w-9 text-slate-600" /></div>
          )}
        </div>

        <div className="space-y-4 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <StatusBadge status={record.historyStatus} label={record.historyStatus === "CANCELED" ? "Cancelled" : undefined} />
              <h2 className="mt-3 text-xl font-semibold text-white">{event?.eventName || "Event activity"}</h2>
              <p className="mt-1 text-sm text-slate-400">{record.ticketTypeDetails?.name || "Ticket type unavailable"}</p>
            </div>
            {record.event ? <Button as={Link} to={`/events/${record.event}`} variant="secondary" size="sm">View Event</Button> : null}
          </div>

          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <p className="flex items-center gap-2 text-slate-400"><CalendarDays className="h-4 w-4 text-app-300" />{event?.startAt ? formatDateTime(event.startAt) : "Date unavailable"}</p>
            <p className="flex items-center gap-2 text-slate-400"><MapPin className="h-4 w-4 text-app-300" /><span className="truncate">{getVenue(record)}</span></p>
            {record.historyStatus === "ATTENDED" && record.checkedInAt ? (
              <p className="flex items-center gap-2 text-emerald-300"><BadgeCheck className="h-4 w-4" />Checked in {formatDateTime(record.checkedInAt)}</p>
            ) : null}
            {order ? (
              <p className="flex items-center gap-2 text-slate-400"><ReceiptText className="h-4 w-4 text-app-300" />{formatMoney(order.total, order.currency)} | {order.paymentStatus}</p>
            ) : null}
          </div>

          {order?.createdAt ? <p className="text-xs text-slate-500">Purchased {formatDateTime(order.createdAt)}</p> : null}
        </div>
      </div>
    </Card>
  );
}

function CustomerHistoryPage() {
  const [history, setHistory] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  async function loadHistory(nextPage = page, nextStatus = status) {
    setIsLoading(true);
    setError(null);

    try {
      const response = await ticketingService.getCustomerHistory({ page: nextPage, limit: 10, status: nextStatus || undefined });
      setHistory(response?.history || []);
      setPagination(response?.pagination || null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load history");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadHistory(page, status);
  }, [page, status]);

  function handleStatusChange(nextStatus) {
    setPage(1);
    setStatus(nextStatus);
  }

  return (
    <main className="py-10 sm:py-14">
      <PageContainer className="space-y-5 sm:space-y-8">
        <header className="flex flex-col gap-4 border-b border-slate-800 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase text-app-300">Customer account</p>
            <h1 className="text-xl font-semibold text-white sm:text-3xl">History</h1>
            <p className="max-w-2xl text-sm leading-6 text-slate-400">Review attended, completed, cancelled, and refunded event activity.</p>
          </div>
          <Button variant="secondary" onClick={() => loadHistory(page, status)} isLoading={isLoading} loadingText="Refreshing...">Refresh</Button>
        </header>

        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter customer history">
          {HISTORY_FILTERS.map((filter) => (
            <button
              key={filter.value || "all"}
              type="button"
              role="tab"
              aria-selected={status === filter.value}
              onClick={() => handleStatusChange(filter.value)}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${status === filter.value ? "border-app-500/40 bg-app-500/15 text-white" : "border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700 hover:text-white"}`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {error ? <ErrorState title="History unavailable" message={error} onRetry={() => loadHistory(page, status)} /> : null}

        {isLoading && history.length === 0 ? (
          <div className="grid gap-4">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-52 rounded-lg" />)}</div>
        ) : history.length > 0 ? (
          <div className="grid gap-4">{history.map((record) => <HistoryCard key={record.id || record.reference} record={record} />)}</div>
        ) : !error ? (
          <EmptyState
            title={status ? `No ${HISTORY_FILTERS.find((filter) => filter.value === status)?.label.toLowerCase()} history` : "No Event history yet"}
            message="Historical activity appears here only when real ticket, Event, refund, or check-in records qualify."
          />
        ) : null}

        {pagination?.totalPages > 1 ? <Pagination page={pagination.page} totalPages={pagination.totalPages} totalItems={pagination.totalItems} onPageChange={setPage} /> : null}

        <div className="flex justify-center"><Button as={Link} to={`${ROUTE_PATHS.HOME}#all-events`} variant="secondary">Browse Events</Button></div>
      </PageContainer>
    </main>
  );
}

export default CustomerHistoryPage;
