import { useState } from "react";
import { Eye, RotateCcw, ShieldAlert, ShieldOff } from "lucide-react";
import Card from "../ui/Card";
import Avatar from "../dashboard/Avatar";
import StatusBadge from "../dashboard/StatusBadge";
import Button from "../ui/Button";
import MobileActionSheet from "../dashboard/MobileActionSheet";
import { Skeleton, SkeletonText } from "../common/Skeleton";
import { formatDate } from "../../utils/formatters";
import { getUserAvailableActions } from "../../utils/dashboardActions";

function buildUserActionItems(user, handlers) {
  const availableActions = getUserAvailableActions(user);
  const items = [];

  if (availableActions.includes("view")) {
    items.push({
      label: "View",
      icon: Eye,
      onClick: () => handlers.onView(user),
    });
  }

  if (availableActions.includes("suspend")) {
    items.push({
      label: "Suspend",
      icon: ShieldAlert,
      onClick: () => handlers.onSuspend(user),
    });
  }

  if (availableActions.includes("reactivate")) {
    items.push({
      label: "Reactivate",
      icon: RotateCcw,
      onClick: () => handlers.onReactivate(user),
    });
  }

  if (availableActions.includes("delete")) {
    items.push({
      label: "Soft delete",
      icon: ShieldOff,
      tone: "danger",
      onClick: () => handlers.onDelete(user),
    });
  }

  return items;
}

function getDisplayName(user) {
  return `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || "Unnamed user";
}

function Field({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 px-3 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm text-slate-200">{value}</p>
    </div>
  );
}

function UsersMobileCards({ users = [], isLoading = false, onView, onSuspend, onReactivate, onDelete, emptyState }) {
  const [activeUser, setActiveUser] = useState(null);

  if (isLoading) {
    return (
      <div className="grid gap-4 md:hidden">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={`users-mobile-skeleton-${index}`} className="border-slate-800/70 bg-slate-950/85 p-4">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                  <SkeletonText className="h-4 w-32" />
                  <SkeletonText className="h-3 w-24" />
                </div>
              </div>
              <div className="grid gap-3">
                <Skeleton className="h-14 rounded-2xl" />
                <Skeleton className="h-14 rounded-2xl" />
                <Skeleton className="h-14 rounded-2xl" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (!users.length) {
    return <div className="md:hidden">{emptyState}</div>;
  }

  const activeActionItems = activeUser
    ? buildUserActionItems(activeUser, {
        onView,
        onSuspend,
        onReactivate,
        onDelete,
      })
    : [];

  return (
    <>
      <div className="grid gap-4 md:hidden">
        {users.map((user) => {
          return (
            <Card key={user._id} className="border-slate-800/70 bg-slate-950/85 p-4">
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar name={getDisplayName(user)} size="md" />
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold text-white">{getDisplayName(user)}</p>
                      <p className="truncate text-sm text-slate-400">{user.email}</p>
                    </div>
                  </div>
                  <StatusBadge status={user.accountStatus} />
                </div>

                <div className="grid gap-3">
                  <Field label="Role" value={user.role} />
                  <Field label="Organization" value={user.organization?.organizationName || "No organization"} />
                  <Field label="Created" value={formatDate(user.createdAt)} />
                </div>

                <div className="flex justify-end">
                  <Button variant="secondary" onClick={() => setActiveUser(user)}>
                    Actions
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <MobileActionSheet
        open={Boolean(activeUser)}
        title="Actions"
        description={activeUser ? getDisplayName(activeUser) : undefined}
        items={activeActionItems}
        onClose={() => setActiveUser(null)}
      />
    </>
  );
}

export default UsersMobileCards;
