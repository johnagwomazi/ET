import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Banknote, RefreshCw } from "lucide-react";
import Button from "../ui/Button";
import Card from "../ui/Card";
import Input from "../ui/Input";
import EmptyState from "../common/EmptyState";
import ErrorState from "../common/ErrorState";
import StatCard from "../dashboard/StatCard";
import { formatMoney, formatNumber } from "../../utils/formatters";
import * as ticketingService from "../../services/ticketing.service";

function EventFinancialPanel({ event, canView = false }) {
  const eventId = event?._id || event?.id;
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [refundForm, setRefundForm] = useState({ orderReference: "", amount: "", reason: "" });
  const [withdrawalAmount, setWithdrawalAmount] = useState("");
  const [withdrawalHistory, setWithdrawalHistory] = useState([]);
  const [withdrawalBalance, setWithdrawalBalance] = useState(null);
  const [isSubmittingRefund, setIsSubmittingRefund] = useState(false);
  const [isSubmittingWithdrawal, setIsSubmittingWithdrawal] = useState(false);

  async function loadSummary() {
    if (!eventId || !canView) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [response, withdrawalResponse] = await Promise.all([
        ticketingService.getOrganizationEventFinancialSummary(eventId),
        ticketingService.getOrganizationWithdrawals({ page: 1, limit: 5 }),
      ]);
      setSummary(response?.summary || null);
      setWithdrawalHistory(withdrawalResponse?.withdrawals || []);
      setWithdrawalBalance(withdrawalResponse?.balance || null);
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

  async function submitWithdrawal(event) {
    event.preventDefault();
    setIsSubmittingWithdrawal(true);

    try {
      await ticketingService.requestWithdrawal({ amount: Number(withdrawalAmount) });
      toast.success("Withdrawal requested");
      setWithdrawalAmount("");
      await loadSummary();
    } catch (withdrawalError) {
      toast.error(withdrawalError.message || "Withdrawal request failed");
    } finally {
      setIsSubmittingWithdrawal(false);
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
    { label: "Available balance", value: formatMoney(withdrawalBalance?.availableBalance || 0) },
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
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
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

          <form onSubmit={submitWithdrawal} className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
            <h4 className="font-semibold text-white">Request withdrawal</h4>
            <Input label="Amount" type="number" min="1" value={withdrawalAmount} onChange={(event) => setWithdrawalAmount(event.target.value)} />
            <p className="text-sm leading-6 text-slate-400">Super Admin review is required before any Paystack transfer can be executed.</p>
            <Button type="submit" isLoading={isSubmittingWithdrawal} loadingText="Requesting...">Request withdrawal</Button>
          </form>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <h4 className="font-semibold text-white">Recent withdrawals</h4>
          <div className="mt-4 space-y-3">
            {withdrawalHistory.length > 0 ? (
              withdrawalHistory.map((withdrawal) => (
                <div key={withdrawal.id} className="flex flex-col gap-2 rounded-2xl border border-slate-800 bg-slate-950/70 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">{withdrawal.reference}</p>
                    <p className="text-sm text-slate-400">{formatMoney(withdrawal.amount, withdrawal.currency)}</p>
                  </div>
                  <span className="text-xs uppercase tracking-[0.16em] text-slate-500">{withdrawal.status}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-400">No withdrawal requests yet.</p>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

export default EventFinancialPanel;
