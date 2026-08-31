import { useEffect, useState } from "react";
import { QrCode } from "lucide-react";
import Card from "../../components/ui/Card";
import EmptyState from "../../components/common/EmptyState";
import ErrorState from "../../components/common/ErrorState";
import SectionHeader from "../../components/dashboard/SectionHeader";
import StatusBadge from "../../components/dashboard/StatusBadge";
import Pagination from "../../components/dashboard/Pagination";
import { Skeleton } from "../../components/common/Skeleton";
import { formatDateTime } from "../../utils/formatters";
import * as ticketingService from "../../services/ticketing.service";

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
      setError(loadError.message || "Unable to load tickets");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadTickets(page);
  }, [page]);

  return (
    <div className="space-y-6">
      <SectionHeader eyebrow="Customer" title="My Tickets" description="Your paid tickets and backend-issued QR codes live here." actions={[{ label: "Refresh", variant: "secondary", onClick: () => loadTickets(page), isLoading }]} />
      {error ? <ErrorState title="Tickets unavailable" message={error} onRetry={() => loadTickets(page)} /> : null}
      {isLoading && tickets.length === 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-72 rounded-2xl" />)}
        </div>
      ) : tickets.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {tickets.map((ticket) => (
            <Card key={ticket.id || ticket.reference} className="border-slate-800/70 bg-slate-950/85">
              <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={ticket.status} />
                    <span className="rounded-full border border-slate-800 bg-slate-900/80 px-3 py-1 text-xs text-slate-400">{ticket.reference}</span>
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-white">{ticket.attendee?.name || "Ticket holder"}</p>
                    <p className="text-sm text-slate-400">{ticket.attendee?.email || "No attendee email"}</p>
                  </div>
                  <p className="text-sm text-slate-500">Issued {formatDateTime(ticket.createdAt)}</p>
                </div>
                <div className="flex min-h-40 items-center justify-center rounded-2xl border border-slate-800 bg-white p-3">
                  {ticket.qrCodeDataUrl ? <img src={ticket.qrCodeDataUrl} alt={`QR code for ${ticket.reference}`} className="h-full max-h-36 w-full object-contain" /> : <QrCode className="h-16 w-16 text-slate-400" />}
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState title="No tickets yet" message="Paid tickets will appear here after backend payment verification." />
      )}
      {pagination?.totalPages > 1 ? <Pagination page={pagination.page} totalPages={pagination.totalPages} totalItems={pagination.totalItems} onPageChange={setPage} /> : null}
    </div>
  );
}

export default CustomerTicketsPage;
