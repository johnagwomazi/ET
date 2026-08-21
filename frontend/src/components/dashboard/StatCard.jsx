import Card from "../ui/Card";
import { classNames } from "../../utils/classNames";
import { Skeleton, SkeletonText } from "../common/Skeleton";

function StatCard({ icon: Icon, label, value, helperText, loading = false, className }) {
  return (
    <Card className={classNames("border-slate-800/70 bg-slate-950/85 p-5", className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
          {loading ? <SkeletonText className="h-9 w-28" /> : <p className="text-3xl font-semibold text-white">{value}</p>}
          {helperText ? <p className="text-sm text-slate-500">{helperText}</p> : null}
        </div>

        {Icon ? (
          <div className="rounded-2xl bg-app-500/10 p-3 text-app-300 ring-1 ring-app-500/20">
            {loading ? <Skeleton className="h-6 w-6 rounded-md" /> : <Icon className="h-6 w-6" />}
          </div>
        ) : null}
      </div>
    </Card>
  );
}

export default StatCard;
