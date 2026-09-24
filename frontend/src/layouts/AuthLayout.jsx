import { Outlet } from "react-router-dom";
import PageContainer from "../components/ui/PageContainer";
import BrandLogo from "../components/layout/BrandLogo";

function AuthLayout() {
  return (
    <div className="relative min-h-screen overflow-hidden app-shell">
      <div className="pointer-events-none absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-app-500/10 blur-3xl" />
      <PageContainer className="relative flex min-h-screen items-center justify-center py-8 sm:py-12">
        <div className="w-full max-w-xl space-y-6">
          <div className="flex justify-center">
            <BrandLogo to={null} />
          </div>
          <Outlet />
        </div>
      </PageContainer>
    </div>
  );
}

export default AuthLayout;
