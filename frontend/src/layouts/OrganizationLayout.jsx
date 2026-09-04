import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Outlet } from "react-router-dom";
import { getOrganizationNavigation } from "../constants/dashboardNavigation";
import { ROUTE_PATHS } from "../routes/routePaths";
import { useSessionStore } from "../store/useSessionStore";
import { useOrganizationPermissions } from "../hooks/useOrganizationPermissions";
import DashboardSidebar from "../components/layout/DashboardSidebar";
import DashboardTopBar from "../components/layout/DashboardTopBar";
import DashboardBottomNav from "../components/layout/DashboardBottomNav";
import DashboardBottomSheet from "../components/layout/DashboardBottomSheet";
import { classNames } from "../utils/classNames";

function getPageTitleFromNavigation(navigation, pathname) {
  if (pathname === ROUTE_PATHS.ORGANIZATION_NOTIFICATIONS) {
    return "Notifications";
  }

  if (pathname.startsWith(ROUTE_PATHS.ORGANIZATION_ANALYTICS)) {
    return "Revenue & Analytics";
  }

  if (pathname.startsWith("/organization/events/") && pathname.endsWith("/analytics")) {
    return "Event Analytics";
  }

  if (pathname.startsWith(ROUTE_PATHS.ORGANIZATION_EVENT_CREATE)) {
    return "Create Event";
  }

  if (pathname.startsWith("/organization/events/") && pathname.endsWith("/edit")) {
    return "Edit Event";
  }

  if (pathname.startsWith(ROUTE_PATHS.ORGANIZATION_EVENTS) && pathname !== ROUTE_PATHS.ORGANIZATION_EVENTS) {
    return "Event Details";
  }

  if (pathname.startsWith(ROUTE_PATHS.ORGANIZATION_PROFILE)) {
    return "Organization Profile";
  }

  if (pathname.startsWith(ROUTE_PATHS.ORGANIZATION_SETTINGS)) {
    return "Organization Settings";
  }

  if (pathname.startsWith(ROUTE_PATHS.ORGANIZATION_EVENTS)) {
    return "Events";
  }

  const allItems = [...navigation.main, ...navigation.overflow];

  const activeItem = allItems.find((item) => {
    if (!item.to) {
      return false;
    }

    return item.exact ? pathname === item.to : pathname.startsWith(item.to);
  });

  if (activeItem) {
    return activeItem.label;
  }

  if (pathname.startsWith(ROUTE_PATHS.ORGANIZATION_DASHBOARD)) {
    return "Organization Dashboard";
  }

  return "Organization";
}

function OrganizationLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentUser = useSessionStore((state) => state.currentUser);
  const logout = useSessionStore((state) => state.logout);
  const { permissions } = useOrganizationPermissions();
  const navigation = useMemo(
    () => getOrganizationNavigation(permissions, currentUser?.role),
    [currentUser?.role, permissions]
  );

  const [moreSheetOpen, setMoreSheetOpen] = useState(false);

  const pageTitle = getPageTitleFromNavigation(navigation, location.pathname);
  const overflowItems = [...navigation.overflow, ...navigation.footer];

  useEffect(() => {
    setMoreSheetOpen(false);
  }, [location.pathname]);

  function handleNavigationAction(item) {
    if (!item) {
      return;
    }

    setMoreSheetOpen(false);

    if (item.to) {
      navigate(item.to);
      return;
    }

    if (item.action === "logout") {
      logout()
        .then(() => {
          toast.success("Logged out successfully");
          navigate(ROUTE_PATHS.HOME);
        })
        .catch((error) => {
          toast.error(error.message || "Unable to log out");
        });
      return;
    }

    if (item.action === "profile") {
      toast("Profile settings will be available in a future phase");
      return;
    }

    if (item.comingSoon) {
      toast("This section is coming soon");
    }
  }

  return (
    <div className="min-h-screen app-shell">
      <DashboardSidebar
        navigation={navigation}
        user={currentUser}
        onAction={handleNavigationAction}
        currentPath={location.pathname}
      />

      <DashboardSidebar
        navigation={navigation}
        user={currentUser}
        collapsed
        onAction={handleNavigationAction}
        currentPath={location.pathname}
      />

      <div className="min-h-screen lg:pl-72 md:pl-20">
        <DashboardTopBar title={pageTitle} user={currentUser} />

        <main className={classNames("px-4 pb-28 pt-6 sm:px-6 lg:px-8")}>
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
            <Outlet />
          </div>
        </main>
      </div>

      <DashboardBottomNav
        items={navigation.main.concat(navigation.overflow, navigation.footer)}
        pathname={location.pathname}
        onMoreClick={() => setMoreSheetOpen(true)}
        showMore={overflowItems.length > 0}
      />

      <DashboardBottomSheet
        open={moreSheetOpen}
        title="More"
        description="Additional dashboard sections and account actions"
        items={overflowItems}
        onClose={() => setMoreSheetOpen(false)}
        onItemSelect={handleNavigationAction}
      />
    </div>
  );
}

export default OrganizationLayout;
