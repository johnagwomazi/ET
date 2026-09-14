import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowUpRight, Banknote, RefreshCw } from "lucide-react";
import Button from "../ui/Button";
import Card from "../ui/Card";
import Input from "../ui/Input";
import EmptyState from "../common/EmptyState";
import ErrorState from "../common/ErrorState";
import StatCard from "../dashboard/StatCard";
import { formatMoney, formatNumber } from "../../utils/formatters";
import { ROUTE_PATHS } from "../../routes/routePaths";
import * as ticketingService from "../../services/ticketing.service";

function EventFinancialPanel({ event, canView = false }) {
  const eventId = event?._id || event?.id;
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [refundForm, setRefundForm] = useState({ orderReference: "", amount: "", reason: "" });
  const [isSubmittingRefund, setIsSubmittingRefund] = useState(false);

  async function loadSummary() {
    if (!eventId || !canView) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await ticketingService.getOrganizationEventFinancialSummary(eventId);
      setSummary(response?.summary || null);
    } catch (loadError) {
      setError(loadError.message || "Unable to load event financials");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadSummary();
  }, [eventId, canView]);

  async function submitRefund(event) {
    event.preventDefault();
    setIsSubmittingRefund(true);

    try {
      await ticketingService.createOrderRefund(refundForm.orderReference, {
        amount: refundForm.amount ? Number(refundForm.amount) : undefined,
        reason: refundForm.reason,
      });
      toast.success("Refund request submitted");
      setRefundForm({ orderReference: "", amount: "", reason: "" });
      await loadSummary();
    } catch (refundError) {
      toast.error(refundError.message || "Refund request failed");
    } finally {
      setIsSubmittingRefund(false);
    }
  }

  if (!canView) {
    return null;
  }

  const cards = [
    { label: "Tickets sold", value: formatNumber(summary?.ticketsSold || 0) },
    { label: "Remaining", value: formatNumber(summary?.ticketsRemaining || 0) },
    { label: "Gross sales", value: formatMoney(summary?.grossSales || 0) },
    { label: "Net revenue", value: formatMoney(summary?.netRevenue || 0) },
  ];

  return (
    <Card className="border-slate-800/70 bg-slate-950/85">
      <div className="flex flex-col gap-4 border-b border-slate-800/70 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-300">Sales</p>
          <h3 className="mt-1 text-lg font-semibold text-white">Event reporting and financials</h3>
          <p className="mt-2 text-sm text-slate-400">Sales, refunds, and attendance at a glance.</p>
        </div>
        <Button variant="secondary" size="sm" onClick={loadSummary} isLoading={isLoading}><RefreshCw className="h-4 w-4" />Refresh</Button>
      </div>

      <div className="mt-5 space-y-5">
        {error ? <ErrorState title="Financials unavailable" message={error} onRetry={loadSummary} /> : null}
        {!error && !summary && !isLoading ? <EmptyState title="No sales data yet" message="Financial data appears after ticket sales are recorded." /> : null}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => <StatCard key={card.label} icon={Banknote} label={card.label} value={card.value} loading={isLoading && !summary} />)}
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          <form onSubmit={submitRefund} className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
            <h4 className="font-semibold text-white">Refund by order reference</h4>
            <Input label="Order reference" value={refundForm.orderReference} onChange={(event) => setRefundForm((current) => ({ ...current, orderReference: event.target.value }))} />
            <Input label="Amount" type="number" min="1" value={refundForm.amount} onChange={(event) => setRefundForm((current) => ({ ...current, amount: event.target.value }))} />
            <Input label="Reason" value={refundForm.reason} onChange={(event) => setRefundForm((current) => ({ ...current, reason: event.target.value }))} />
            <Button type="submit" isLoading={isSubmittingRefund} loadingText="Submitting...">Submit refund</Button>
          </form>

          <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
            <h4 className="font-semibold text-white">Organization withdrawals</h4>
            <p className="text-sm leading-6 text-slate-400">
              Configure the verified payout account, review the organization balance, and submit requests from Finance.
            </p>
            <Button as={Link} to={ROUTE_PATHS.ORGANIZATION_FINANCE}>
              <ArrowUpRight className="h-4 w-4" />
              Open Finance
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default EventFinancialPanel;
