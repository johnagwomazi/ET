import { classNames } from "../../utils/classNames";
import {
  DEFAULT_STATUS_META,
  CUSTOMER_HISTORY_STATUS_META,
  ORGANIZATION_STATUS_META,
  PAYMENT_STATUS_META,
  USER_STATUS_META,
} from "../../constants/dashboard.constants";
import { EVENT_STATUS_META } from "../../constants/event.constants";
import { TICKET_STATUS_META } from "../../constants/ticketing.constants";
import { formatStatusLabel } from "../../utils/formatters";

const toneClasses = {
  success: "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/20",
  warning: "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/20",
  danger: "bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/20",
  neutral: "bg-slate-500/15 text-slate-300 ring-1 ring-slate-500/20",
  info: "bg-app-500/15 text-app-200 ring-1 ring-app-500/25",
};

function getStatusMeta(status) {
  return CUSTOMER_HISTORY_STATUS_META[status] || EVENT_STATUS_META[status] || TICKET_STATUS_META[status] || ORGANIZATION_STATUS_META[status] || USER_STATUS_META[status] || PAYMENT_STATUS_META[status] || DEFAULT_STATUS_META;
}

function StatusBadge({ status, label, tone, className }) {
  const statusMeta = getStatusMeta(status);
  const toneClass = toneClasses[tone || statusMeta.tone] || toneClasses.neutral;

  return (
    <span
      className={classNames(
        "inline-flex max-w-full items-center break-words rounded-full px-2 py-1 text-[10px] font-semibold uppercase leading-4 tracking-[0.1em] sm:px-2.5 sm:text-xs sm:tracking-[0.14em]",
        toneClass,
        className
      )}
    >
      {label || statusMeta.label || formatStatusLabel(status)}
    </span>
  );
}

export default StatusBadge;
