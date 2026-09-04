import { useEffect, useRef, useState } from "react";
import { CheckCheck, Inbox, RotateCw, X } from "lucide-react";
import toast from "react-hot-toast";
import NotificationItem from "./NotificationItem";
import NotificationListSkeleton from "./NotificationListSkeleton";
import { useNotificationStore } from "../../store/useNotificationStore";

function NotificationPanel({ onClose, onOpenNotification, onViewAll, hasHistoryRoute }) {
  const panelRef = useRef(null);
  const [updatingIds, setUpdatingIds] = useState([]);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const notifications = useNotificationStore((state) => state.notifications);
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const isListLoading = useNotificationStore((state) => state.isListLoading);
  const listError = useNotificationStore((state) => state.listError);
  const loadRecent = useNotificationStore((state) => state.loadRecent);
  const markRead = useNotificationStore((state) => state.markRead);
  const markAllRead = useNotificationStore((state) => state.markAllRead);

  useEffect(() => {
    panelRef.current?.focus();

    function handleKeyDown(event) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  async function handleOpen(notification) {
    setUpdatingIds((ids) => [...ids, notification.id]);
    try {
      if (!notification.isRead) await markRead(notification);
      onOpenNotification(notification);
    } catch (error) {
      toast.error("This notification could not be marked as read. Please try again.");
    } finally {
      setUpdatingIds((ids) => ids.filter((id) => id !== notification.id));
    }
  }

  async function handleMarkAll() {
    setIsMarkingAll(true);
    try {
      await markAllRead();
      toast.success("All notifications marked as read");
    } catch (error) {
      toast.error("Notifications could not be updated. Please try again.");
    } finally {
      setIsMarkingAll(false);
    }
  }

  return (
    <>
      <button type="button" className="fixed inset-0 z-40 cursor-default bg-black/50 sm:bg-black/20" onClick={onClose} aria-label="Close notifications" />
      <section
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="notification-panel-title"
        className="fixed inset-x-3 bottom-3 top-20 z-50 flex flex-col overflow-hidden rounded-lg border border-slate-800 bg-slate-950 shadow-2xl outline-none sm:inset-auto sm:right-5 sm:top-20 sm:max-h-[calc(100vh-6rem)] sm:w-[390px]"
      >
        <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-slate-800 px-4">
          <div className="min-w-0">
            <h2 id="notification-panel-title" className="font-semibold text-white">Notifications</h2>
            <p className="text-xs text-slate-400">{unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}</p>
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={handleMarkAll}
                disabled={isMarkingAll}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-800 hover:text-white disabled:opacity-50"
                aria-label="Mark all notifications as read"
                title="Mark all as read"
              >
                <CheckCheck className="h-4 w-4" aria-hidden="true" />
              </button>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-800 hover:text-white"
              aria-label="Close notifications"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {isListLoading && notifications.length === 0 ? <NotificationListSkeleton /> : null}

          {listError && notifications.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
              <p className="text-sm font-medium text-slate-200">Notifications are unavailable</p>
              <p className="mt-1 text-sm text-slate-500">Please check your connection and try again.</p>
              <button type="button" onClick={loadRecent} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-app-300 hover:text-app-200">
                <RotateCw className="h-4 w-4" aria-hidden="true" /> Retry
              </button>
            </div>
          ) : null}

          {!isListLoading && !listError && notifications.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-slate-900 text-slate-400">
                <Inbox className="h-5 w-5" aria-hidden="true" />
              </span>
              <p className="mt-4 text-sm font-semibold text-white">You're all caught up</p>
              <p className="mt-1 text-sm text-slate-500">New account and event updates will appear here.</p>
            </div>
          ) : null}

          {notifications.length > 0 ? (
            <div>
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onOpen={handleOpen}
                  isUpdating={updatingIds.includes(notification.id)}
                  compact
                />
              ))}
            </div>
          ) : null}
        </div>

        {hasHistoryRoute ? (
          <footer className="shrink-0 border-t border-slate-800 p-3">
            <button type="button" onClick={onViewAll} className="h-10 w-full rounded-lg text-sm font-semibold text-app-300 transition hover:bg-slate-900 hover:text-app-200">
              View all notifications
            </button>
          </footer>
        ) : null}
      </section>
    </>
  );
}

export default NotificationPanel;
