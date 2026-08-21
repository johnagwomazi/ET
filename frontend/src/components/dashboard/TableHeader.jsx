import { ArrowDownAZ, ArrowUpAZ, ChevronsUpDown } from "lucide-react";
import { classNames } from "../../utils/classNames";

function TableHeader({ column, sortBy, sortOrder, onSort }) {
  const isSortable = column.sortable !== false;
  const isActive = sortBy === column.key;

  function handleClick() {
    if (!isSortable || !onSort) {
      return;
    }

    onSort(column.key);
  }

  return (
    <th
      scope="col"
      className={classNames(
        "px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-400",
        column.headerClassName,
        column.hideOnMobile ? "hidden sm:table-cell" : ""
      )}
    >
      <button
        type="button"
        onClick={handleClick}
        className={classNames(
          "inline-flex items-center gap-2",
          isSortable ? "cursor-pointer transition hover:text-slate-200" : "cursor-default"
        )}
      >
        <span>{column.label}</span>
        {isSortable ? (
          isActive ? (
            sortOrder === "asc" ? (
              <ArrowUpAZ className="h-3.5 w-3.5" />
            ) : (
              <ArrowDownAZ className="h-3.5 w-3.5" />
            )
          ) : (
            <ChevronsUpDown className="h-3.5 w-3.5 opacity-60" />
          )
        ) : null}
      </button>
    </th>
  );
}

export default TableHeader;
