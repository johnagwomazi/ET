import Card from "../ui/Card";
import { classNames } from "../../utils/classNames";
import { Skeleton, SkeletonText } from "../common/Skeleton";

function StatCard({ icon: Icon, label, value, helperText, loading = false, className, iconClassName }) {
  return (
    <Card className={classNames("border-slate-800/70 bg-slate-950/85 p-2.5 sm:p-5", className)}>
      <div className="flex min-w-0 items-start justify-between gap-2 sm:gap-4">
        <div className="min-w-0 space-y-1.5 sm:space-y-2">
          <p className="break-words text-[10px] font-semibold uppercase leading-4 tracking-[0.12em] text-slate-400 sm:text-xs sm:tracking-[0.18em]">{label}</p>
          {loading ? <SkeletonText className="h-6 w-full max-w-20 sm:h-9 sm:max-w-28" /> : <p className="[overflow-wrap:anywhere] text-lg font-semibold leading-tight text-white sm:text-3xl">{value}</p>}
          {helperText ? <p className="text-[11px] leading-4 text-slate-500 sm:text-sm sm:leading-5">{helperText}</p> : null}
        </div>

        {Icon ? (
          <div className={classNames("shrink-0 rounded-lg bg-app-500/10 p-1.5 text-app-300 ring-1 ring-app-500/20 sm:rounded-2xl sm:p-3", iconClassName)}>
            {loading ? <Skeleton className="h-4 w-4 rounded-md sm:h-6 sm:w-6" /> : <Icon className="h-4 w-4 sm:h-6 sm:w-6" />}
          </div>
        ) : null}
      </div>
    </Card>
  );
}

export default StatCard;
