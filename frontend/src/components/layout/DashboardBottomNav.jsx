import { MoreHorizontal } from "lucide-react";
import { NavLink } from "react-router-dom";
import { classNames } from "../../utils/classNames";

function NavItem({ item, active }) {
  const Icon = item.icon;

  if (item.to) {
    return (
      <NavLink
        to={item.to}
        end={item.exact}
        className={classNames(
          "flex flex-1 flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium transition",
          active ? "text-white" : "text-slate-400 hover:text-slate-200"
        )}
        title={item.label}
      >
        <Icon className="h-5 w-5" />
        <span>{item.label}</span>
      </NavLink>
    );
  }

  return null;
}

function DashboardBottomNav({ items = [], pathname, onMoreClick, showMore = true }) {
  const mainItems = items.slice(0, 3);
  const hasMoreItems = items.length > 3;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-800 px-3 py-2 backdrop-blur lg:hidden app-sidebar">
      <div className="mx-auto grid max-w-4xl grid-cols-4 gap-2">
        {mainItems.map((item) => {
          const active = item.to ? (item.exact ? pathname === item.to : pathname.startsWith(item.to)) : false;

          return <NavItem key={item.label} item={item} active={active} />;
        })}

        {showMore && hasMoreItems ? (
          <button
            type="button"
            onClick={onMoreClick}
            className="flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium text-slate-400 transition hover:text-slate-200"
          >
            <MoreHorizontal className="h-5 w-5" />
            <span>More</span>
          </button>
        ) : (
          <div />
        )}
      </div>
    </nav>
  );
}

export default DashboardBottomNav;
