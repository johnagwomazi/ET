import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import BrandLogo from "./BrandLogo";
import Button from "../ui/Button";
import PageContainer from "../ui/PageContainer";
import { ROUTE_PATHS } from "../../routes/routePaths";

function GuestNavbar() {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-800/60 backdrop-blur app-sidebar">
      <PageContainer className="flex h-20 items-center justify-between gap-4">
        <BrandLogo />

        <nav className="hidden items-center gap-2 md:flex">
          <Button as={Link} to="/#featured-events" variant="ghost" size="sm">
            Browse Events
          </Button>
          <Button as={Link} to={ROUTE_PATHS.LOGIN} variant="ghost" size="sm">
            Login
          </Button>
          <Button as={Link} to={ROUTE_PATHS.SIGN_UP} size="sm">
            Sign Up
            <ArrowRight className="h-4 w-4" />
          </Button>
        </nav>
      </PageContainer>
    </header>
  );
}

export default GuestNavbar;
