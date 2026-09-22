import { Skeleton, SkeletonText } from "../common/Skeleton";

function AnalyticsPageSkeleton() {
  return (
    <div className="space-y-4 sm:space-y-6" aria-busy="true" aria-label="Loading analytics">
      <div className="grid grid-cols-2 gap-2 sm:gap-4 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="min-w-0 border border-slate-800 bg-slate-950/85 p-2.5 sm:p-5">
            <SkeletonText className="h-3 w-28" />
            <SkeletonText className="mt-4 h-9 w-36" />
            <SkeletonText className="mt-3 h-4 w-44" />
          </div>
        ))}
      </div>
      <div className="border border-slate-800 bg-slate-950/85 p-6">
        <SkeletonText className="h-5 w-48" />
        <div className="mt-6 flex h-64 items-end gap-3">
          {Array.from({ length: 8 }).map((_, index) => <Skeleton key={index} className="h-32 flex-1" />)}
        </div>
      </div>
    </div>
  );
}

export default AnalyticsPageSkeleton;
