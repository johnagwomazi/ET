import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";

import Button from "../../components/ui/Button";
import PageContainer from "../../components/ui/PageContainer";
import EmptyState from "../../components/common/EmptyState";
import ErrorState from "../../components/common/ErrorState";
import Pagination from "../../components/dashboard/Pagination";
import { Skeleton } from "../../components/common/Skeleton";
import EventidorTicketCard from "../../components/ticketing/EventidorTicketCard";
import TicketAssignmentModal from "../../components/ticketing/TicketAssignmentModal";
import { ROUTE_PATHS } from "../../routes/routePaths";
import * as ticketingService from "../../services/ticketing.service";

const INACTIVE_EVENT_STATUSES = new Set(["CANCELED", "COMPLETED"]);

function isActiveTicket(ticket) {
  return ticket.status === "VALID" && !INACTIVE_EVENT_STATUSES.has(ticket.eventDetails?.status);
}

function TicketSection({ title, description, tickets, active, onAssign }) {
  return (
    <section className="space-y-4 border-t border-slate-800 pt-7" aria-label={title}>
      <div><h2 className="text-xl font-semibold text-white">{title}</h2><p className="mt-1 text-sm text-slate-400">{description}</p></div>
      {tickets.length > 0 ? (
        <div className="grid gap-5">{tickets.map((ticket) => <EventidorTicketCard key={ticket.id || ticket.reference} ticket={ticket} active={active} onAssign={onAssign} />)}</div>
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
  const [assignmentTicket, setAssignmentTicket] = useState(null);
  const [isAssigning, setIsAssigning] = useState(false);

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

  async function handleAssignment(payload) {
    if (!assignmentTicket?.id || isAssigning) return;
    setIsAssigning(true);
    try {
      const response = await ticketingService.assignCustomerTicket(assignmentTicket.id, payload);
      setTickets((current) => current.map((ticket) => ticket.id === assignmentTicket.id ? response.ticket : ticket));
      setAssignmentTicket(null);
      if (response.emailSent) toast.success("Ticket assigned and recipient notified");
      else toast("Ticket assigned, but the notification email could not be delivered");
    } catch (assignmentError) {
      toast.error(assignmentError instanceof Error ? assignmentError.message : "Unable to assign ticket");
    } finally {
      setIsAssigning(false);
    }
  }

  const activeTickets = useMemo(() => tickets.filter(isActiveTicket), [tickets]);
  const inactiveTickets = useMemo(() => tickets.filter((ticket) => !isActiveTicket(ticket)), [tickets]);

  return (
    <main className="py-10 sm:py-14">
      <PageContainer className="space-y-5 sm:space-y-8">
        <header className="flex flex-col gap-4 border-b border-slate-800 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-300">Eventidor account</p>
            <h1 className="text-xl font-semibold text-white sm:text-3xl">My Tickets</h1>
            <p className="max-w-2xl text-sm leading-6 text-slate-400">Open your QR code, use the manual check-in code, or assign an individual ticket to its recipient.</p>
          </div>
          <Button variant="secondary" onClick={() => loadTickets(page)} isLoading={isLoading} loadingText="Refreshing...">Refresh</Button>
        </header>

        {error ? <ErrorState title="Tickets unavailable" message={error} onRetry={() => loadTickets(page)} /> : null}
        {isLoading && tickets.length === 0 ? (
          <div className="grid gap-4">{Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-96 rounded-lg" />)}</div>
        ) : !error && tickets.length === 0 ? (
          <EmptyState title="No tickets yet" message="Browse Events to find your next experience." />
        ) : (
          <div className="space-y-5 sm:space-y-8">
            <TicketSection title={`Active Tickets (${activeTickets.length})`} description="Valid tickets for events that have not been completed or cancelled." tickets={activeTickets} active onAssign={setAssignmentTicket} />
            <TicketSection title={`Past / Inactive Tickets (${inactiveTickets.length})`} description="Used, cancelled, refunded, or event-completed tickets." tickets={inactiveTickets} active={false} onAssign={setAssignmentTicket} />
          </div>
        )}

        {pagination?.totalPages > 1 ? <Pagination page={pagination.page} totalPages={pagination.totalPages} totalItems={pagination.totalItems} onPageChange={setPage} /> : null}
        <div className="flex justify-center"><Button as={Link} to={`${ROUTE_PATHS.HOME}#all-events`} variant="secondary">Browse Events</Button></div>
      </PageContainer>

      <TicketAssignmentModal ticket={assignmentTicket} open={Boolean(assignmentTicket)} onClose={() => setAssignmentTicket(null)} onSubmit={handleAssignment} isSubmitting={isAssigning} />
    </main>
  );
}

export default CustomerTicketsPage;
