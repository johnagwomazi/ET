import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, MapPin, QrCode, Ticket } from "lucide-react";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import PageContainer from "../../components/ui/PageContainer";
import EmptyState from "../../components/common/EmptyState";
import ErrorState from "../../components/common/ErrorState";
import StatusBadge from "../../components/dashboard/StatusBadge";
import Pagination from "../../components/dashboard/Pagination";
import { Skeleton } from "../../components/common/Skeleton";
import { formatDateTime, formatMoney } from "../../utils/formatters";
import { ROUTE_PATHS } from "../../routes/routePaths";
import * as ticketingService from "../../services/ticketing.service";
import { getEventImageUrl } from "../../utils/eventImage";

const INACTIVE_EVENT_STATUSES = new Set(["CANCELED", "COMPLETED"]);

function isActiveTicket(ticket) {
  return ticket.status === "VALID" && !INACTIVE_EVENT_STATUSES.has(ticket.eventDetails?.status);
}

function getVenue(ticket) {
  const venue = ticket.eventDetails?.venue;
  return [venue?.name, venue?.address?.city].filter(Boolean).join(", ") || "Venue to be announced";
}

function TicketCard({ ticket, active }) {
  const event = ticket.eventDetails;
  const ticketType = ticket.ticketTypeDetails;
  const order = ticket.orderDetails;

  return (
    <Card className="overflow-hidden border-slate-800/70 bg-slate-950/85 p-0">
      <div className="grid sm:grid-cols-[180px_1fr]">
        <div className="aspect-[16/9] bg-slate-900 sm:aspect-auto sm:min-h-56">
          {getEventImageUrl(event) ? (
            <img src={getEventImageUrl(event)} alt={event.eventName || "Event banner"} className="block h-full w-full object-cover" loading="lazy" decoding="async" />
          ) : (
            <div className="flex h-full min-h-40 items-center justify-center"><Ticket className="h-10 w-10 text-slate-600" /></div>
          )}
        </div>

        <div className="space-y-5 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={ticket.status} />
                <StatusBadge status={active ? "ACTIVE" : "INACTIVE"} label={active ? "Active ticket" : "Past / inactive"} />
              </div>
              <h3 className="mt-3 text-xl font-semibold text-white">{event?.eventName || "Event ticket"}</h3>
              <p className="mt-1 text-sm text-slate-400">{ticketType?.name || "Ticket type unavailable"}</p>
            </div>
            {ticket.event ? <Button as={Link} to={`/events/${ticket.event}`} variant="secondary" size="sm">View Event</Button> : null}
          </div>

          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <p className="flex items-center gap-2 text-slate-400"><CalendarDays className="h-4 w-4 shrink-0 text-app-300" />{event?.startAt ? formatDateTime(event.startAt) : "Event date unavailable"}</p>
            <p className="flex items-center gap-2 text-slate-400"><MapPin className="h-4 w-4 shrink-0 text-app-300" /><span className="truncate">{getVenue(ticket)}</span></p>
          </div>

          <details className="rounded-lg border border-slate-800 bg-slate-900/60">
            <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-slate-200">View ticket details</summary>
            <div className="grid gap-5 border-t border-slate-800 p-4 sm:grid-cols-[1fr_150px]">
              <dl className="grid content-start gap-4 text-sm sm:grid-cols-2">
                <div><dt className="text-xs uppercase text-slate-500">Reference</dt><dd className="mt-1 break-all text-slate-200">{ticket.reference}</dd></div>
                <div><dt className="text-xs uppercase text-slate-500">Attendee</dt><dd className="mt-1 text-slate-200">{ticket.attendee?.name || "Not provided"}</dd></div>
                <div><dt className="text-xs uppercase text-slate-500">Issued</dt><dd className="mt-1 text-slate-200">{formatDateTime(ticket.createdAt)}</dd></div>
                {ticket.checkedInAt ? <div><dt className="text-xs uppercase text-slate-500">Checked in</dt><dd className="mt-1 text-slate-200">{formatDateTime(ticket.checkedInAt)}</dd></div> : null}
                {order ? <div><dt className="text-xs uppercase text-slate-500">Purchase</dt><dd className="mt-1 text-slate-200">{formatMoney(order.total, order.currency)} | {order.paymentStatus}</dd></div> : null}
              </dl>

              <div className="flex min-h-36 items-center justify-center rounded-lg border border-slate-800 bg-white p-3">
                {ticket.qrCodeDataUrl ? (
                  <img src={ticket.qrCodeDataUrl} alt={`QR code for ${ticket.reference}`} className="h-32 w-32 object-contain" />
                ) : (
                  <div className="text-center"><QrCode className="mx-auto h-12 w-12 text-slate-400" /><p className="mt-2 text-xs text-slate-500">QR unavailable</p></div>
                )}
              </div>
            </div>
          </details>
        </div>
      </div>
    </Card>
  );
}

function TicketSection({ title, description, tickets, active }) {
  return (
    <section className="space-y-4 border-t border-slate-800 pt-7" aria-label={title}>
      <div><h2 className="text-xl font-semibold text-white">{title}</h2><p className="mt-1 text-sm text-slate-400">{description}</p></div>
      {tickets.length > 0 ? (
        <div className="grid gap-4">{tickets.map((ticket) => <TicketCard key={ticket.id || ticket.reference} ticket={ticket} active={active} />)}</div>
      ) : (
        <div className="rounded-lg border border-slate-800 bg-slate-950/60 px-5 py-6 text-sm text-slate-400">No {active ? "active" : "past or inactive"} tickets on this page.</div>
      )}
    </section>
  );
}

function CustomerTicketsPage() {
  const [tickets, setTickets] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  async function loadTickets(nextPage = page) {
    setIsLoading(true);
    setError(null);

    try {
      const response = await ticketingService.getCustomerTickets({ page: nextPage, limit: 10 });
      setTickets(response?.tickets || []);
      setPagination(response?.pagination || null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load tickets");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadTickets(page);
  }, [page]);

  const activeTickets = useMemo(() => tickets.filter(isActiveTicket), [tickets]);
  const inactiveTickets = useMemo(() => tickets.filter((ticket) => !isActiveTicket(ticket)), [tickets]);

  return (
    <main className="py-10 sm:py-14">
      <PageContainer className="space-y-5 sm:space-y-8">
        <header className="flex flex-col gap-4 border-b border-slate-800 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase text-app-300">Marketplace account</p>
            <h1 className="text-xl font-semibold text-white sm:text-3xl">My Tickets</h1>
            <p className="max-w-2xl text-sm leading-6 text-slate-400">Access every ticket issued to your account and distinguish usable tickets from past activity.</p>
          </div>
          <Button variant="secondary" onClick={() => loadTickets(page)} isLoading={isLoading} loadingText="Refreshing...">Refresh</Button>
        </header>

        {error ? <ErrorState title="Tickets unavailable" message={error} onRetry={() => loadTickets(page)} /> : null}

        {isLoading && tickets.length === 0 ? (
          <div className="grid gap-4">{Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-72 rounded-lg" />)}</div>
        ) : !error && tickets.length === 0 ? (
          <EmptyState title="No tickets yet" message="Browse Events to find your next experience." />
        ) : (
          <div className="space-y-5 sm:space-y-8">
            <TicketSection title={`Active Tickets (${activeTickets.length})`} description="Valid tickets for events that have not been completed or cancelled." tickets={activeTickets} active />
            <TicketSection title={`Past / Inactive Tickets (${inactiveTickets.length})`} description="Used, cancelled, refunded, or event-completed tickets." tickets={inactiveTickets} active={false} />
          </div>
        )}

        {pagination?.totalPages > 1 ? <Pagination page={pagination.page} totalPages={pagination.totalPages} totalItems={pagination.totalItems} onPageChange={setPage} /> : null}
        <div className="flex justify-center"><Button as={Link} to={`${ROUTE_PATHS.HOME}#all-events`} variant="secondary">Browse Events</Button></div>
      </PageContainer>
    </main>
  );
}

export default CustomerTicketsPage;
