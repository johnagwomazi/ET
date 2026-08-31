import { useEffect, useState } from "react";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import EmptyState from "../../components/common/EmptyState";
import ErrorState from "../../components/common/ErrorState";
import SectionHeader from "../../components/dashboard/SectionHeader";
import StatusBadge from "../../components/dashboard/StatusBadge";
import Pagination from "../../components/dashboard/Pagination";
import { Skeleton } from "../../components/common/Skeleton";
import { formatDateTime, formatMoney } from "../../utils/formatters";
import * as ticketingService from "../../services/ticketing.service";

function CustomerOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  async function loadOrders(nextPage = page) {
    setIsLoading(true);
    setError(null);

    try {
      const response = await ticketingService.getCustomerOrders({ page: nextPage, limit: 10 });
      setOrders(response?.orders || []);
      setPagination(response?.pagination || null);
    } catch (loadError) {
      setError(loadError.message || "Unable to load orders");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadOrders(page);
  }, [page]);

  return (
    <div className="space-y-6">
      <SectionHeader eyebrow="Customer" title="Order History" description="Review your ticket orders and payment status." actions={[{ label: "Refresh", variant: "secondary", onClick: () => loadOrders(page), isLoading }]} />
      {error ? <ErrorState title="Orders unavailable" message={error} onRetry={() => loadOrders(page)} /> : null}
      {isLoading && orders.length === 0 ? (
        <div className="grid gap-3">
          {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-24 rounded-2xl" />)}
        </div>
      ) : orders.length > 0 ? (
        <div className="grid gap-3">
          {orders.map((order) => (
            <Card key={order.id || order.reference} className="border-slate-800/70 bg-slate-950/85">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-white">{order.reference}</p>
                  <p className="mt-1 text-sm text-slate-400">{formatDateTime(order.createdAt)} | {formatMoney(order.total, order.currency)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <StatusBadge status={order.orderStatus} />
                  <StatusBadge status={order.paymentStatus} />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState title="No orders yet" message="Orders will appear here after checkout." />
      )}
      {pagination?.totalPages > 1 ? <Pagination page={pagination.page} totalPages={pagination.totalPages} totalItems={pagination.totalItems} onPageChange={setPage} /> : null}
    </div>
  );
}

export default CustomerOrdersPage;
