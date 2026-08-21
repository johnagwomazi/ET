import { Skeleton } from "./Skeleton";

function LoadingState({ label = "Loading..." }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center px-4" aria-busy="true" aria-label={label}>
      <div className="w-full max-w-md space-y-4 rounded-3xl border border-slate-800 bg-slate-950/85 p-6">
        <Skeleton className="h-3 w-28 rounded-full" />
        <Skeleton className="h-8 w-3/4 rounded-xl" />
        <Skeleton className="h-4 w-full rounded-full" />
        <Skeleton className="h-4 w-5/6 rounded-full" />
        <Skeleton className="h-11 w-32 rounded-xl" />
      </div>
    </div>
  );
}

export default LoadingState;
