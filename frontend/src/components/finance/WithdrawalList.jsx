import { Eye } from "lucide-react";
import Button from "../ui/Button";
import Card from "../ui/Card";
import DataTable from "../dashboard/DataTable";
import StatusBadge from "../dashboard/StatusBadge";
import { WITHDRAWAL_STATUS_META } from "../../constants/finance.constants";
import { formatDateTime, formatMoney } from "../../utils/formatters";

function getOrganizationName(withdrawal) {
  return withdrawal.organizationDetails?.name || "Organization unavailable";
}

function getRequesterName(withdrawal) {
  const requester = withdrawal.requester;
  if (!requester) return "Requester unavailable";
  return `${requester.firstName || ""} ${requester.lastName || ""}`.trim() || requester.email || "Requester unavailable";
}

function EmptyWithdrawalList({ message }) {
  return (
    <div className="py-3 text-center">
      <p className="font-semibold text-slate-200">No withdrawal requests found</p>
      <p className="mt-1 text-sm text-slate-500">{message}</p>
    </div>
  );
}

function WithdrawalList({ withdrawals = [], isLoading = false, showOrganization = false, onView, emptyMessage }) {
  const columns = [
    ...(showOrganization ? [{
      key: "organization",
      label: "Organization",
      render: (withdrawal) => <span className="font-medium text-white">{getOrganizationName(withdrawal)}</span>,
    }, {
      key: "requester",
      label: "Requested by",
      render: (withdrawal) => <span className="text-slate-300">{getRequesterName(withdrawal)}</span>,
    }] : []),
    {
      key: "reference",
      label: "Reference",
      render: (withdrawal) => <span className="font-mono text-xs text-slate-300">{withdrawal.reference}</span>,
    },
    {
      key: "amount",
      label: "Amount",
      render: (withdrawal) => <span className="font-semibold text-white">{formatMoney(withdrawal.amount, withdrawal.currency)}</span>,
    },
    {
      key: "status",
      label: "Status",
      render: (withdrawal) => (
        <StatusBadge
          status={withdrawal.status}
          label={WITHDRAWAL_STATUS_META[withdrawal.status]?.label}
          tone={WITHDRAWAL_STATUS_META[withdrawal.status]?.tone}
        />
      ),
    },
    {
      key: "requestedAt",
      label: "Requested",
      render: (withdrawal) => formatDateTime(withdrawal.requestedAt || withdrawal.createdAt),
    },
    {
      key: "actions",
      label: "",
      render: (withdrawal) => (
        <Button size="sm" variant="ghost" onClick={() => onView(withdrawal)} aria-label={`View withdrawal ${withdrawal.reference}`}>
          <Eye className="h-4 w-4" />
          View
        </Button>
      ),
    },
  ];

  const emptyState = <EmptyWithdrawalList message={emptyMessage || "Withdrawal requests will appear here."} />;

  return (
    <>
      <div className="hidden md:block">
        <DataTable columns={columns} data={withdrawals} rowKey="id" isLoading={isLoading} emptyState={emptyState} />
      </div>

      <div className="grid gap-3 md:hidden">
        {isLoading ? Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-48 animate-pulse border border-slate-800 bg-slate-900/85" />
        )) : null}
        {!isLoading && !withdrawals.length ? <Card className="p-5">{emptyState}</Card> : null}
        {!isLoading ? withdrawals.map((withdrawal) => (
          <Card key={withdrawal.id} className="border-slate-800/70 bg-slate-950/85 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                {showOrganization ? <p className="truncate font-semibold text-white">{getOrganizationName(withdrawal)}</p> : null}
                {showOrganization ? <p className="mt-1 truncate text-xs text-slate-400">{getRequesterName(withdrawal)}</p> : null}
                <p className="mt-1 truncate font-mono text-xs text-slate-500">{withdrawal.reference}</p>
              </div>
              <StatusBadge
                status={withdrawal.status}
                label={WITHDRAWAL_STATUS_META[withdrawal.status]?.label}
                tone={WITHDRAWAL_STATUS_META[withdrawal.status]?.tone}
              />
            </div>
            <p className="mt-5 text-2xl font-semibold text-white">{formatMoney(withdrawal.amount, withdrawal.currency)}</p>
            <p className="mt-1 text-sm text-slate-500">{formatDateTime(withdrawal.requestedAt || withdrawal.createdAt)}</p>
            {(withdrawal.rejectionReason || withdrawal.failureReason) ? (
              <p className="mt-3 line-clamp-2 text-sm text-rose-300">{withdrawal.rejectionReason || withdrawal.failureReason}</p>
            ) : (
              <p className="mt-3 text-sm text-slate-400">{WITHDRAWAL_STATUS_META[withdrawal.status]?.description}</p>
            )}
            <Button className="mt-4 w-full" variant="secondary" onClick={() => onView(withdrawal)}>
              <Eye className="h-4 w-4" />
              View details
            </Button>
          </Card>
        )) : null}
      </div>
    </>
  );
}

export default WithdrawalList;
