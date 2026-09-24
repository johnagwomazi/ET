import { Link } from "react-router-dom";
import { Store } from "lucide-react";
import Avatar from "../dashboard/Avatar";
import NotificationBell from "../notifications/NotificationBell";

function DashboardTopBar({ title, user, marketplaceRoute = null }) {
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
          {marketplaceRoute ? (
            <Link
              to={marketplaceRoute}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-800 bg-slate-900 text-slate-300 transition hover:border-app-500/40 hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-400"
              aria-label="Browse event marketplace"
              title="Browse event marketplace"
            >
              <Store className="h-4 w-4" aria-hidden="true" />
            </Link>
          ) : null}

          <NotificationBell />

          <Avatar name={`${user?.firstName || ""} ${user?.lastName || ""}`.trim()} size="md" />
        </div>
      </div>
    </header>
  );
}

export default DashboardTopBar;
