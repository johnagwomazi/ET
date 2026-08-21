import { classNames } from "../../utils/classNames";
import {
  DEFAULT_STATUS_META,
  ORGANIZATION_STATUS_META,
  USER_STATUS_META,
} from "../../constants/dashboard.constants";
import { EVENT_STATUS_META } from "../../constants/event.constants";
import { formatStatusLabel } from "../../utils/formatters";

const toneClasses = {
  success: "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/20",
  warning: "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/20",
  danger: "bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/20",
  neutral: "bg-slate-500/15 text-slate-300 ring-1 ring-slate-500/20",
};

function getStatusMeta(status) {
  return EVENT_STATUS_META[status] || ORGANIZATION_STATUS_META[status] || USER_STATUS_META[status] || DEFAULT_STATUS_META;
}

function StatusBadge({ status, label, className }) {
  const statusMeta = getStatusMeta(status);
  const toneClass = toneClasses[statusMeta.tone] || toneClasses.neutral;

  return (
    <span
      className={classNames(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.14em]",
        toneClass,
        className
      )}
    >
      {label || statusMeta.label || formatStatusLabel(status)}
    </span>
  );
}

export default StatusBadge;
