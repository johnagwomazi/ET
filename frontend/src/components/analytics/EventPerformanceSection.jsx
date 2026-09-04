import { Link } from "react-router-dom";
import { BarChart3 } from "lucide-react";
import Button from "../ui/Button";
import Card from "../ui/Card";
import DataTable from "../dashboard/DataTable";
import Pagination from "../dashboard/Pagination";
import StatusBadge from "../dashboard/StatusBadge";
import { formatMoney, formatNumber, formatPercentage } from "../../utils/formatters";
import { ROUTE_PATHS } from "../../routes/routePaths";

function analyticsPath(eventId, queryString = "") {
  return `${ROUTE_PATHS.ORGANIZATION_EVENT_ANALYTICS.replace(":eventId", eventId)}${queryString ? `?${queryString}` : ""}`;
}

function EventPerformanceSection({
  events = [],
  pagination = {},
  isLoading = false,
  sortBy = "netRevenue",
  sortOrder = "desc",
  onSort,
  onPageChange,
  queryString = "",
  allowDrillDown = true,
}) {
  const rows = events.map((item) => ({ ...item, _id: item.event?.id }));
  const columns = [
    {
      key: "eventName",
      label: "Event",
      sortable: true,
      render: (row) => (
        <div className="min-w-44">
          {allowDrillDown ? (
            <Link to={analyticsPath(row.event.id, queryString)} className="font-semibold text-white transition hover:text-app-300">
              {row.event.name}
            </Link>
          ) : <p className="font-semibold text-white">{row.event.name}</p>}
          <div className="mt-1"><StatusBadge status={row.event.status} /></div>
        </div>
      ),
    },
    { key: "grossSales", label: "Gross sales", sortable: true, render: (row) => formatMoney(row.grossSales, row.currency) },
    { key: "netRevenue", label: "Net revenue", sortable: true, render: (row) => <span className="font-semibold text-emerald-300">{formatMoney(row.netRevenue, row.currency)}</span> },
    { key: "ticketsSold", label: "Tickets sold", sortable: true, render: (row) => formatNumber(row.ticketsSold) },
    { key: "attendance", label: "Attendance", sortable: true, render: (row) => formatNumber(row.attendance) },
    { key: "attendanceRate", label: "Attendance rate", sortable: true, render: (row) => formatPercentage(row.attendanceRate) },
    { key: "salesRate", label: "Sales rate", sortable: true, render: (row) => formatPercentage(row.salesRate) },
  ];

  if (allowDrillDown) {
    columns.push({
      key: "action",
      label: "",
      render: (row) => (
        <Button as={Link} to={analyticsPath(row.event.id, queryString)} variant="ghost" size="sm">
          <BarChart3 className="h-4 w-4" aria-hidden="true" />
          View
        </Button>
      ),
    });
  }

  return (
    <div className="space-y-4">
      <div className="hidden md:block">
        <DataTable
          columns={columns}
          data={rows}
          rowKey="_id"
          isLoading={isLoading}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={onSort}
          emptyState={<div className="text-center"><p className="font-medium text-slate-200">No event performance data</p><p className="mt-1 text-sm text-slate-500">Events remain visible once they are available for this scope.</p></div>}
        />
      </div>

      <div className="grid gap-3 md:hidden">
        {isLoading ? Array.from({ length: 3 }).map((_, index) => <Card key={index} className="h-52 animate-pulse bg-slate-800/60" />) : rows.length ? rows.map((row) => (
          <Card key={row._id} className="border-slate-800/70 bg-slate-950/85 p-4">
            <div className="flex items-start justify-between gap-3">
              <div><p className="font-semibold text-white">{row.event.name}</p><div className="mt-2"><StatusBadge status={row.event.status} /></div></div>
              {allowDrillDown ? <Button as={Link} to={analyticsPath(row.event.id, queryString)} variant="ghost" size="sm" aria-label={`View analytics for ${row.event.name}`}><BarChart3 className="h-4 w-4" /></Button> : null}
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-slate-500">Gross sales</dt><dd className="mt-1 font-medium text-white">{formatMoney(row.grossSales, row.currency)}</dd></div>
              <div><dt className="text-slate-500">Net revenue</dt><dd className="mt-1 font-medium text-emerald-300">{formatMoney(row.netRevenue, row.currency)}</dd></div>
              <div><dt className="text-slate-500">Tickets sold</dt><dd className="mt-1 text-slate-200">{formatNumber(row.ticketsSold)}</dd></div>
              <div><dt className="text-slate-500">Attendance</dt><dd className="mt-1 text-slate-200">{formatNumber(row.attendance)}</dd></div>
              <div><dt className="text-slate-500">Attendance rate</dt><dd className="mt-1 text-slate-200">{formatPercentage(row.attendanceRate)}</dd></div>
              <div><dt className="text-slate-500">Sales rate</dt><dd className="mt-1 text-slate-200">{formatPercentage(row.salesRate)}</dd></div>
            </dl>
          </Card>
        )) : <Card className="p-6 text-center text-sm text-slate-400">No event performance data for this period.</Card>}
      </div>

      {!isLoading && pagination.totalItems > 0 ? <Pagination {...pagination} onPageChange={onPageChange} /> : null}
    </div>
  );
}

export default EventPerformanceSection;

