import { useEffect, useState } from "react";
import { Eye, RefreshCw, Search, Ticket } from "lucide-react";
import Card from "../ui/Card";
import Button from "../ui/Button";
import Input from "../ui/Input";
import Modal from "../ui/Modal";
import StatusBadge from "../dashboard/StatusBadge";
import Pagination from "../dashboard/Pagination";
import EmptyState from "../common/EmptyState";
import ErrorState from "../common/ErrorState";
import { Skeleton } from "../common/Skeleton";
import { formatDateTime, formatMoney } from "../../utils/formatters";
import * as ticketingService from "../../services/ticketing.service";

function quantityForOrder(order) {
  return (order.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0);
}

function itemSummary(order) {
  return (order.items || []).map((item) => item.name + " x" + item.quantity).join(", ") || "No ticket lines";
}

function EventTicketSalesPanel({ event, canView = false }) {
  const eventId = event?._id || event?.id;
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  async function loadOrders() {
    if (!eventId || !canView) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await ticketingService.getOrganizationEventOrders(eventId, {
        page,
        limit: 20,
        search: appliedSearch || undefined,
      });
      setOrders(response?.orders || []);
      setPagination(response?.pagination || null);
    } catch (loadError) {
      setError(loadError.message || "Unable to load ticket sales");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();
  }, [eventId, canView, page, appliedSearch]);

  async function openDetails(order) {
    setSelectedOrder(order);
    setTickets([]);
    setIsLoadingDetails(true);
    try {
      const response = await ticketingService.getOrganizationEventOrderTickets(eventId, order.id);
      setSelectedOrder(response?.order || order);
      setTickets(response?.tickets || []);
    } catch (detailsError) {
      setSelectedOrder(null);
      setError(detailsError.message || "Unable to load purchase details");
    } finally {
      setIsLoadingDetails(false);
    }
  }

  if (!canView) return null;

  return (
    <Card className="border-slate-800/70 bg-slate-950/85">
      <div className="flex flex-col gap-4 border-b border-slate-800/70 pb-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-300">Buyers and sales</p>
          <h3 className="mt-1 text-lg font-semibold text-white">Ticket sales</h3>
          <p className="mt-2 text-sm text-slate-400">One row per purchase, including paid and complimentary issuance.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <form className="flex gap-2" onSubmit={(submitEvent) => { submitEvent.preventDefault(); setPage(1); setAppliedSearch(search.trim()); }}>
            <Input aria-label="Search purchases" value={search} onChange={(inputEvent) => setSearch(inputEvent.target.value)} placeholder="Buyer, email, or reference" />
            <Button type="submit" variant="secondary" aria-label="Search"><Search className="h-4 w-4" /></Button>
          </form>
          <Button variant="secondary" onClick={loadOrders} isLoading={isLoading}><RefreshCw className="h-4 w-4" />Refresh</Button>
        </div>
      </div>

      <div className="mt-5">
        {isLoading && orders.length === 0 ? (
          <div className="grid gap-3">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-24 rounded-xl" />)}</div>
        ) : error && orders.length === 0 ? (
          <ErrorState title="Ticket sales unavailable" message={error} onRetry={loadOrders} />
        ) : orders.length === 0 ? (
          <EmptyState title="No purchases yet" message="Paid and complimentary ticket records will appear here." />
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-800 text-xs uppercase text-slate-500">
                  <tr><th className="px-3 py-3">Buyer</th><th className="px-3 py-3">Tickets</th><th className="px-3 py-3">Quantity</th><th className="px-3 py-3">Date</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Amount</th><th className="px-3 py-3" /></tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id} className="border-b border-slate-800/70 text-slate-300 last:border-0">
                      <td className="px-3 py-4"><p className="font-medium text-white">{order.customerInfo?.name}</p><p className="text-xs text-slate-500">{order.customerInfo?.email}</p><p className="text-xs text-slate-500">{order.customerInfo?.phone}</p></td>
                      <td className="max-w-xs px-3 py-4">{itemSummary(order)}</td>
                      <td className="px-3 py-4">{quantityForOrder(order)}</td>
                      <td className="px-3 py-4">{formatDateTime(order.createdAt)}</td>
                      <td className="px-3 py-4"><div className="flex flex-wrap gap-1"><StatusBadge status={order.orderStatus} /><StatusBadge status={order.paymentStatus} label={"Payment: " + order.paymentStatus} /></div></td>
                      <td className="px-3 py-4"><p>{order.source === "COMPLIMENTARY" ? "Complimentary" : formatMoney(order.total, order.currency)}</p><p className="text-xs text-slate-500">{order.reference}</p></td>
                      <td className="px-3 py-4"><Button size="sm" variant="secondary" onClick={() => openDetails(order)}><Eye className="h-4 w-4" />Details</Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="grid gap-3 md:hidden">
              {orders.map((order) => (
                <div key={order.id} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                  <div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-white">{order.customerInfo?.name}</p><p className="text-sm text-slate-500">{order.customerInfo?.email}</p><p className="text-sm text-slate-500">{order.customerInfo?.phone}</p></div><div className="flex flex-col items-end gap-1"><StatusBadge status={order.orderStatus} /><StatusBadge status={order.paymentStatus} label={"Payment: " + order.paymentStatus} /></div></div>
                  <p className="mt-3 text-sm text-slate-300">{itemSummary(order)}</p>
                  <div className="mt-3 flex items-center justify-between text-xs text-slate-500"><span>{formatDateTime(order.createdAt)}</span><span>{order.source === "COMPLIMENTARY" ? "Complimentary" : formatMoney(order.total, order.currency)}</span></div>
                  <Button className="mt-4 w-full" size="sm" variant="secondary" onClick={() => openDetails(order)}><Eye className="h-4 w-4" />View details</Button>
                </div>
              ))}
            </div>
          </>
        )}
        {pagination?.totalPages > 1 ? <div className="mt-4 border-t border-slate-800 pt-4"><Pagination page={pagination.page} totalPages={pagination.totalPages} totalItems={pagination.totalItems} onPageChange={setPage} /></div> : null}
      </div>

      <Modal open={Boolean(selectedOrder)} title="Purchase details" onClose={() => setSelectedOrder(null)} className="max-w-3xl">
        {selectedOrder ? (
          <div className="space-y-5">
            <div className="grid gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-sm sm:grid-cols-2">
              <div><p className="text-xs uppercase text-slate-500">Purchaser</p><p className="mt-1 text-white">{selectedOrder.customerInfo?.name}</p><p className="text-slate-400">{selectedOrder.customerInfo?.email}</p><p className="text-slate-400">{selectedOrder.customerInfo?.phone}</p></div>
              <div><p className="text-xs uppercase text-slate-500">Purchase</p><p className="mt-1 font-mono text-white">{selectedOrder.reference}</p><p className="text-slate-400">{selectedOrder.source === "COMPLIMENTARY" ? "Complimentary" : formatMoney(selectedOrder.total, selectedOrder.currency)}</p><p className="text-slate-400">{formatDateTime(selectedOrder.createdAt)}</p></div>
            </div>
            <div>
              <h4 className="font-semibold text-white">Individual tickets</h4>
              <div className="mt-3 grid gap-3">
                {isLoadingDetails ? <Skeleton className="h-28 rounded-xl" /> : tickets.length ? tickets.map((ticket) => (
                  <div key={ticket.id} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                    <div className="flex items-start justify-between gap-3"><div><p className="font-medium text-white">{ticket.ticketTypeDetails?.name || "Ticket"}</p><p className="mt-1 text-sm text-slate-400">{ticket.attendee?.name} | {ticket.attendee?.email}</p><p className="text-sm text-slate-500">{ticket.attendee?.phone}</p></div><StatusBadge status={ticket.status} /></div>
                    <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2"><p className="break-all text-slate-400">Reference: <span className="text-slate-200">{ticket.reference}</span></p><p className="text-slate-400">Code: <span className="font-mono tracking-widest text-app-200">{ticket.checkInCode}</span></p><p className="text-slate-400">Assignment: <span className="text-slate-200">{ticket.purchaser ? "Linked account" : "Recipient details"}</span></p><p className="text-slate-400">Check-in: <span className="text-slate-200">{ticket.checkedInAt ? formatDateTime(ticket.checkedInAt) : "Not checked in"}</span></p></div>
                  </div>
                )) : <div className="rounded-xl border border-dashed border-slate-800 p-6 text-center text-sm text-slate-500"><Ticket className="mx-auto mb-2 h-5 w-5" />No individual tickets issued for this purchase.</div>}
              </div>
            </div>
          </div>
        ) : null}
      </Modal>
    </Card>
  );
}

export default EventTicketSalesPanel;
