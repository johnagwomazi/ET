import {
  BellRing,
  CalendarCheck,
  CalendarClock,
  CalendarX,
  CircleDollarSign,
  Landmark,
  RotateCcw,
  TicketCheck,
  UserPlus,
} from "lucide-react";
import { NOTIFICATION_TYPES } from "../../constants/notification.constants";
import { classNames } from "../../utils/classNames";
import { formatNotificationTime } from "../../utils/notificationTime";

const typePresentation = {
  [NOTIFICATION_TYPES.EVENT_PUBLISHED]: { icon: CalendarCheck, color: "text-emerald-300 bg-emerald-500/10" },
  [NOTIFICATION_TYPES.EVENT_POSTPONED]: { icon: CalendarClock, color: "text-amber-300 bg-amber-500/10" },
  [NOTIFICATION_TYPES.EVENT_CANCELED]: { icon: CalendarX, color: "text-rose-300 bg-rose-500/10" },
  [NOTIFICATION_TYPES.EVENT_REMINDER]: { icon: BellRing, color: "text-app-300 bg-app-500/10" },
  [NOTIFICATION_TYPES.PAYMENT_CONFIRMED]: { icon: CircleDollarSign, color: "text-emerald-300 bg-emerald-500/10" },
  [NOTIFICATION_TYPES.TICKET_ISSUED]: { icon: TicketCheck, color: "text-app-300 bg-app-500/10" },
  [NOTIFICATION_TYPES.REFUND_PROCESSING]: { icon: RotateCcw, color: "text-amber-300 bg-amber-500/10" },
  [NOTIFICATION_TYPES.REFUND_COMPLETED]: { icon: RotateCcw, color: "text-emerald-300 bg-emerald-500/10" },
  [NOTIFICATION_TYPES.REFUND_FAILED]: { icon: RotateCcw, color: "text-rose-300 bg-rose-500/10" },
  [NOTIFICATION_TYPES.WITHDRAWAL_SUBMITTED]: { icon: Landmark, color: "text-app-300 bg-app-500/10" },
  [NOTIFICATION_TYPES.WITHDRAWAL_APPROVED]: { icon: Landmark, color: "text-emerald-300 bg-emerald-500/10" },
  [NOTIFICATION_TYPES.WITHDRAWAL_REJECTED]: { icon: Landmark, color: "text-rose-300 bg-rose-500/10" },
  [NOTIFICATION_TYPES.WITHDRAWAL_COMPLETED]: { icon: Landmark, color: "text-emerald-300 bg-emerald-500/10" },
  [NOTIFICATION_TYPES.WITHDRAWAL_FAILED]: { icon: Landmark, color: "text-rose-300 bg-rose-500/10" },
  [NOTIFICATION_TYPES.MANAGER_ASSIGNED]: { icon: UserPlus, color: "text-app-300 bg-app-500/10" },
};

function NotificationItem({ notification, onOpen, isUpdating = false, compact = false }) {
  const presentation = typePresentation[notification.type] || {
    icon: BellRing,
    color: "text-slate-300 bg-slate-700/50",
  };
  const Icon = presentation.icon;

  return (
    <button
      type="button"
      onClick={() => onOpen(notification)}
      disabled={isUpdating}
      className={classNames(
        "group relative flex w-full items-start gap-3 border-b border-slate-800 px-4 text-left transition last:border-b-0 hover:bg-slate-800/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-app-400 disabled:cursor-wait disabled:opacity-70",
        compact ? "py-3.5" : "py-5 sm:px-5",
        !notification.isRead && "bg-app-500/[0.07]"
      )}
      aria-label={`${notification.isRead ? "Read" : "Unread"} notification: ${notification.title}`}
    >
      <span className={classNames("mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", presentation.color)}>
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-3">
          <span className={classNames("text-sm leading-5", notification.isRead ? "font-medium text-slate-300" : "font-semibold text-white")}>
            {notification.title}
          </span>
          {!notification.isRead ? (
            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-app-400" aria-hidden="true" />
          ) : null}
        </span>
        <span className={classNames("mt-1 block text-sm leading-5 text-slate-400", compact && "line-clamp-2")}>
          {notification.message}
        </span>
        <time className="mt-2 block text-xs text-slate-500" dateTime={notification.createdAt || undefined}>
          {formatNotificationTime(notification.createdAt)}
        </time>
      </span>
    </button>
  );
}

export default NotificationItem;

