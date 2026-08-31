import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Modal from "../../components/ui/Modal";
import EmptyState from "../../components/common/EmptyState";
import ErrorState from "../../components/common/ErrorState";
import SectionHeader from "../../components/dashboard/SectionHeader";
import StatusBadge from "../../components/dashboard/StatusBadge";
import Pagination from "../../components/dashboard/Pagination";
import { Skeleton } from "../../components/common/Skeleton";
import { formatDateTime, formatMoney } from "../../utils/formatters";
import * as ticketingService from "../../services/ticketing.service";

const PAGE_LIMIT = 10;

function WithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState(null);
  const [action, setAction] = useState(null);
  const [form, setForm] = useState({ recipientCode: "", reason: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function loadWithdrawals(nextPage = page, nextStatus = status) {
    setIsLoading(true);
    setError(null);

    try {
      const response = await ticketingService.getPlatformWithdrawals({
        page: nextPage,
        limit: PAGE_LIMIT,
        status: nextStatus || undefined,
      });
      setWithdrawals(response?.withdrawals || []);
      setPagination(response?.pagination || null);
    } catch (loadError) {
      setError(loadError.message || "Unable to load withdrawals");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadWithdrawals(page, status);
  }, [page, status]);

  function openAction(withdrawal, nextAction) {
    setSelectedWithdrawal(withdrawal);
    setAction(nextAction);
    setForm({ recipientCode: "", reason: "" });
  }

  async function submitAction(event) {
    event.preventDefault();

    if (!selectedWithdrawal || !action) {
      return;
    }

    setIsSubmitting(true);

    try {
      if (action === "approve") {
        await ticketingService.approveWithdrawal(selectedWithdrawal.id, {
          recipientCode: form.recipientCode || undefined,
          reason: form.reason || undefined,
        });
        toast.success("Withdrawal approved");
      } else {
        await ticketingService.rejectWithdrawal(selectedWithdrawal.id, {
          reason: form.reason,
        });
        toast.success("Withdrawal rejected");
      }

      setSelectedWithdrawal(null);
      setAction(null);
      await loadWithdrawals(page, status);
    } catch (submitError) {
      toast.error(submitError.message || "Unable to review withdrawal");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Platform finance"
        title="Withdrawals"
        description="Review organization withdrawal requests and record Paystack transfer outcomes."
        actions={[{ label: "Refresh", variant: "secondary", onClick: () => loadWithdrawals(page, status), isLoading }]}
      />

      <Card className="border-slate-800/70 bg-slate-950/85">
        <label className="block max-w-sm space-y-2">
          <span className="text-sm font-medium text-slate-200">Status filter</span>
          <select
            value={status}
            onChange={(event) => {
              setPage(1);
              setStatus(event.target.value);
            }}
            className="h-11 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 text-sm text-slate-100 outline-none focus:border-app-500 focus:ring-2 focus:ring-app-500/20"
          >
            <option value="">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="PAID">Paid</option>
            <option value="FAILED">Failed</option>
          </select>
        </label>
      </Card>

      {error ? <ErrorState title="Withdrawals unavailable" message={error} onRetry={() => loadWithdrawals(page, status)} /> : null}

      {isLoading && withdrawals.length === 0 ? (
        <div className="grid gap-3">
          {Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-28 rounded-2xl" />)}
        </div>
      ) : withdrawals.length > 0 ? (
        <div className="grid gap-3">
          {withdrawals.map((withdrawal) => (
            <Card key={withdrawal.id} className="border-slate-800/70 bg-slate-950/85">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-white">{withdrawal.reference}</p>
                    <StatusBadge status={withdrawal.status} />
                  </div>
                  <p className="text-sm text-slate-400">
                    {formatMoney(withdrawal.amount, withdrawal.currency)} | Requested {formatDateTime(withdrawal.createdAt)}
                  </p>
                  {withdrawal.transferReference ? <p className="text-xs text-slate-500">Transfer: {withdrawal.transferReference}</p> : null}
                </div>
                {withdrawal.status === "PENDING" ? (
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => openAction(withdrawal, "approve")}>Approve</Button>
                    <Button size="sm" variant="danger" onClick={() => openAction(withdrawal, "reject")}>Reject</Button>
                  </div>
                ) : null}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState title="No withdrawals found" message="Withdrawal requests will appear here for Super Admin review." />
      )}

      {pagination?.totalPages > 1 ? (
        <Pagination page={pagination.page} totalPages={pagination.totalPages} totalItems={pagination.totalItems} onPageChange={setPage} />
      ) : null}

      <Modal open={Boolean(action)} title={action === "approve" ? "Approve withdrawal" : "Reject withdrawal"} onClose={() => setAction(null)} className="max-w-lg">
        <form className="space-y-4" onSubmit={submitAction}>
          {action === "approve" ? (
            <Input
              label="Paystack recipient code"
              value={form.recipientCode}
              onChange={(event) => setForm((current) => ({ ...current, recipientCode: event.target.value }))}
              helperText="Optional. If omitted, the withdrawal is approved without executing a transfer."
            />
          ) : null}
          <Input
            label={action === "approve" ? "Transfer note" : "Rejection reason"}
            value={form.reason}
            onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))}
          />
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setAction(null)} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" variant={action === "reject" ? "danger" : "primary"} isLoading={isSubmitting} loadingText="Submitting...">
              {action === "approve" ? "Approve" : "Reject"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default WithdrawalsPage;
