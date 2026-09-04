import { BadgeDollarSign, CircleCheckBig, Clock3, Landmark } from "lucide-react";
import StatCard from "../dashboard/StatCard";
import { formatMoney } from "../../utils/formatters";

function FinanceSummary({ summary = {}, loading = false }) {
  const currency = summary.currency || "NGN";
  const metrics = [
    {
      label: "Available Balance",
      value: formatMoney(summary.availableBalance, currency),
      helperText: "Currently available to request",
      icon: Landmark,
      iconClassName: "bg-app-500/10 text-app-200 ring-app-500/20",
    },
    {
      label: "Net Revenue",
      value: formatMoney(summary.netRevenue, currency),
      helperText: "Sales after successful refunds",
      icon: BadgeDollarSign,
      iconClassName: "bg-emerald-500/10 text-emerald-300 ring-emerald-500/20",
    },
    {
      label: "Pending Withdrawals",
      value: formatMoney(summary.pendingWithdrawals, currency),
      helperText: "Reserved for active requests",
      icon: Clock3,
      iconClassName: "bg-amber-500/10 text-amber-300 ring-amber-500/20",
    },
    {
      label: "Total Withdrawn",
      value: formatMoney(summary.completedWithdrawals, currency),
      helperText: "Provider-confirmed transfers",
      icon: CircleCheckBig,
      iconClassName: "bg-cyan-500/10 text-cyan-300 ring-cyan-500/20",
    },
  ];

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Finance summary">
      {metrics.map((metric) => <StatCard key={metric.label} {...metric} loading={loading} />)}
    </section>
  );
}

export default FinanceSummary;

