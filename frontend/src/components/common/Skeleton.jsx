import { classNames } from "../../utils/classNames";

export function Skeleton({ className }) {
  return (
    <div
      className={classNames("rounded-lg bg-slate-700/80 motion-safe:animate-pulse", className)}
      aria-hidden="true"
    />
  );
}

export function SkeletonText({ className }) {
  return <Skeleton className={classNames("h-4 w-full", className)} />;
}
