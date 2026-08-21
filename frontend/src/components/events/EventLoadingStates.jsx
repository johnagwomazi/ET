import Card from "../ui/Card";
import { Skeleton, SkeletonText } from "../common/Skeleton";

function EventTableSkeleton({ showFilterCard = true, showSummaryCards = true }) {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading events">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-3 w-24 rounded-full" />
          <Skeleton className="h-8 w-64 rounded-xl" />
          <SkeletonText className="h-4 w-[32rem] max-w-full" />
        </div>
        <Skeleton className="h-10 w-28 rounded-xl" />
      </div>

      {showSummaryCards ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={`event-summary-skeleton-${index}`} className="border-slate-800/70 bg-slate-950/85 p-5">
              <div className="space-y-3">
                <Skeleton className="h-3 w-24 rounded-full" />
                <Skeleton className="h-8 w-28 rounded-xl" />
                <SkeletonText className="h-4 w-36" />
              </div>
            </Card>
          ))}
        </div>
      ) : null}

      {showFilterCard ? (
        <Card className="border-slate-800/70 bg-slate-950/85">
          <div className="grid gap-4 md:grid-cols-3">
            <Skeleton className="h-16 rounded-2xl" />
            <Skeleton className="h-16 rounded-2xl" />
            <Skeleton className="h-16 rounded-2xl" />
          </div>
        </Card>
      ) : null}

      <Card className="overflow-hidden border-slate-800/70 bg-slate-950/85 p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-800">
            <thead className="bg-slate-900/90">
              <tr>
                {Array.from({ length: 6 }).map((_, index) => (
                  <th key={`event-header-skeleton-${index}`} className="px-4 py-3 text-left">
                    <Skeleton className="h-3 w-24 rounded-full" />
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800/80">
              {Array.from({ length: 5 }).map((_, rowIndex) => (
                <tr key={`event-row-skeleton-${rowIndex}`}>
                  {Array.from({ length: 6 }).map((__, columnIndex) => (
                    <td key={`event-row-skeleton-${rowIndex}-${columnIndex}`} className="px-4 py-4">
                      <SkeletonText className={columnIndex === 0 ? "h-5 w-48" : "h-4 w-28"} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function EventDetailSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading event details">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-3 w-24 rounded-full" />
          <Skeleton className="h-8 w-72 rounded-xl" />
          <SkeletonText className="h-4 w-[30rem] max-w-full" />
        </div>
        <Skeleton className="h-10 w-32 rounded-xl" />
      </div>

      <Card className="border-slate-800/70 bg-slate-950/85">
        <div className="grid gap-4 lg:grid-cols-[1.4fr_0.6fr]">
          <div className="space-y-4">
            <Skeleton className="h-4 w-40 rounded-full" />
            <Skeleton className="h-10 w-3/4 rounded-xl" />
            <SkeletonText className="h-4 w-full" />
            <SkeletonText className="h-4 w-5/6" />
            <SkeletonText className="h-4 w-[70%]" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
          </div>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border-slate-800/70 bg-slate-950/85">
          <div className="space-y-3">
            <Skeleton className="h-4 w-36 rounded-full" />
            <SkeletonText className="h-4 w-[28rem] max-w-full" />
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={`event-detail-summary-${index}`} className="h-20 rounded-2xl" />
            ))}
          </div>
        </Card>

        <Card className="border-slate-800/70 bg-slate-950/85">
          <div className="space-y-3">
            <Skeleton className="h-4 w-32 rounded-full" />
            <SkeletonText className="h-4 w-[22rem] max-w-full" />
          </div>
          <div className="mt-5 space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={`event-detail-note-${index}`} className="h-14 rounded-2xl" />
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function EventFormSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading event form">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-3 w-24 rounded-full" />
          <Skeleton className="h-8 w-72 rounded-xl" />
          <SkeletonText className="h-4 w-[30rem] max-w-full" />
        </div>
        <Skeleton className="h-10 w-28 rounded-xl" />
      </div>

      <Card className="border-slate-800/70 bg-slate-950/85">
        <div className="space-y-5">
          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-4">
              <Skeleton className="h-14 rounded-2xl" />
              <Skeleton className="h-14 rounded-2xl" />
              <Skeleton className="h-44 rounded-3xl" />
            </div>
            <div className="space-y-4">
              <Skeleton className="h-14 rounded-2xl" />
              <Skeleton className="h-56 rounded-3xl" />
            </div>
          </div>

          <Skeleton className="h-48 rounded-3xl" />
          <Skeleton className="h-64 rounded-3xl" />
          <Skeleton className="h-24 rounded-3xl" />

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Skeleton className="h-11 w-full rounded-xl sm:w-28" />
            <Skeleton className="h-11 w-full rounded-xl sm:w-32" />
          </div>
        </div>
      </Card>
    </div>
  );
}

export { EventTableSkeleton, EventDetailSkeleton, EventFormSkeleton };
