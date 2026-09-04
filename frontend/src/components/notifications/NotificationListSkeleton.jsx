import { Skeleton } from "../common/Skeleton";

function NotificationListSkeleton({ rows = 4 }) {
  return (
    <div aria-label="Loading notifications" role="status">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex gap-3 border-b border-slate-800 px-4 py-4 last:border-b-0">
          <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      ))}
      <span className="sr-only">Loading notifications</span>
    </div>
  );
}

export default NotificationListSkeleton;

