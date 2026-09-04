import {
  Banknote,
  Building2,
  CalendarDays,
  CircleDollarSign,
  RotateCcw,
  ScanLine,
  Ticket,
  TicketCheck,
} from "lucide-react";
import StatCard from "../dashboard/StatCard";
import Card from "../ui/Card";
import { formatMoney, formatNumber, formatPercentage } from "../../utils/formatters";

function AnalyticsSummary({ summary = {}, loading = false, grossLabel = "Gross sales", hideEvents = false, showRemaining = false, showOrganizations = false }) {
  const currency = summary.currency || "NGN";
  const cards = [
    {
      label: grossLabel,
      value: formatMoney(summary.grossSales || 0, currency),
      helperText: `${formatNumber(summary.successfulOrders || 0)} successful orders`,
      icon: Banknote,
      iconClassName: "bg-emerald-500/10 text-emerald-300 ring-emerald-500/20",
    },
    {
      label: "Net revenue",
      value: formatMoney(summary.netRevenue || 0, currency),
      helperText: "After successful refunds",
      icon: CircleDollarSign,
      iconClassName: "bg-emerald-500/10 text-emerald-300 ring-emerald-500/20",
    },
    {
      label: "Refunds",
      value: formatMoney(summary.refunds || 0, currency),
      helperText: `${formatNumber(summary.successfulRefunds || 0)} completed refunds`,
      icon: RotateCcw,
      iconClassName: "bg-amber-500/10 text-amber-300 ring-amber-500/20",
    },
    {
      label: "Tickets sold",
      value: formatNumber(summary.ticketsSold || 0),
      helperText: `${formatPercentage(summary.salesRate || 0)} sales rate`,
      icon: Ticket,
    },
    {
      label: "Events",
      value: formatNumber(summary.events || 0),
      helperText: "Scheduled in this range",
      icon: CalendarDays,
    },
    {
      label: "Attendance",
      value: formatNumber(summary.attendance || 0),
      helperText: `${formatPercentage(summary.attendanceRate || 0)} ticket attendance rate`,
      icon: ScanLine,
      iconClassName: "bg-cyan-500/10 text-cyan-300 ring-cyan-500/20",
    },
  ];

  if (hideEvents) cards.splice(4, 1);
  if (showRemaining) {
    cards.push({ label: "Tickets remaining", value: formatNumber(summary.ticketsRemaining || 0), helperText: `${formatNumber(summary.sellableInventory || 0)} total inventory`, icon: TicketCheck });
  }
  if (showOrganizations) {
    cards.push({ label: "Organizations", value: formatNumber(summary.organizations || 0), helperText: "Platform organizations", icon: Building2 });
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => <StatCard key={card.label} {...card} loading={loading} />)}
      </div>

      {!loading ? (
        <Card className="border-slate-800/70 bg-slate-950/85 p-4">
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-xs font-semibold uppercase text-slate-500">Ticket-linked check-ins</dt>
              <dd className="mt-1 text-lg font-semibold text-white">{formatNumber(summary.ticketLinkedAttendance || 0)}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-slate-500">Legacy check-ins</dt>
              <dd className="mt-1 text-lg font-semibold text-white">{formatNumber(summary.legacyAttendance || 0)}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-slate-500">Pending payments</dt>
              <dd className="mt-1 text-lg font-semibold text-amber-300">{formatNumber(summary.pendingPayments || 0)}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-slate-500">Failed payments</dt>
              <dd className="mt-1 text-lg font-semibold text-rose-300">{formatNumber(summary.failedPayments || 0)}</dd>
            </div>
          </dl>
        </Card>
      ) : null}
    </>
  );
}

export default AnalyticsSummary;
