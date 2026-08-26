import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Menu, X } from "lucide-react";
import BrandLogo from "./BrandLogo";
import Button from "../ui/Button";
import PageContainer from "../ui/PageContainer";
import { ROUTE_PATHS } from "../../routes/routePaths";

const navLinks = [
  { label: "Discover", to: "/#hero" },
  { label: "Categories", to: "/#categories" },
  { label: "Popular", to: "/#popular-events" },
  { label: "All Events", to: "/#all-events" },
];

function GuestNavbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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
          <Button as={Link} to={ROUTE_PATHS.LOGIN} variant="ghost" size="sm">
            Login
          </Button>
          <Button as={Link} to={ROUTE_PATHS.SIGN_UP} size="sm">
            Get Started
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <Button as={Link} to={ROUTE_PATHS.LOGIN} variant="ghost" size="sm">
            Login
          </Button>
          <button
            type="button"
            onClick={() => setIsMenuOpen((current) => !current)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-slate-200 transition hover:border-slate-700 hover:bg-slate-800"
            aria-label={isMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={isMenuOpen}
          >
            {isMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
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
            </nav>
            <Button as={Link} to={ROUTE_PATHS.SIGN_UP} className="w-full" onClick={() => setIsMenuOpen(false)}>
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Button>
          </PageContainer>
        </div>
      ) : null}
    </header>
  );
}

export default GuestNavbar;
