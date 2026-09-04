import Card from "../ui/Card";
import DataTable from "../dashboard/DataTable";
import Pagination from "../dashboard/Pagination";
import StatusBadge from "../dashboard/StatusBadge";
import { formatMoney, formatNumber } from "../../utils/formatters";

function OrganizationPerformanceSection({ organizations = [], pagination = {}, isLoading = false, sortBy = "netRevenue", sortOrder = "desc", onSort, onPageChange }) {
  const rows = organizations.map((item) => ({ ...item, _id: item.organization?.id }));
  const columns = [
    { key: "organizationName", label: "Organization", sortable: true, render: (row) => <div><p className="font-semibold text-white">{row.organization.name}</p><div className="mt-1"><StatusBadge status={row.organization.status} /></div></div> },
    { key: "eventCount", label: "Events", sortable: true, render: (row) => formatNumber(row.events) },
    { key: "grossSales", label: "Gross sales", sortable: true, render: (row) => formatMoney(row.grossSales, row.currency) },
    { key: "netRevenue", label: "Net revenue", sortable: true, render: (row) => <span className="font-semibold text-emerald-300">{formatMoney(row.netRevenue, row.currency)}</span> },
    { key: "ticketsSold", label: "Tickets sold", sortable: true, render: (row) => formatNumber(row.ticketsSold) },
    { key: "attendance", label: "Attendance", sortable: true, render: (row) => formatNumber(row.attendance) },
  ];

  return (
    <div className="space-y-4">
      <div className="hidden md:block"><DataTable columns={columns} data={rows} rowKey="_id" isLoading={isLoading} sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} emptyState={<div className="text-center"><p className="font-medium text-slate-200">No organization performance data</p><p className="mt-1 text-sm text-slate-500">Organizations will appear as platform activity is recorded.</p></div>} /></div>
      <div className="grid gap-3 md:hidden">
        {isLoading ? Array.from({ length: 3 }).map((_, index) => <Card key={index} className="h-44 animate-pulse bg-slate-800/60" />) : rows.length ? rows.map((row) => (
          <Card key={row._id} className="border-slate-800/70 bg-slate-950/85 p-4">
            <div className="flex items-start justify-between gap-3"><p className="font-semibold text-white">{row.organization.name}</p><StatusBadge status={row.organization.status} /></div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-slate-500">Gross sales</dt><dd className="mt-1 font-medium text-white">{formatMoney(row.grossSales, row.currency)}</dd></div><div><dt className="text-slate-500">Net revenue</dt><dd className="mt-1 font-medium text-emerald-300">{formatMoney(row.netRevenue, row.currency)}</dd></div><div><dt className="text-slate-500">Tickets sold</dt><dd className="mt-1 text-slate-200">{formatNumber(row.ticketsSold)}</dd></div><div><dt className="text-slate-500">Attendance</dt><dd className="mt-1 text-slate-200">{formatNumber(row.attendance)}</dd></div></dl>
          </Card>
        )) : <Card className="p-6 text-center text-sm text-slate-400">No organization performance data for this period.</Card>}
      </div>
      {!isLoading && pagination.totalItems > 0 ? <Pagination {...pagination} onPageChange={onPageChange} /> : null}
    </div>
  );
}

export default OrganizationPerformanceSection;

