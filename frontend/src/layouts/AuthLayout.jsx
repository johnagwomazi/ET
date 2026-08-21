import { Outlet } from "react-router-dom";
import PageContainer from "../components/ui/PageContainer";
import AuthPromoPanel from "../components/layout/AuthPromoPanel";
import BrandLogo from "../components/layout/BrandLogo";

function AuthLayout() {
  return (
    <div className="min-h-screen app-shell">
      <PageContainer className="py-6 lg:py-8">
        <div className="grid min-h-[calc(100vh-3rem)] gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-stretch">
          <AuthPromoPanel />

          <div className="flex min-h-full flex-col justify-center">
            <div className="mb-6 lg:hidden">
              <BrandLogo />
            </div>
            <Outlet />
          </div>
        </div>
      </PageContainer>
    </div>
  );
}

export default AuthLayout;
