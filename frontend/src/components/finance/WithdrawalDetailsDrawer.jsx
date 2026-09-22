import { AlertCircle, Building2, CalendarClock, CreditCard, UserRound } from "lucide-react";
import DashboardDrawer from "../layout/DashboardDrawer";
import StatusBadge from "../dashboard/StatusBadge";
import { Skeleton, SkeletonText } from "../common/Skeleton";
import { TRANSFER_STATUS_META, WITHDRAWAL_STATUS_META } from "../../constants/finance.constants";
import { formatDateTime, formatMoney } from "../../utils/formatters";

function DetailRow({ label, value, icon: Icon }) {
  return (
    <div className="flex items-start gap-3 border-b border-slate-800/70 py-3 last:border-0">
      {Icon ? <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" /> : null}
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
        <div className="mt-1 break-words text-sm text-slate-200">{value || "Not available"}</div>
      </div>
    </div>
  );
}

function DrawerSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true">
      <Skeleton className="h-24 w-full" />
      {Array.from({ length: 6 }).map((_, index) => <SkeletonText key={index} className="h-12 w-full" />)}
    </div>
  );
}

function WithdrawalDetailsDrawer({ open, data, isLoading = false, error, onClose, footer }) {
  const withdrawal = data?.withdrawal || data;
  const payout = withdrawal?.payoutDestination;
  const statusMeta = WITHDRAWAL_STATUS_META[withdrawal?.status];
  const requester = withdrawal?.requester;
  const reviewer = withdrawal?.reviewer;

  return (
    <DashboardDrawer
      open={open}
      title="Withdrawal details"
      subtitle={withdrawal?.reference || "Loading request information"}
      onClose={onClose}
      widthClass="max-w-lg"
      footer={footer}
    >
      {isLoading ? <DrawerSkeleton /> : null}
      {!isLoading && error ? (
        <div className="border border-rose-500/25 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</div>
      ) : null}
      {!isLoading && !error && withdrawal ? (
        <div className="space-y-6">
          <section className="min-w-0 border border-slate-800 bg-slate-950/70 p-3 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Amount</p>
                <p className="mt-2 [overflow-wrap:anywhere] text-xl font-semibold text-white sm:text-3xl">{formatMoney(withdrawal.amount, withdrawal.currency)}</p>
              </div>
              <StatusBadge status={withdrawal.status} label={statusMeta?.label} tone={statusMeta?.tone} />
            </div>
            <p className="mt-4 text-sm text-slate-400">{statusMeta?.description}</p>
          </section>

          <section>
            {withdrawal.organizationDetails?.name ? <DetailRow label="Organization" value={withdrawal.organizationDetails.name} icon={Building2} /> : null}
            <DetailRow label="Requested" value={formatDateTime(withdrawal.requestedAt || withdrawal.createdAt)} icon={CalendarClock} />
            {requester ? <DetailRow label="Requested by" value={`${requester.firstName} ${requester.lastName}`.trim() || requester.email} icon={UserRound} /> : null}
            {withdrawal.reviewedAt ? <DetailRow label="Reviewed" value={formatDateTime(withdrawal.reviewedAt)} icon={CalendarClock} /> : null}
            {reviewer ? <DetailRow label="Reviewed by" value={`${reviewer.firstName} ${reviewer.lastName}`.trim() || reviewer.email} icon={UserRound} /> : null}
            {withdrawal.completedAt ? <DetailRow label="Completed" value={formatDateTime(withdrawal.completedAt)} icon={CalendarClock} /> : null}
            {withdrawal.transferStatus && withdrawal.transferStatus !== "NOT_STARTED" ? (
              <DetailRow
                label="Transfer status"
                value={(
                  <StatusBadge
                    status={withdrawal.transferStatus}
                    label={TRANSFER_STATUS_META[withdrawal.transferStatus]?.label}
                    tone={TRANSFER_STATUS_META[withdrawal.transferStatus]?.tone}
                  />
                )}
                icon={CreditCard}
              />
            ) : null}
          </section>

          {payout?.accountNumberMasked || payout?.accountNumberLast4 ? (
            <section className="border border-slate-800 bg-slate-950/50 p-4">
              <h4 className="text-sm font-semibold text-white">Payout destination</h4>
              <p className="mt-2 text-sm text-slate-300">{payout.accountName || "Verified account"}</p>
              <p className="mt-1 text-sm text-slate-500">
                {payout.bankName || "Bank"} | {payout.accountNumberMasked || `******${payout.accountNumberLast4}`}
              </p>
            </section>
          ) : null}

          {(withdrawal.rejectionReason || withdrawal.failureReason) ? (
            <section className="flex gap-3 border border-rose-500/25 bg-rose-500/10 p-4 text-rose-100">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <h4 className="text-sm font-semibold">{withdrawal.rejectionReason ? "Rejection reason" : "Transfer issue"}</h4>
                <p className="mt-1 text-sm leading-6 text-rose-200">{withdrawal.rejectionReason || withdrawal.failureReason}</p>
              </div>
            </section>
          ) : null}

          {data?.financialSummary ? (
            <section className="border-t border-slate-800 pt-5">
              <h4 className="text-sm font-semibold text-white">Current financial context</h4>
              <div className="mt-3 grid min-w-0 grid-cols-2 gap-2 sm:gap-3">
                <div className="border border-slate-800 bg-slate-950/50 p-3">
                  <p className="text-xs text-slate-500">Available</p>
                  <p className="mt-1 [overflow-wrap:anywhere] text-sm font-semibold text-white sm:text-base">{formatMoney(data.financialSummary.availableBalance, data.financialSummary.currency)}</p>
                </div>
                <div className="border border-slate-800 bg-slate-950/50 p-3">
                  <p className="text-xs text-slate-500">Net revenue</p>
                  <p className="mt-1 [overflow-wrap:anywhere] text-sm font-semibold text-white sm:text-base">{formatMoney(data.financialSummary.netRevenue, data.financialSummary.currency)}</p>
                </div>
              </div>
            </section>
          ) : null}
        </div>
      ) : null}
    </DashboardDrawer>
  );
}

export default WithdrawalDetailsDrawer;
