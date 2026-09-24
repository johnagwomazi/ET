import { BarChart3 } from "lucide-react";
import Card from "../ui/Card";
import { Skeleton } from "../common/Skeleton";
import { formatDate, formatNumber } from "../../utils/formatters";

function periodLabel(value, period) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (period === "monthly") {
    return new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(date);
  }
  if (period === "weekly") return `Week of ${formatDate(value)}`;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
}

function EventPerformanceChart({ data = [], period = "daily", loading = false }) {
  const performanceData = data.filter(
    (item) => Number(item.ticketsSold || 0) > 0 || Number(item.attendance || 0) > 0
  );
  const maximum = Math.max(
    1,
    ...performanceData.flatMap((item) => [
      Number(item.ticketsSold || 0),
      Number(item.attendance || 0),
    ])
  );

  return (
    <Card className="border-slate-800/70 bg-slate-950/85 p-4 sm:p-6">
      <div className="flex flex-col gap-3 border-b border-slate-800 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-semibold text-white">Event performance over time</h3>
          <p className="mt-1 text-sm text-slate-400">
            Successful ticket sales and recorded attendance by {period} interval.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-slate-400" aria-label="Chart legend">
          <span className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-sm bg-app-400" />
            Tickets sold
          </span>
          <span className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-sm bg-cyan-400" />
            Attendance
          </span>
        </div>
      </div>

      {loading ? (
        <div className="mt-6 flex h-64 items-end gap-3" aria-label="Loading event performance">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-32 flex-1" />
          ))}
        </div>
      ) : performanceData.length === 0 ? (
        <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-center">
          <BarChart3 className="h-8 w-8 text-slate-500" aria-hidden="true" />
          <div>
            <p className="font-medium text-slate-200">No event performance data for this period</p>
            <p className="mt-1 text-sm text-slate-500">
              Successful ticket sales and recorded check-ins will appear here.
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto pb-2">
          <div
            className="flex h-72 items-end gap-3"
            style={{ minWidth: `${Math.max(560, performanceData.length * 72)}px` }}
            role="img"
            aria-label={`Event performance containing ${performanceData.length} ${period} periods`}
          >
            {performanceData.map((item) => {
              const ticketsSold = Number(item.ticketsSold || 0);
              const attendance = Number(item.attendance || 0);
              const ticketHeight = Math.max(ticketsSold ? 4 : 0, (ticketsSold / maximum) * 210);
              const attendanceHeight = Math.max(attendance ? 4 : 0, (attendance / maximum) * 210);

              return (
                <div key={item.periodStart} className="flex h-full min-w-14 flex-1 flex-col justify-end">
                  <div
                    className="group relative flex flex-1 items-end justify-center gap-1.5 border-b border-slate-700"
                    tabIndex={0}
                  >
                    <div className="w-4 rounded-t bg-app-400" style={{ height: `${ticketHeight}px` }} />
                    <div className="w-4 rounded-t bg-cyan-400" style={{ height: `${attendanceHeight}px` }} />
                    <div className="pointer-events-none absolute bottom-full z-10 mb-2 hidden w-44 rounded-lg border border-slate-700 bg-slate-900 p-3 text-xs shadow-soft group-hover:block group-focus:block">
                      <p className="font-semibold text-white">{periodLabel(item.periodStart, period)}</p>
                      <p className="mt-1 text-slate-300">Tickets sold: {formatNumber(ticketsSold)}</p>
                      <p className="text-slate-300">Attendance: {formatNumber(attendance)}</p>
                    </div>
                  </div>
                  <p className="mt-2 truncate text-center text-[11px] text-slate-500">
                    {periodLabel(item.periodStart, period)}
                  </p>
                </div>
              );
            })}
          </div>
          <table className="sr-only">
            <caption>Event performance trend data</caption>
            <thead>
              <tr><th>Period</th><th>Tickets sold</th><th>Attendance</th></tr>
            </thead>
            <tbody>
              {performanceData.map((item) => (
                <tr key={item.periodStart}>
                  <td>{periodLabel(item.periodStart, period)}</td>
                  <td>{formatNumber(item.ticketsSold)}</td>
                  <td>{formatNumber(item.attendance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

export default EventPerformanceChart;
