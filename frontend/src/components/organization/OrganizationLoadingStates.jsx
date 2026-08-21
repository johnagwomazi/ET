import Card from "../ui/Card";
import { Skeleton, SkeletonText } from "../common/Skeleton";

function SectionHeaderSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-3 w-32 rounded-full" />
      <Skeleton className="h-7 w-56 rounded-xl" />
      <SkeletonText className="h-4 w-[34rem] max-w-full" />
    </div>
  );
}

function InputSkeleton() {
  return <Skeleton className="h-11 w-full rounded-xl border border-slate-800" />;
}

function SummaryCardSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
      <Skeleton className="h-3 w-20 rounded-full" />
      <Skeleton className="mt-3 h-5 w-40 rounded-xl" />
    </div>
  );
}

export function OrganizationProfileSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading organization profile">
      <SectionHeaderSkeleton />

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-slate-800/70 bg-slate-950/85 p-6">
          <div className="space-y-5">
            <div className="space-y-2">
              <Skeleton className="h-3 w-44 rounded-full" />
              <Skeleton className="h-6 w-64 rounded-xl" />
              <SkeletonText className="h-4 w-[30rem] max-w-full" />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <InputSkeleton key={`profile-input-skeleton-${index}`} />
              ))}
            </div>

            <div className="space-y-2">
              <Skeleton className="h-4 w-20 rounded-full" />
              <Skeleton className="h-28 w-full rounded-2xl" />
            </div>

            <div className="flex justify-end border-t border-slate-800/70 pt-4">
              <Skeleton className="h-11 w-32 rounded-xl" />
            </div>
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="border-slate-800/70 bg-slate-950/85 p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Skeleton className="h-20 w-20 rounded-2xl" />
                <div className="space-y-2">
                  <Skeleton className="h-5 w-48 rounded-xl" />
                  <SkeletonText className="h-4 w-40" />
                  <Skeleton className="h-8 w-24 rounded-full" />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <SummaryCardSkeleton key={`profile-summary-skeleton-${index}`} />
                ))}
              </div>
            </div>
          </Card>

          <Card className="border-slate-800/70 bg-slate-950/85 p-6">
            <div className="space-y-3">
              <Skeleton className="h-5 w-40 rounded-xl" />
              <SkeletonText className="h-4 w-[26rem] max-w-full" />
              <Skeleton className="h-24 w-full rounded-2xl" />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export function OrganizationSettingsSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading organization settings">
      <SectionHeaderSkeleton />

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="border-slate-800/70 bg-slate-950/85 p-6">
          <div className="space-y-5">
            <div className="space-y-2">
              <Skeleton className="h-3 w-32 rounded-full" />
              <Skeleton className="h-6 w-56 rounded-xl" />
              <SkeletonText className="h-4 w-[30rem] max-w-full" />
            </div>

            <div className="grid gap-4">
              {Array.from({ length: 5 }).map((_, index) => (
                <InputSkeleton key={`settings-input-skeleton-${index}`} />
              ))}
            </div>

            <div className="flex justify-end border-t border-slate-800/70 pt-4">
              <Skeleton className="h-11 w-32 rounded-xl" />
            </div>
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="border-slate-800/70 bg-slate-950/85 p-6">
            <div className="space-y-3">
              <Skeleton className="h-5 w-40 rounded-xl" />
              <SkeletonText className="h-4 w-[26rem] max-w-full" />
              <div className="grid gap-3 sm:grid-cols-2">
                {Array.from({ length: 2 }).map((_, index) => (
                  <SummaryCardSkeleton key={`settings-summary-skeleton-${index}`} />
                ))}
              </div>
            </div>
          </Card>

          <Card className="border-slate-800/70 bg-slate-950/85 p-6">
            <div className="space-y-3">
              <Skeleton className="h-5 w-28 rounded-xl" />
              <SkeletonText className="h-4 w-[26rem] max-w-full" />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
