import Card from "../ui/Card";
import DataTable from "../dashboard/DataTable";
import Pagination from "../dashboard/Pagination";
import StatusBadge from "../dashboard/StatusBadge";
import { formatMoney, formatNumber, formatPercentage } from "../../utils/formatters";

function TicketTypePerformanceSection({ ticketTypes = [], pagination = {}, isLoading = false, sortBy = "grossSales", sortOrder = "desc", onSort, onPageChange }) {
  const rows = ticketTypes.map((item) => ({ ...item, _id: item.ticketType?.id }));
  const columns = [
    { key: "name", label: "Ticket type", sortable: true, render: (row) => <div><p className="font-semibold text-white">{row.ticketType.name}</p><div className="mt-1"><StatusBadge status={row.ticketType.status} /></div></div> },
    { key: "grossSales", label: "Gross sales", sortable: true, render: (row) => formatMoney(row.grossSales, row.currency) },
    { key: "ticketsSold", label: "Sold", sortable: true, render: (row) => formatNumber(row.ticketsSold) },
    { key: "inventory", label: "Inventory", render: (row) => formatNumber(row.sellableInventory) },
    { key: "remaining", label: "Remaining", render: (row) => formatNumber(row.ticketsRemaining) },
    { key: "salesRate", label: "Sales rate", sortable: true, render: (row) => formatPercentage(row.salesRate) },
  ];

  return (
    <div className="space-y-4">
      <div className="hidden md:block">
        <DataTable columns={columns} data={rows} rowKey="_id" isLoading={isLoading} sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} emptyState={<div className="text-center"><p className="font-medium text-slate-200">No ticket performance data</p><p className="mt-1 text-sm text-slate-500">Ticket types will appear here when they are configured.</p></div>} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 md:hidden">
        {isLoading ? Array.from({ length: 3 }).map((_, index) => <Card key={index} className="h-44 animate-pulse bg-slate-800/60" />) : rows.length ? rows.map((row) => (
          <Card key={row._id} className="border-slate-800/70 bg-slate-950/85 p-4">
            <div className="flex items-start justify-between gap-3"><p className="font-semibold text-white">{row.ticketType.name}</p><StatusBadge status={row.ticketType.status} /></div>
            <p className="mt-4 text-2xl font-semibold text-white">{formatMoney(row.grossSales, row.currency)}</p>
            <dl className="mt-4 grid grid-cols-3 gap-2 text-sm"><div><dt className="text-slate-500">Sold</dt><dd className="mt-1 text-slate-200">{formatNumber(row.ticketsSold)}</dd></div><div><dt className="text-slate-500">Left</dt><dd className="mt-1 text-slate-200">{formatNumber(row.ticketsRemaining)}</dd></div><div><dt className="text-slate-500">Rate</dt><dd className="mt-1 text-slate-200">{formatPercentage(row.salesRate)}</dd></div></dl>
          </Card>
        )) : <Card className="p-6 text-center text-sm text-slate-400">No ticket performance data for this period.</Card>}
      </div>
      {!isLoading && pagination.totalItems > 0 ? <Pagination {...pagination} onPageChange={onPageChange} /> : null}
    </div>
  );
}

export default TicketTypePerformanceSection;

