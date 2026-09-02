import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import GuestNavbar from "../components/layout/GuestNavbar";
import CustomerFooter from "../components/layout/CustomerFooter";

function PublicLayout() {
  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      const frame = window.requestAnimationFrame(() => {
        document.getElementById(location.hash.slice(1))?.scrollIntoView({ block: "start" });
      });

      return () => window.cancelAnimationFrame(frame);
    }

    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    return undefined;
  }, [location.pathname, location.search, location.hash]);

  return (
    <div className="flex min-h-screen flex-col app-shell">
      <GuestNavbar />
      <div className="flex-1">
        <Outlet />
      </div>
      <CustomerFooter />
    </div>
  );
}

export default PublicLayout;
