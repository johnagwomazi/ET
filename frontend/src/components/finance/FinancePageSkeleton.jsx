import { Skeleton, SkeletonText } from "../common/Skeleton";

function FinancePageSkeleton() {
  return (
    <div className="space-y-4 sm:space-y-6" aria-busy="true" aria-label="Loading finance information">
      <div className="grid grid-cols-2 gap-2 sm:gap-4 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="min-w-0 border border-slate-800 bg-slate-950/85 p-2.5 sm:p-5">
            <SkeletonText className="h-3 w-32" />
            <SkeletonText className="mt-4 h-9 w-40" />
            <SkeletonText className="mt-3 h-4 w-44" />
          </div>
        ))}
      </div>
      <div className="space-y-3 border border-slate-800 bg-slate-950/85 p-3 sm:p-5">
        <SkeletonText className="h-5 w-44" />
        {Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-14 w-full" />)}
      </div>
    </div>
  );
}

export default FinancePageSkeleton;
