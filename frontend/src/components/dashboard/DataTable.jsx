import Card from "../ui/Card";
import { classNames } from "../../utils/classNames";
import TableHeader from "./TableHeader";
import { Skeleton, SkeletonText } from "../common/Skeleton";

function DataTable({
  columns = [],
  data = [],
  rowKey = "_id",
  isLoading = false,
  sortBy,
  sortOrder,
  onSort,
  emptyState,
  className,
}) {
  return (
    <Card className={classNames("overflow-hidden border-slate-800/70 bg-slate-900/85 p-0", className)}>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-800">
          <thead className="bg-slate-900/90">
            <tr>
              {columns.map((column) => (
                <TableHeader
                  key={column.key}
                  column={column}
                  sortBy={sortBy}
                  sortOrder={sortOrder}
                  onSort={onSort}
                />
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-800/80">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, rowIndex) => (
                <tr key={`skeleton-${rowIndex}`}>
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={classNames(
                        "px-4 py-4",
                        column.hideOnMobile ? "hidden sm:table-cell" : ""
                      )}
                    >
                      <SkeletonText className={column.skeletonClassName || "h-4 w-full max-w-[10rem]"} />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length > 0 ? (
              data.map((row) => (
                <tr key={row[rowKey]} className="transition hover:bg-slate-700/70">
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={classNames(
                        "px-4 py-4 text-sm text-slate-300",
                        column.cellClassName,
                        column.hideOnMobile ? "hidden sm:table-cell" : ""
                      )}
                    >
                      {column.render ? column.render(row) : row[column.key]}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="px-4 py-14">
                  {emptyState}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export default DataTable;
