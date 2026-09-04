import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  ArrowRight,
  ChevronDown,
  Clock3,
  LayoutDashboard,
  LogOut,
  Menu,
  Ticket,
  UserRound,
  X,
} from "lucide-react";
import BrandLogo from "./BrandLogo";
import Button from "../ui/Button";
import PageContainer from "../ui/PageContainer";
import Avatar from "../dashboard/Avatar";
import NotificationBell from "../notifications/NotificationBell";
import { ROUTE_PATHS } from "../../routes/routePaths";
import { USER_ROLES } from "../../constants/roles.constants";
import { useSessionStore } from "../../store/useSessionStore";
import { getDashboardRouteForRole } from "../../utils/auth";
import { useClickOutside } from "../../hooks/useClickOutside";

const navLinks = [
  { label: "Discover", to: "/#hero" },
  { label: "Categories", to: "/#categories" },
  { label: "Popular", to: "/#popular-events" },
  { label: "All Events", to: "/#all-events" },
];

function GuestNavbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const accountMenuRef = useRef(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const currentUser = useSessionStore((state) => state.currentUser);
  const isAuthenticated = useSessionStore((state) => state.isAuthenticated);
  const isInitializing = useSessionStore((state) => state.isInitializing);
  const logout = useSessionStore((state) => state.logout);

  const hasSession = isAuthenticated && Boolean(currentUser);
  const isCustomer = currentUser?.role === USER_ROLES.CUSTOMER;
  const dashboardRoute = getDashboardRouteForRole(currentUser?.role);
  const profileRoute = ROUTE_PATHS.CUSTOMER_PROFILE;
  const customerName = `${currentUser?.firstName || ""} ${currentUser?.lastName || ""}`.trim();

  useClickOutside(accountMenuRef, () => setIsAccountMenuOpen(false), isAccountMenuOpen);

  useEffect(() => {
    setIsMenuOpen(false);
    setIsAccountMenuOpen(false);
  }, [location.pathname, location.hash]);

  async function handleLogout() {
    setIsLoggingOut(true);

    try {
      await logout();
      setIsMenuOpen(false);
      setIsAccountMenuOpen(false);
      toast.success("Logged out successfully");
      navigate(ROUTE_PATHS.HOME);
    } finally {
      setIsLoggingOut(false);
    }
  }

  function renderSessionLoading(className = "") {
    return (
      <div
        className={`h-9 w-28 animate-pulse rounded-xl bg-slate-800 ${className}`}
        aria-label="Loading account navigation"
      />
    );
  }

  return (
    <header className="sticky top-0 z-30 border-b border-slate-800/60 backdrop-blur app-sidebar">
      <PageContainer className="flex min-h-20 items-center justify-between gap-4 py-4">
        <BrandLogo />

        <div className="hidden items-center gap-2 lg:flex">
          {navLinks.map((link) => (
            <Button key={link.label} as={Link} to={link.to} variant="ghost" size="sm">
              {link.label}
            </Button>
          ))}

          {isInitializing ? renderSessionLoading("ml-2") : null}

          {!isInitializing && !hasSession ? (
            <>
              <Button as={Link} to={ROUTE_PATHS.LOGIN} variant="ghost" size="sm">
                Login
              </Button>
              <Button as={Link} to={ROUTE_PATHS.SIGN_UP} size="sm">
                Get Started
                <ArrowRight className="h-4 w-4" />
              </Button>
            </>
          ) : null}

          {!isInitializing && hasSession ? (
            <>
              {!isCustomer ? (
                <Button as={Link} to={dashboardRoute} variant="secondary" size="sm">
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </Button>
              ) : null}

              <NotificationBell />

              <div className="relative" ref={accountMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsAccountMenuOpen((current) => !current)}
                  className="flex h-10 items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-2 text-left text-slate-200 transition hover:border-slate-700 hover:bg-slate-800"
                  aria-haspopup="menu"
                  aria-expanded={isAccountMenuOpen}
                >
                  <Avatar name={customerName || currentUser.email} size="sm" />
                  <span className="max-w-28 truncate text-sm font-medium">
                    {currentUser.firstName || "Account"}
                  </span>
                  <ChevronDown className={`h-4 w-4 text-slate-400 transition ${isAccountMenuOpen ? "rotate-180" : ""}`} />
                </button>

                {isAccountMenuOpen ? (
                  <div
                    className="absolute right-0 top-12 z-40 w-64 rounded-lg border border-slate-800 bg-slate-950 p-2 shadow-soft"
                    role="menu"
                  >
                    <div className="border-b border-slate-800 px-3 py-2">
                      <p className="truncate text-sm font-semibold text-white">{customerName || "Account"}</p>
                      <p className="truncate text-xs text-slate-400">{currentUser.email}</p>
                    </div>

                    <div className="grid gap-1 py-2">
                      {isCustomer ? (
                        <>
                          <Link
                            to={profileRoute}
                            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-300 transition hover:bg-slate-800 hover:text-white"
                            role="menuitem"
                          >
                            <UserRound className="h-4 w-4" />
                            My Profile
                          </Link>
                          <Link
                            to={ROUTE_PATHS.CUSTOMER_TICKETS}
                            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-300 transition hover:bg-slate-800 hover:text-white"
                            role="menuitem"
                          >
                            <Ticket className="h-4 w-4" />
                            My Tickets
                          </Link>
                          <Link
                            to={ROUTE_PATHS.CUSTOMER_HISTORY}
                            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-300 transition hover:bg-slate-800 hover:text-white"
                            role="menuitem"
                          >
                            <Clock3 className="h-4 w-4" />
                            History
                          </Link>
                        </>
                      ) : null}

                      <button
                        type="button"
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-rose-300 transition hover:bg-rose-500/10 disabled:opacity-60"
                        role="menuitem"
                      >
                        <LogOut className="h-4 w-4" />
                        {isLoggingOut ? "Logging out..." : "Logout"}
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </>
          ) : null}
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          {isInitializing ? renderSessionLoading() : null}
          {!isInitializing && !hasSession ? (
            <Button as={Link} to={ROUTE_PATHS.LOGIN} variant="ghost" size="sm">
              Login
            </Button>
          ) : null}
          {!isInitializing && hasSession ? <NotificationBell /> : null}
          {!isInitializing && hasSession && isCustomer ? (
            <button
              type="button"
              onClick={() => setIsMenuOpen((current) => !current)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-800 bg-slate-900 text-slate-200 transition hover:border-slate-700 hover:bg-slate-800"
              aria-label={isMenuOpen ? "Close customer menu" : "Open customer menu"}
              aria-expanded={isMenuOpen}
            >
              {isMenuOpen ? <X className="h-4 w-4" /> : <Avatar name={customerName || currentUser.email} size="sm" />}
            </button>
          ) : null}
          {!isInitializing && hasSession && !isCustomer ? (
            <Button as={Link} to={dashboardRoute} variant="secondary" size="sm">
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </Button>
          ) : null}
          {!hasSession || !isCustomer ? (
            <button
              type="button"
              onClick={() => setIsMenuOpen((current) => !current)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-slate-200 transition hover:border-slate-700 hover:bg-slate-800"
              aria-label={isMenuOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={isMenuOpen}
            >
              {isMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          ) : null}
        </div>
      </PageContainer>

      {isMenuOpen ? (
        <div className="border-t border-slate-800/60 bg-slate-950/95 lg:hidden">
          <PageContainer className="space-y-4 py-4">
            <nav className="grid gap-2">
              {navLinks.map((link) => (
                <Button
                  key={link.label}
                  as={Link}
                  to={link.to}
                  variant="ghost"
                  size="sm"
                  className="justify-start"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {link.label}
                </Button>
              ))}

              {hasSession && isCustomer ? (
                <>
                  <Button as={Link} to={profileRoute} variant="ghost" size="sm" className="justify-start">
                    <UserRound className="h-4 w-4" />
                    My Profile
                  </Button>
                  <Button as={Link} to={ROUTE_PATHS.CUSTOMER_TICKETS} variant="ghost" size="sm" className="justify-start">
                    <Ticket className="h-4 w-4" />
                    My Tickets
                  </Button>
                  <Button as={Link} to={ROUTE_PATHS.CUSTOMER_HISTORY} variant="ghost" size="sm" className="justify-start">
                    <Clock3 className="h-4 w-4" />
                    History
                  </Button>
                </>
              ) : null}
            </nav>

            {!isInitializing && !hasSession ? (
              <Button as={Link} to={ROUTE_PATHS.SIGN_UP} className="w-full" onClick={() => setIsMenuOpen(false)}>
                Get Started
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : null}

            {!isInitializing && hasSession ? (
              <Button
                variant="danger"
                className="w-full"
                onClick={handleLogout}
                isLoading={isLoggingOut}
                loadingText="Logging out..."
              >
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            ) : null}
          </PageContainer>
        </div>
      ) : null}
    </header>
  );
}

export default GuestNavbar;
