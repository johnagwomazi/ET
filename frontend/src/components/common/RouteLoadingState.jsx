import PageContainer from "../ui/PageContainer";
import { Skeleton } from "./Skeleton";

function RouteLoadingState() {
  return (
    <main className="min-h-screen bg-[#171918] py-6" aria-busy="true" aria-label="Loading page">
      <PageContainer className="space-y-6">
        <Skeleton className="h-16 w-full rounded-lg" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-28 rounded-lg" />
          <Skeleton className="h-28 rounded-lg" />
          <Skeleton className="h-28 rounded-lg" />
        </div>
        <Skeleton className="h-72 w-full rounded-lg" />
      </PageContainer>
    </main>
  );
}

export default RouteLoadingState;
