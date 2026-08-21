import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { NavLink } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { classNames } from "../../utils/classNames";
import Avatar from "../dashboard/Avatar";
import BrandLogo from "./BrandLogo";
import { useClickOutside } from "../../hooks/useClickOutside";

function SidebarNavItem({ item, collapsed, active, onAction }) {
  const Icon = item.icon;
  const baseClasses =
    "group flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition";
  const activeClasses = active
    ? "bg-app-500/15 text-white ring-1 ring-app-500/25"
    : "text-slate-300 hover:bg-slate-700 hover:text-white";

  if (item.to) {
    return (
      <NavLink
        to={item.to}
        end={item.exact}
        title={collapsed ? item.label : undefined}
        className={({ isActive }) =>
          classNames(baseClasses, isActive ? activeClasses : activeClasses, collapsed ? "justify-center px-2" : "")
        }
      >
        <Icon className="h-5 w-5 shrink-0" />
        {!collapsed ? <span>{item.label}</span> : null}
      </NavLink>
    );
  }

  return (
    <button
      type="button"
      title={collapsed ? item.label : undefined}
      onClick={() => onAction?.(item)}
      className={classNames(
        baseClasses,
        item.tone === "danger"
          ? "text-rose-300 hover:bg-rose-500/10 hover:text-rose-200"
          : activeClasses,
        collapsed ? "justify-center px-2" : ""
      )}
    >
      <Icon className="h-5 w-5 shrink-0" />
      {!collapsed ? <span>{item.label}</span> : null}
    </button>
  );
}

function DashboardSidebar({ navigation, collapsed = false, user, onAction, currentPath }) {
  const homeRoute = navigation.main[0]?.to || "/";
  const accountMenuRef = useRef(null);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

  useClickOutside(accountMenuRef, () => setAccountMenuOpen(false), accountMenuOpen);

  useEffect(() => {
    function handleEscape(event) {
      if (event.key === "Escape") {
        setAccountMenuOpen(false);
      }
    }

    if (!accountMenuOpen) {
      return undefined;
    }

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [accountMenuOpen]);

  return (
    <aside
      className={classNames(
        "fixed inset-y-0 left-0 z-30 hidden h-screen border-r border-slate-800 backdrop-blur app-sidebar",
        collapsed ? "md:flex lg:hidden w-20" : "lg:flex w-72"
      )}
    >
      <div className="flex h-full w-full flex-col gap-6 p-4">
        <div className={classNames("rounded-3xl border border-slate-800 p-4", collapsed ? "px-2" : "")} style={{ background: "var(--page-surface)" }}>
          {collapsed ? (
            <div className="flex items-center justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-app-500 text-white shadow-lg shadow-app-500/20">
                <BrandLogo to={homeRoute} className="sr-only" />
                <span aria-hidden="true" className="text-lg font-semibold">
                  E
                </span>
              </div>
            </div>
          ) : (
            <BrandLogo to={homeRoute} />
          )}
        </div>

        <nav className="flex flex-1 flex-col gap-2 overflow-y-auto">
          <div className="space-y-1">
            {navigation.main.map((item) => (
              <SidebarNavItem
                key={item.label}
                item={item}
                collapsed={collapsed}
                active={currentPath === item.to || (!item.exact && currentPath.startsWith(item.to || ""))}
                onAction={onAction}
              />
            ))}
          </div>

          <div className="mt-2 space-y-1">
            {navigation.overflow.map((item) => (
              <SidebarNavItem
                key={item.label}
                item={item}
                collapsed={collapsed}
                active={false}
                onAction={onAction}
              />
            ))}
          </div>
          
        </nav>

        {!collapsed ? (
          <div className="relative" ref={accountMenuRef}>
            <button
              type="button"
              onClick={() => setAccountMenuOpen((current) => !current)}
              className={classNames(
                "w-full rounded-3xl border border-slate-800 p-4 text-left transition hover:border-app-500/30",
                accountMenuOpen ? "rounded-b-none border-b-transparent" : ""
              )}
              style={{ background: "var(--page-surface)" }}
              aria-haspopup="menu"
              aria-expanded={accountMenuOpen}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar name={`${user?.firstName || ""} ${user?.lastName || ""}`.trim()} size="md" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">
                      {`${user?.firstName || "Super"} ${user?.lastName || "Admin"}`}
                    </p>
                    <p className="truncate text-xs text-slate-400">{user?.email || "Platform owner"}</p>
                  </div>
                </div>
                <ChevronDown
                  className={classNames(
                    "mt-1 h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200",
                    accountMenuOpen ? "rotate-180 text-slate-200" : ""
                  )}
                />
              </div>
            </button>

            <AnimatePresence initial={false}>
              {accountMenuOpen ? (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden rounded-b-3xl border border-t-0 border-slate-800 shadow-soft"
                  style={{ background: "var(--page-background)" }}
                >
                  <div className="p-2">
                    <div className="grid gap-2">
                      {navigation.footer.map((item) => {
                        const Icon = item.icon;

                        return (
                          <button
                            key={item.label}
                            type="button"
                            onClick={() => {
                              setAccountMenuOpen(false);
                              onAction?.(item);
                            }}
                            className={classNames(
                              "flex items-center justify-between rounded-2xl border border-slate-800 px-4 py-3 text-left text-sm transition",
                              item.tone === "danger"
                                ? "text-rose-300 hover:border-rose-500/30 hover:bg-rose-500/10"
                                : "text-slate-200 hover:border-app-500/30 hover:bg-slate-700"
                            )}
                          >
                            <span className="flex items-center gap-3">
                              {Icon ? <Icon className="h-4 w-4" /> : null}
                              <span className="font-medium">{item.label}</span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        ) : null}
      </div>
    </aside>
  );
}

export default DashboardSidebar;
