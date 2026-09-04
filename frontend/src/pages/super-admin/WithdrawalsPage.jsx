import { useEffect, useRef, useState } from "react";
import { Check, RefreshCw, RotateCcw, X } from "lucide-react";
import toast from "react-hot-toast";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import ErrorState from "../../components/common/ErrorState";
import ConfirmationDialog from "../../components/dashboard/ConfirmationDialog";
import FilterSelect from "../../components/dashboard/FilterSelect";
import Pagination from "../../components/dashboard/Pagination";
import SectionHeader from "../../components/dashboard/SectionHeader";
import FinancePageSkeleton from "../../components/finance/FinancePageSkeleton";
import WithdrawalDetailsDrawer from "../../components/finance/WithdrawalDetailsDrawer";
import WithdrawalList from "../../components/finance/WithdrawalList";
import {
  FINANCE_PAGE_SIZE,
  WITHDRAWAL_STATUS,
  WITHDRAWAL_STATUS_META,
  WITHDRAWAL_STATUS_OPTIONS,
} from "../../constants/finance.constants";
import { formatMoney } from "../../utils/formatters";
import * as financeService from "../../services/finance.service";
import * as organizationService from "../../services/organization.service";

const EMPTY_PAGINATION = { page: 1, limit: FINANCE_PAGE_SIZE, totalItems: 0, totalPages: 0 };

function WithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState([]);
  const [pagination, setPagination] = useState(EMPTY_PAGINATION);
  const [organizations, setOrganizations] = useState([]);
  const [filters, setFilters] = useState({ status: "", organizationId: "", startDate: "", endDate: "" });
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [details, setDetails] = useState(null);
  const [detailError, setDetailError] = useState("");
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [action, setAction] = useState(null);
  const [isMutating, setIsMutating] = useState(false);
  const detailControllerRef = useRef(null);
  const dateRangeError = filters.startDate && filters.endDate && filters.startDate > filters.endDate
    ? "Start date must be before or equal to end date"
    : "";

  useEffect(() => {
    if (dateRangeError) {
      setIsLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    organizationService.getOrganizations(
      { page: 1, limit: 1000, sortBy: "organizationName", sortOrder: "asc" },
      { signal: controller.signal }
    )
      .then((response) => setOrganizations(response?.organizations || []))
      .catch((loadError) => {
        if (loadError.name !== "AbortError") setOrganizations([]);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError("");
    financeService.getPlatformWithdrawals(
      {
        page,
        limit: FINANCE_PAGE_SIZE,
        status: filters.status || undefined,
        organizationId: filters.organizationId || undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
      },
      { signal: controller.signal }
    )
      .then((response) => {
        setWithdrawals(response?.withdrawals || []);
        setPagination(response?.pagination || EMPTY_PAGINATION);
      })
      .catch((loadError) => {
        if (loadError.name !== "AbortError") setError(loadError.message || "Withdrawals could not be loaded");
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });
    return () => controller.abort();
  }, [dateRangeError, filters.endDate, filters.organizationId, filters.startDate, filters.status, page, refreshKey]);

  function updateFilter(key, value) {
    setPage(1);
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function refresh() {
    setRefreshKey((value) => value + 1);
  }

  async function openDetails(withdrawal) {
    detailControllerRef.current?.abort();
    const controller = new AbortController();
    detailControllerRef.current = controller;
    setDrawerOpen(true);
    setDetails({ withdrawal });
    setDetailError("");
    setIsDetailLoading(true);
    try {
      const response = await financeService.getPlatformWithdrawalDetails(withdrawal.id, { signal: controller.signal });
      setDetails(response);
    } catch (loadError) {
      if (loadError.name !== "AbortError") setDetailError(loadError.message || "Withdrawal details could not be loaded");
    } finally {
      if (!controller.signal.aborted) setIsDetailLoading(false);
    }
  }

  function closeDetails() {
    detailControllerRef.current?.abort();
    setDrawerOpen(false);
    setAction(null);
  }

  function openAction(type) {
    setAction({ type, withdrawal: details?.withdrawal });
  }

  async function submitAction(reason) {
    const withdrawal = action?.withdrawal;
    if (!withdrawal) return;
    if (action.type === "reject" && !reason?.trim()) {
      toast.error("A rejection reason is required");
      return;
    }

    setIsMutating(true);
    try {
      let response;
      if (action.type === "approve") {
        response = await financeService.approveWithdrawal(withdrawal.id, {});
      } else {
        response = await financeService.rejectWithdrawal(withdrawal.id, { reason: reason.trim() });
      }
      const nextWithdrawal = response?.withdrawal;
      setDetails((current) => ({ ...(current || {}), withdrawal: nextWithdrawal || withdrawal }));
      setAction(null);
      refresh();
      toast.success(
        action.type === "approve"
          ? `Withdrawal is ${WITHDRAWAL_STATUS_META[nextWithdrawal?.status]?.label?.toLowerCase() || "being processed"}`
          : "Withdrawal rejected"
      );
    } catch (mutationError) {
      toast.error(mutationError.message || "Withdrawal action could not be completed");
    } finally {
      setIsMutating(false);
    }
  }

  async function reconcile() {
    const withdrawal = details?.withdrawal;
    if (!withdrawal) return;
    setIsMutating(true);
    try {
      const response = await financeService.reconcileWithdrawal(withdrawal.id);
      setDetails((current) => ({ ...(current || {}), withdrawal: response?.withdrawal || withdrawal }));
      refresh();
      toast.success(`Transfer status refreshed: ${WITHDRAWAL_STATUS_META[response?.withdrawal?.status]?.label || "updated"}`);
    } catch (reconcileError) {
      toast.error(reconcileError.message || "Transfer status could not be refreshed");
    } finally {
      setIsMutating(false);
    }
  }

  if (isLoading && !withdrawals.length && !error) return <FinancePageSkeleton />;
  if (error && !withdrawals.length) return <ErrorState title="Withdrawals unavailable" message={error} onRetry={refresh} />;

  const activeWithdrawal = details?.withdrawal;
  const drawerFooter = activeWithdrawal ? (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      {activeWithdrawal.status === WITHDRAWAL_STATUS.PENDING ? (
        <>
          <Button variant="danger" onClick={() => openAction("reject")} disabled={isMutating || isDetailLoading}>
            <X className="h-4 w-4" />
            Reject
          </Button>
          <Button onClick={() => openAction("approve")} disabled={isMutating || isDetailLoading}>
            <Check className="h-4 w-4" />
            Approve Withdrawal
          </Button>
        </>
      ) : null}
      {activeWithdrawal.status === WITHDRAWAL_STATUS.PROCESSING ? (
        <Button onClick={reconcile} isLoading={isMutating} loadingText="Checking...">
          <RotateCcw className="h-4 w-4" />
          Refresh Status
        </Button>
      ) : null}
    </div>
  ) : null;

  const organizationOptions = [
    { value: "", label: "All organizations" },
    ...organizations.map((organization) => ({
      value: organization._id,
      label: organization.organizationName || "Unnamed organization",
    })),
  ];

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Platform finance"
        title="Withdrawal review"
        description="Inspect organization requests, approve or reject pending withdrawals, and verify processing transfers."
        actions={[{ label: "Refresh", icon: RefreshCw, onClick: refresh, isLoading, loadingText: "Refreshing..." }]}
      />

      {error ? <Card className="border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-200">The latest refresh failed. Previously loaded withdrawals remain visible.</Card> : null}

      <section className="grid gap-4 border-y border-slate-800 py-5 sm:grid-cols-2 xl:grid-cols-4">
        <FilterSelect
          label="Status"
          value={filters.status}
          options={WITHDRAWAL_STATUS_OPTIONS}
          onChange={(event) => updateFilter("status", event.target.value)}
        />
        <FilterSelect
          label="Organization"
          value={filters.organizationId}
          options={organizationOptions}
          onChange={(event) => updateFilter("organizationId", event.target.value)}
        />
        <Input label="From" type="date" max={filters.endDate || undefined} value={filters.startDate} onChange={(event) => updateFilter("startDate", event.target.value)} error={dateRangeError} />
        <Input label="To" type="date" min={filters.startDate || undefined} value={filters.endDate} onChange={(event) => updateFilter("endDate", event.target.value)} />
      </section>

      <WithdrawalList
        withdrawals={withdrawals}
        isLoading={isLoading && !withdrawals.length}
        showOrganization
        onView={openDetails}
        emptyMessage="No withdrawal requests match the selected filters."
      />
      {pagination.totalPages > 1 ? <Pagination {...pagination} onPageChange={setPage} /> : null}

      <WithdrawalDetailsDrawer
        open={drawerOpen}
        data={details}
        isLoading={isDetailLoading}
        error={detailError}
        onClose={closeDetails}
        footer={drawerFooter}
      />

      <ConfirmationDialog
        open={action?.type === "approve"}
        title="Approve withdrawal"
        message={action?.withdrawal ? `Approve ${formatMoney(action.withdrawal.amount, action.withdrawal.currency)} for ${action.withdrawal.organizationDetails?.name || "this organization"}? The backend will initiate the Paystack transfer and return its authoritative state.` : ""}
        confirmText="Approve Withdrawal"
        isLoading={isMutating}
        onCancel={() => setAction(null)}
        onConfirm={submitAction}
      />

      <ConfirmationDialog
        open={action?.type === "reject"}
        title="Reject withdrawal"
        message="The request will remain in history and its reserved balance will be released."
        confirmText="Reject Withdrawal"
        tone="danger"
        requiresReason
        reasonLabel="Rejection reason"
        reasonPlaceholder="Explain why this request cannot be approved"
        isLoading={isMutating}
        onCancel={() => setAction(null)}
        onConfirm={submitAction}
      />
    </div>
  );
}

export default WithdrawalsPage;
