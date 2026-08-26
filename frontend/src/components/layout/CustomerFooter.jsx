import { Link } from "react-router-dom";
import BrandLogo from "./BrandLogo";
import PageContainer from "../ui/PageContainer";
import { APP_NAME } from "../../constants/app.constants";

function FooterLink({ children, to = "/" }) {
  return (
    <Link to={to} className="text-sm text-slate-400 transition hover:text-white">
      {children}
    </Link>
  );
}

function CustomerFooter() {
  return (
    <footer className="border-t border-slate-800/70 bg-slate-950/50">
      <PageContainer className="py-10 sm:py-12">
        <div className="grid gap-10 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div className="space-y-4">
            <BrandLogo />
            <p className="max-w-md text-sm leading-6 text-slate-400">
              Discover and explore public events on the same charcoal event platform used by organizers and teams.
            </p>
          </div>

          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Explore</p>
            <div className="flex flex-col gap-3">
              <FooterLink to="/#all-events">Events</FooterLink>
              <FooterLink to="/#categories">Categories</FooterLink>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Company</p>
            <div className="flex flex-col gap-3">
              <FooterLink to="/#hero">About</FooterLink>
              <FooterLink to="/#hero">Contact</FooterLink>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Support</p>
            <div className="flex flex-col gap-3">
              <FooterLink to="/#all-events">Help</FooterLink>
              <FooterLink to="/#popular-events">FAQ</FooterLink>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-slate-800/70 pt-5 text-sm text-slate-500">
          © 2026 {APP_NAME}
        </div>
      </PageContainer>
    </footer>
  );
}

export default CustomerFooter;
