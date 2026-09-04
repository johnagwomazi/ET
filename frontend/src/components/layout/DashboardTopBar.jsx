import Avatar from "../dashboard/Avatar";
import NotificationBell from "../notifications/NotificationBell";

function DashboardTopBar({ title, user }) {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-800 backdrop-blur app-sidebar">
      <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <div className="min-w-0">
            <p className="truncate text-[11px] font-semibold uppercase tracking-[0.24em] text-app-300">Platform</p>
            <h1 className="truncate text-base font-semibold text-white sm:text-lg">{title}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <NotificationBell />

          <Avatar name={`${user?.firstName || ""} ${user?.lastName || ""}`.trim()} size="md" />
        </div>
      </div>
    </header>
  );
}

export default DashboardTopBar;
