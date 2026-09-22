import { ScanLine, Ticket } from "lucide-react";
import Card from "../ui/Card";
import { formatNumber, formatPercentage } from "../../utils/formatters";

function AttendancePerformance({ summary = {} }) {
  return (
    <Card className="border-slate-800/70 bg-slate-950/85 p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h3 className="font-semibold text-white">Attendance performance</h3>
          <p className="mt-1 text-sm text-slate-400">Paid ticket volume compared with recorded check-ins.</p>
        </div>
        <ScanLine className="h-5 w-5 text-cyan-300" aria-hidden="true" />
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 sm:mt-5 sm:grid-cols-3 sm:gap-4">
        <div className="border-l-2 border-app-400 pl-4">
          <dt className="flex items-center gap-2 text-sm text-slate-400"><Ticket className="h-4 w-4" />Tickets sold</dt>
          <dd className="mt-2 text-lg font-semibold text-white sm:text-2xl">{formatNumber(summary.ticketsSold || 0)}</dd>
        </div>
        <div className="border-l-2 border-cyan-400 pl-4">
          <dt className="text-sm text-slate-400">Ticket-linked attendance</dt>
          <dd className="mt-2 text-lg font-semibold text-white sm:text-2xl">{formatNumber(summary.ticketLinkedAttendance || 0)}</dd>
        </div>
        <div className="col-span-2 border-l-2 border-emerald-400 pl-4 sm:col-span-1">
          <dt className="text-sm text-slate-400">Attendance rate</dt>
          <dd className="mt-2 text-lg font-semibold text-emerald-300 sm:text-2xl">{formatPercentage(summary.attendanceRate || 0)}</dd>
        </div>
      </dl>

      {Number(summary.legacyAttendance || 0) > 0 ? (
        <p className="mt-5 border-t border-slate-800 pt-4 text-sm text-slate-400">
          {formatNumber(summary.legacyAttendance)} legacy check-ins are included in total attendance but excluded from the ticket attendance rate.
        </p>
      ) : null}
    </Card>
  );
}

export default AttendancePerformance;
