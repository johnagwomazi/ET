import { useEffect, useState } from "react";
import { CheckCheck, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import Button from "../../components/ui/Button";
import PageContainer from "../../components/ui/PageContainer";
import EmptyState from "../../components/common/EmptyState";
import ErrorState from "../../components/common/ErrorState";
import Pagination from "../../components/dashboard/Pagination";
import SectionHeader from "../../components/dashboard/SectionHeader";
import NotificationItem from "../../components/notifications/NotificationItem";
import NotificationListSkeleton from "../../components/notifications/NotificationListSkeleton";
import { NOTIFICATION_HISTORY_PAGE_SIZE } from "../../constants/notification.constants";
import { USER_ROLES } from "../../constants/roles.constants";
import * as notificationService from "../../services/notification.service";
import { useNotificationStore } from "../../store/useNotificationStore";
import { useSessionStore } from "../../store/useSessionStore";
import { getNotificationDestination } from "../../utils/notificationNavigation";

const FILTERS = [
  { value: "all", label: "All" },
  { value: "unread", label: "Unread" },
  { value: "read", label: "Read" },
];

const EMPTY_PAGINATION = { page: 1, limit: NOTIFICATION_HISTORY_PAGE_SIZE, totalItems: 0, totalPages: 0 };

function NotificationHistoryContent() {
  const navigate = useNavigate();
  const currentUser = useSessionStore((state) => state.currentUser);
  const markRead = useNotificationStore((state) => state.markRead);
  const markAllRead = useNotificationStore((state) => state.markAllRead);
  const [notifications, setNotifications] = useState([]);
  const [pagination, setPagination] = useState(EMPTY_PAGINATION);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState("all");
  const [refreshKey, setRefreshKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [updatingIds, setUpdatingIds] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError("");

    const isRead = filter === "all" ? undefined : filter === "read";
    notificationService
      .getNotifications(
        { page, limit: NOTIFICATION_HISTORY_PAGE_SIZE, isRead },
        { signal: controller.signal }
      )
      .then((response) => {
        setNotifications(response?.notifications || []);
        setPagination(response?.pagination || EMPTY_PAGINATION);
      })
      .catch((loadError) => {
        if (loadError.name !== "AbortError") setError("Notifications could not be loaded. Please try again.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [filter, page, refreshKey]);

  function refresh() {
    setRefreshKey((value) => value + 1);
  }

  function selectFilter(nextFilter) {
    setPage(1);
    setFilter(nextFilter);
  }

  async function openNotification(notification) {
    setUpdatingIds((ids) => [...ids, notification.id]);
    try {
      const updated = notification.isRead ? notification : await markRead(notification);
      if (!notification.isRead) {
        setNotifications((items) => items.map((item) => (item.id === notification.id ? updated : item)));
      }
      const destination = getNotificationDestination(notification, currentUser?.role);
      if (destination) navigate(destination);
    } catch (updateError) {
      toast.error("This notification could not be marked as read. Please try again.");
    } finally {
      setUpdatingIds((ids) => ids.filter((id) => id !== notification.id));
    }
  }

  async function handleMarkAll() {
    setIsMarkingAll(true);
    try {
      await markAllRead();
      setNotifications((items) => items.map((item) => ({ ...item, isRead: true, readAt: item.readAt || new Date().toISOString() })));
      toast.success("All notifications marked as read");
      if (filter === "unread") refresh();
    } catch (updateError) {
      toast.error("Notifications could not be updated. Please try again.");
    } finally {
      setIsMarkingAll(false);
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Account updates"
        title="Notifications"
        description="Review event, ticket, payment, refund, assignment, and finance updates sent to your account."
        actions={[
          { label: "Refresh", icon: RefreshCw, onClick: refresh, isLoading, loadingText: "Refreshing..." },
          { label: "Mark all read", icon: CheckCheck, onClick: handleMarkAll, isLoading: isMarkingAll, loadingText: "Updating...", disabled: notifications.every((item) => item.isRead) },
        ]}
      />

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter notifications">
        {FILTERS.map((item) => (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={filter === item.value}
            onClick={() => selectFilter(item.value)}
            className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${filter === item.value ? "border-app-500/40 bg-app-500/15 text-white" : "border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700 hover:text-white"}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error && notifications.length === 0 ? (
        <ErrorState title="Notifications unavailable" message="We couldn't load your notifications." onRetry={refresh} />
      ) : null}

      {isLoading && notifications.length === 0 ? (
        <section className="overflow-hidden rounded-lg border border-slate-800 bg-slate-950/75">
          <NotificationListSkeleton rows={6} />
        </section>
      ) : null}

      {notifications.length > 0 ? (
        <section className="overflow-hidden rounded-lg border border-slate-800 bg-slate-950/75" aria-busy={isLoading}>
          {notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onOpen={openNotification}
              isUpdating={updatingIds.includes(notification.id)}
            />
          ))}
        </section>
      ) : null}

      {!isLoading && !error && notifications.length === 0 ? (
        <EmptyState
          title={filter === "all" ? "You're all caught up" : `No ${filter} notifications`}
          message="Account and operational updates will appear here when they are available."
        />
      ) : null}

      {pagination.totalPages > 1 ? (
        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          totalItems={pagination.totalItems}
          onPageChange={setPage}
        />
      ) : null}
    </div>
  );
}

function NotificationHistoryPage() {
  const role = useSessionStore((state) => state.currentUser?.role);

  if (role === USER_ROLES.CUSTOMER) {
    return (
      <main className="py-10 sm:py-14">
        <PageContainer>
          <NotificationHistoryContent />
        </PageContainer>
      </main>
    );
  }

  return <NotificationHistoryContent />;
}

export default NotificationHistoryPage;
