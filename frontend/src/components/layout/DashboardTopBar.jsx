import { Bell } from "lucide-react";
import Avatar from "../dashboard/Avatar";

function DashboardTopBar({ title, user, onNotificationClick }) {
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
          <button
            type="button"
            onClick={onNotificationClick}
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-800 bg-slate-900 text-slate-300 transition hover:border-app-500/40 hover:text-white"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-app-400" aria-hidden="true" />
          </button>

          <Avatar name={`${user?.firstName || ""} ${user?.lastName || ""}`.trim()} size="md" />
        </div>
      </div>
    </header>
  );
}

export default DashboardTopBar;
