import Card from "../ui/Card";
import { Skeleton, SkeletonText } from "../common/Skeleton";

function SectionHeaderSkeleton() {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-2">
        <Skeleton className="h-3 w-28 rounded-full" />
        <Skeleton className="h-7 w-56 rounded-xl" />
        <SkeletonText className="h-4 w-[32rem] max-w-full" />
      </div>
      <Skeleton className="h-10 w-28 rounded-xl" />
    </div>
  );
}

function StatCardSkeleton() {
  return (
    <Card className="border-slate-800/70 bg-slate-950/85 p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-3">
          <Skeleton className="h-3 w-28 rounded-full" />
          <Skeleton className="h-9 w-28 rounded-xl" />
          <Skeleton className="h-4 w-36 rounded-full" />
        </div>
        <Skeleton className="h-12 w-12 rounded-2xl" />
      </div>
    </Card>
  );
}

function ListRowSkeleton({ compact = false }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <Skeleton className={compact ? "h-10 w-10 rounded-full" : "h-10 w-10 rounded-full"} />
        <div className="min-w-0 space-y-2">
          <SkeletonText className="h-4 w-40 max-w-full" />
          <SkeletonText className="h-3 w-32 max-w-full" />
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <div className="space-y-2 text-right">
          <SkeletonText className="h-4 w-20" />
          <SkeletonText className="h-3 w-16" />
        </div>
        <Skeleton className="h-9 w-24 rounded-full" />
      </div>
    </div>
  );
}

function MetricsSkeletonCard({ titleWidth = "w-24" }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
      <Skeleton className="h-3 w-24 rounded-full" />
      <Skeleton className="mt-3 h-8 w-24 rounded-xl" />
      <Skeleton className={`mt-2 h-4 ${titleWidth} rounded-full`} />
    </div>
  );
}

export function SuperAdminDashboardSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading super admin dashboard">
      <SectionHeaderSkeleton />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <StatCardSkeleton key={`super-admin-stat-skeleton-${index}`} />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border-slate-800/70 bg-slate-950/85 p-6">
          <div className="space-y-5">
            <div className="space-y-2">
              <Skeleton className="h-3 w-32 rounded-full" />
              <Skeleton className="h-6 w-48 rounded-xl" />
              <SkeletonText className="h-4 w-80 max-w-full" />
            </div>

            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <ListRowSkeleton key={`recent-organization-skeleton-${index}`} />
              ))}
            </div>
          </div>
        </Card>

        <Card className="border-slate-800/70 bg-slate-950/85 p-6">
          <div className="space-y-5">
            <div className="space-y-2">
              <Skeleton className="h-3 w-28 rounded-full" />
              <Skeleton className="h-6 w-52 rounded-xl" />
              <SkeletonText className="h-4 w-[28rem] max-w-full" />
            </div>

            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <ListRowSkeleton key={`pending-organization-skeleton-${index}`} />
              ))}
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border-slate-800/70 bg-slate-950/85 p-6">
          <div className="space-y-5">
            <div className="space-y-2">
              <Skeleton className="h-3 w-20 rounded-full" />
              <Skeleton className="h-6 w-40 rounded-xl" />
              <SkeletonText className="h-4 w-72 max-w-full" />
            </div>

            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <ListRowSkeleton key={`recent-user-skeleton-${index}`} />
              ))}
            </div>
          </div>
        </Card>

        <Card className="border-slate-800/70 bg-slate-950/85 p-6">
          <div className="space-y-5">
            <div className="space-y-2">
              <Skeleton className="h-3 w-32 rounded-full" />
              <Skeleton className="h-6 w-44 rounded-xl" />
              <SkeletonText className="h-4 w-[26rem] max-w-full" />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <MetricsSkeletonCard />
              <MetricsSkeletonCard />
              <MetricsSkeletonCard />
              <MetricsSkeletonCard />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function TopSummaryCardSkeleton() {
  return (
    <Card className="border-slate-800/70 bg-slate-950/85 p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <Skeleton className="h-16 w-16 rounded-2xl" />
          <div className="space-y-3">
            <Skeleton className="h-3 w-40 rounded-full" />
            <Skeleton className="h-8 w-72 rounded-xl" />
            <SkeletonText className="h-4 w-[28rem] max-w-full" />
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-8 w-24 rounded-full" />
              <Skeleton className="h-8 w-28 rounded-full" />
              <Skeleton className="h-8 w-36 rounded-full" />
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[20rem]">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
            <Skeleton className="h-3 w-32 rounded-full" />
            <Skeleton className="mt-3 h-8 w-24 rounded-xl" />
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
            <Skeleton className="h-3 w-20 rounded-full" />
            <Skeleton className="mt-3 h-8 w-20 rounded-xl" />
          </div>
        </div>
      </div>
    </Card>
  );
}

export function OrganizationDashboardSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading organization dashboard">
      <SectionHeaderSkeleton />

      <TopSummaryCardSkeleton />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <StatCardSkeleton key={`organization-stat-skeleton-${index}`} />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-slate-800/70 bg-slate-950/85 p-6">
          <div className="space-y-5">
            <div className="space-y-2">
              <Skeleton className="h-3 w-40 rounded-full" />
              <Skeleton className="h-6 w-56 rounded-xl" />
              <SkeletonText className="h-4 w-[28rem] max-w-full" />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={`organization-summary-skeleton-${index}`} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                  <Skeleton className="h-3 w-20 rounded-full" />
                  <Skeleton className="mt-3 h-5 w-full max-w-48 rounded-xl" />
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card className="border-slate-800/70 bg-slate-950/85 p-6">
          <div className="space-y-5">
            <div className="space-y-2">
              <Skeleton className="h-3 w-28 rounded-full" />
              <Skeleton className="h-6 w-40 rounded-xl" />
              <SkeletonText className="h-4 w-[22rem] max-w-full" />
            </div>

            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={`organization-action-skeleton-${index}`} className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32 rounded-full" />
                    <SkeletonText className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-4 w-4 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <Card className="border-slate-800/70 bg-slate-950/85 p-6">
        <div className="space-y-5">
          <div className="space-y-2">
            <Skeleton className="h-3 w-28 rounded-full" />
            <Skeleton className="h-6 w-44 rounded-xl" />
            <SkeletonText className="h-4 w-[26rem] max-w-full" />
          </div>

          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={`organization-activity-skeleton-${index}`} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-44 rounded-full" />
                    <SkeletonText className="h-4 w-[32rem] max-w-full" />
                  </div>
                  <Skeleton className="h-3 w-24 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
