import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Bell } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import NotificationPanel from "./NotificationPanel";
import { useNotificationStore } from "../../store/useNotificationStore";
import { useSessionStore } from "../../store/useSessionStore";
import { getNotificationDestination, getNotificationHistoryRoute } from "../../utils/notificationNavigation";
import { classNames } from "../../utils/classNames";

function NotificationBell({ className }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const currentUser = useSessionStore((state) => state.currentUser);
  const isAuthenticated = useSessionStore((state) => state.isAuthenticated);
  const isInitializing = useSessionStore((state) => state.isInitializing);
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const initializeForUser = useNotificationStore((state) => state.initializeForUser);
  const openPanel = useNotificationStore((state) => state.openPanel);
  const userId = currentUser?.id || currentUser?._id;
  const historyRoute = getNotificationHistoryRoute(currentUser?.role);

  const closePanel = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    if (!isInitializing && isAuthenticated && userId) {
      initializeForUser(userId).catch(() => {});
    }
  }, [initializeForUser, isAuthenticated, isInitializing, userId]);

  useEffect(() => {
    closePanel();
  }, [closePanel, location.pathname]);

  if (isInitializing || !isAuthenticated || !currentUser) return null;

  function handleToggle() {
    setIsOpen((open) => {
      const nextOpen = !open;
      if (nextOpen) openPanel();
      return nextOpen;
    });
  }

  function handleOpenNotification(notification) {
    const destination = getNotificationDestination(notification, currentUser.role);
    closePanel();
    if (destination) navigate(destination);
  }

  const badgeLabel = unreadCount > 99 ? "99+" : String(unreadCount);

  return (
    <>
      <button
        type="button"
        onClick={handleToggle}
        className={classNames(
          "relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-800 bg-slate-900 text-slate-300 transition hover:border-app-500/40 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-400",
          className
        )}
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <Bell className="h-4 w-4" aria-hidden="true" />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-app-500 px-1 text-[10px] font-bold leading-none text-white" aria-hidden="true">
            {badgeLabel}
          </span>
        ) : null}
      </button>

      {isOpen
        ? createPortal(
            <NotificationPanel
              onClose={closePanel}
              onOpenNotification={handleOpenNotification}
              onViewAll={() => {
                closePanel();
                if (historyRoute) navigate(historyRoute);
              }}
              hasHistoryRoute={Boolean(historyRoute)}
            />,
            document.body
          )
        : null}
    </>
  );
}

export default NotificationBell;
