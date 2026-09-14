import { useEffect, useState } from "react";
import { ArrowUpRight, BarChart3, Landmark, RefreshCw, Settings2 } from "lucide-react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import ErrorState from "../../components/common/ErrorState";
import FilterSelect from "../../components/dashboard/FilterSelect";
import Pagination from "../../components/dashboard/Pagination";
import StatusBadge from "../../components/dashboard/StatusBadge";
import SectionHeader from "../../components/dashboard/SectionHeader";
import FinancePageSkeleton from "../../components/finance/FinancePageSkeleton";
import FinanceSummary from "../../components/finance/FinanceSummary";
import PayoutDetailsModal from "../../components/finance/PayoutDetailsModal";
import WithdrawalDetailsDrawer from "../../components/finance/WithdrawalDetailsDrawer";
import WithdrawalList from "../../components/finance/WithdrawalList";
import WithdrawalRequestModal from "../../components/finance/WithdrawalRequestModal";
import { FINANCE_PAGE_SIZE, WITHDRAWAL_STATUS_OPTIONS } from "../../constants/finance.constants";
import { ROUTE_PATHS } from "../../routes/routePaths";
import * as financeService from "../../services/finance.service";

const EMPTY_PAGINATION = { page: 1, limit: FINANCE_PAGE_SIZE, totalItems: 0, totalPages: 0 };

function OrganizationFinancePage() {
  const [summary, setSummary] = useState(null);
  const [withdrawals, setWithdrawals] = useState([]);
  const [pagination, setPagination] = useState(EMPTY_PAGINATION);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedWithdrawal, setSelectedWithdrawal] = useState(null);
  const [requestOpen, setRequestOpen] = useState(false);
  const [payoutOpen, setPayoutOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError("");

    Promise.all([
      financeService.getOrganizationFinanceSummary({ signal: controller.signal }),
      financeService.getOrganizationWithdrawals(
        { page, limit: FINANCE_PAGE_SIZE, status: status || undefined },
        { signal: controller.signal }
      ),
    ])
      .then(([summaryResponse, historyResponse]) => {
        setSummary(summaryResponse);
        setWithdrawals(historyResponse?.withdrawals || []);
        setPagination(historyResponse?.pagination || EMPTY_PAGINATION);
      })
      .catch((loadError) => {
        if (loadError.name !== "AbortError") setError(loadError.message || "Finance information could not be loaded");
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [page, refreshKey, status]);

  function refresh() {
    setRefreshKey((value) => value + 1);
  }

  async function submitWithdrawal(payload) {
    setIsSubmitting(true);
    setSubmissionError("");
    try {
      const response = await financeService.requestOrganizationWithdrawal(payload);
      setRequestOpen(false);
      toast.success(`Withdrawal ${response?.withdrawal?.reference || "request"} submitted for review`);
      setPage(1);
      refresh();
    } catch (requestError) {
      setSubmissionError(requestError.message || "Unable to submit withdrawal request");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitPayoutDetails(payload) {
    setIsSubmitting(true);
    setSubmissionError("");
    try {
      const response = await financeService.updateOrganizationPayoutDetails(payload);
      setSummary((current) => ({ ...current, payoutDestination: response.payoutDestination }));
      setPayoutOpen(false);
      toast.success("Payout account verified successfully");
      refresh();
    } catch (payoutError) {
      setSubmissionError(payoutError.message || "Unable to verify payout account");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading && !summary) return <FinancePageSkeleton />;
  if (error && !summary) return <ErrorState title="Finance unavailable" message={error} onRetry={refresh} />;

  const payout = summary?.payoutDestination || {};
  const canRequest = payout.configured && Number(summary?.availableBalance || 0) > 0;

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Organization finance"
        title="Finance and withdrawals"
        description="Review withdrawable revenue, submit payout requests, and track every request through completion."
        actions={[
          { label: "Analytics", icon: BarChart3, as: Link, to: ROUTE_PATHS.ORGANIZATION_ANALYTICS, variant: "ghost" },
          { label: "Refresh", icon: RefreshCw, onClick: refresh, isLoading, loadingText: "Refreshing..." },
          {
            label: "Request Withdrawal",
            icon: ArrowUpRight,
            variant: "primary",
            onClick: () => {
              setSubmissionError("");
              setRequestOpen(true);
            },
            disabled: !canRequest,
          },
        ]}
      />

      {error ? <Card className="border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-200">The latest refresh failed. Previously loaded finance information remains visible.</Card> : null}

      <FinanceSummary summary={summary || {}} loading={isLoading} />

      {Number(summary?.balanceDeficit || 0) > 0 ? (
        <Card className="border-rose-500/25 bg-rose-500/10 p-4 text-sm leading-6 text-rose-100">
          Refunds have reduced current revenue below existing withdrawal commitments. New withdrawal requests are unavailable until the balance recovers.
        </Card>
      ) : null}

      <section className="border-y border-slate-800 py-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Landmark className="mt-0.5 h-5 w-5 text-app-300" />
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="font-semibold text-white">Payout account</h3>
                {payout.configured ? <StatusBadge status="VERIFIED" label="Verified" tone="success" /> : null}
              </div>
              {payout.configured ? (
                <p className="mt-1 text-sm text-slate-400">
                  {payout.accountName} | {payout.bankName || "Verified bank"} | {payout.accountNumberMasked}
                </p>
              ) : (
                <p className="mt-1 text-sm text-amber-200">Configure and verify a bank account before requesting a withdrawal.</p>
              )}
            </div>
          </div>
          <Button
            variant="secondary"
            onClick={() => {
              setSubmissionError("");
              setPayoutOpen(true);
            }}
          >
            <Settings2 className="h-4 w-4" />
            {payout.configured ? "Change bank account" : "Add bank account"}
          </Button>
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeader
          eyebrow="Withdrawal history"
          title="Requests and transfers"
          description="Pending requests reserve balance immediately. Completion is shown once the bank transfer is confirmed."
        />
        <div className="max-w-xs">
          <FilterSelect
            label="Status"
            value={status}
            options={WITHDRAWAL_STATUS_OPTIONS}
            onChange={(event) => {
              setPage(1);
              setStatus(event.target.value);
            }}
          />
        </div>
        <WithdrawalList
          withdrawals={withdrawals}
          isLoading={isLoading && withdrawals.length === 0}
          onView={setSelectedWithdrawal}
          emptyMessage="No withdrawal requests yet."
        />
        {pagination.totalPages > 1 ? (
          <Pagination {...pagination} onPageChange={setPage} />
        ) : null}
      </section>

      <WithdrawalRequestModal
        open={requestOpen}
        summary={summary || {}}
        isSubmitting={isSubmitting}
        submissionError={submissionError}
        onClose={() => setRequestOpen(false)}
        onSubmit={submitWithdrawal}
      />
      <PayoutDetailsModal
        open={payoutOpen}
        isSubmitting={isSubmitting}
        submissionError={submissionError}
        onClose={() => setPayoutOpen(false)}
        onSubmit={submitPayoutDetails}
        onChange={() => setSubmissionError("")}
      />
      <WithdrawalDetailsDrawer
        open={Boolean(selectedWithdrawal)}
        data={selectedWithdrawal}
        onClose={() => setSelectedWithdrawal(null)}
      />
    </div>
  );
}

export default OrganizationFinancePage;

