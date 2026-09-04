import { BarChart3 } from "lucide-react";
import Card from "../ui/Card";
import { Skeleton } from "../common/Skeleton";
import { formatCompactMoney, formatDate, formatMoney, formatNumber } from "../../utils/formatters";

function periodLabel(value, period) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (period === "monthly") return new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(date);
  if (period === "weekly") return `Week of ${formatDate(value)}`;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
}

function RevenueTrendChart({ data = [], period = "daily", currency = "NGN", loading = false }) {
  const maximum = Math.max(1, ...data.flatMap((item) => [Number(item.grossSales || 0), Number(item.netRevenue || 0), Number(item.refunds || 0)]));

  return (
    <Card className="border-slate-800/70 bg-slate-950/85 p-5 sm:p-6">
      <div className="flex flex-col gap-3 border-b border-slate-800 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-semibold text-white">Revenue over time</h3>
          <p className="mt-1 text-sm text-slate-400">Gross sales, net revenue, and refunds by {period} interval.</p>
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-slate-400" aria-label="Chart legend">
          <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 bg-app-400" />Gross</span>
          <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 bg-emerald-400" />Net</span>
          <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 bg-amber-400" />Refunds</span>
        </div>
      </div>

      {loading ? (
        <div className="mt-6 flex h-64 items-end gap-3" aria-label="Loading revenue trend">
          {Array.from({ length: 8 }).map((_, index) => <Skeleton key={index} className="h-32 flex-1" />)}
        </div>
      ) : data.length === 0 ? (
        <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-center">
          <BarChart3 className="h-8 w-8 text-slate-500" aria-hidden="true" />
          <div>
            <p className="font-medium text-slate-200">No sales data for this period</p>
            <p className="mt-1 text-sm text-slate-500">Revenue activity will appear after successful ticket orders.</p>
          </div>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto pb-2">
          <div
            className="flex h-72 items-end gap-3"
            style={{ minWidth: `${Math.max(640, data.length * 76)}px` }}
            role="img"
            aria-label={`Revenue trend containing ${data.length} ${period} periods`}
          >
            {data.map((item) => {
              const grossHeight = Math.max(item.grossSales ? 4 : 0, (Number(item.grossSales || 0) / maximum) * 210);
              const netHeight = Math.max(item.netRevenue ? 4 : 0, (Math.max(0, Number(item.netRevenue || 0)) / maximum) * 210);
              const refundHeight = Math.max(item.refunds ? 4 : 0, (Number(item.refunds || 0) / maximum) * 210);
              return (
                <div key={item.periodStart} className="flex h-full min-w-14 flex-1 flex-col justify-end">
                  <div className="group relative flex flex-1 items-end justify-center gap-1 border-b border-slate-700">
                    <div className="w-3 bg-app-400" style={{ height: `${grossHeight}px` }} title={`Gross ${formatMoney(item.grossSales, currency)}`} />
                    <div className="w-3 bg-emerald-400" style={{ height: `${netHeight}px` }} title={`Net ${formatMoney(item.netRevenue, currency)}`} />
                    <div className="w-3 bg-amber-400" style={{ height: `${refundHeight}px` }} title={`Refunds ${formatMoney(item.refunds, currency)}`} />
                    <div className="pointer-events-none absolute bottom-full z-10 mb-2 hidden w-40 border border-slate-700 bg-slate-900 p-3 text-xs shadow-soft group-hover:block group-focus-within:block">
                      <p className="font-semibold text-white">{periodLabel(item.periodStart, period)}</p>
                      <p className="mt-1 text-slate-300">Gross: {formatCompactMoney(item.grossSales, currency)}</p>
                      <p className="text-slate-300">Net: {formatCompactMoney(item.netRevenue, currency)}</p>
                      <p className="text-slate-300">Tickets: {formatNumber(item.ticketsSold)}</p>
                    </div>
                  </div>
                  <p className="mt-2 truncate text-center text-[11px] text-slate-500">{periodLabel(item.periodStart, period)}</p>
                  <p className="text-center text-[11px] text-slate-400">{formatNumber(item.ticketsSold)} sold</p>
                </div>
              );
            })}
          </div>
          <table className="sr-only">
            <caption>Revenue trend data</caption>
            <thead><tr><th>Period</th><th>Gross sales</th><th>Net revenue</th><th>Refunds</th><th>Tickets sold</th></tr></thead>
            <tbody>{data.map((item) => <tr key={item.periodStart}><td>{periodLabel(item.periodStart, period)}</td><td>{formatMoney(item.grossSales, currency)}</td><td>{formatMoney(item.netRevenue, currency)}</td><td>{formatMoney(item.refunds, currency)}</td><td>{formatNumber(item.ticketsSold)}</td></tr>)}</tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

export default RevenueTrendChart;

