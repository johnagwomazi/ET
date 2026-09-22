import { ChevronLeft, ChevronRight } from "lucide-react";
import Button from "../ui/Button";
import { formatNumber } from "../../utils/formatters";

function Pagination({ page = 1, totalPages = 0, totalItems = 0, onPageChange }) {
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  return (
    <div className="flex min-w-0 flex-col gap-2.5 rounded-xl border border-slate-800 bg-slate-900/85 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:rounded-2xl sm:px-4 sm:py-4">
      <p className="break-words text-xs text-slate-400 sm:text-sm">
        Showing page <span className="font-semibold text-slate-200">{page}</span> of{" "}
        <span className="font-semibold text-slate-200">{totalPages || 1}</span> ·{" "}
        <span className="font-semibold text-slate-200">{formatNumber(totalItems)}</span> records
      </p>

      <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
        <Button variant="secondary" size="sm" disabled={!hasPrev} onClick={() => onPageChange(page - 1)}>
          <ChevronLeft className="h-4 w-4" />
          Prev
        </Button>
        <Button variant="secondary" size="sm" disabled={!hasNext} onClick={() => onPageChange(page + 1)}>
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default Pagination;
