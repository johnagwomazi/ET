import { CalendarDays } from "lucide-react";
import { Link } from "react-router-dom";
import { APP_NAME } from "../../constants/app.constants";

function BrandLogo({ to = "/", className = "" }) {
  return (
    <Link to={to} className={`inline-flex items-center gap-3 ${className}`}>
      <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-app-500 text-white shadow-lg shadow-app-500/25">
        <CalendarDays className="h-5 w-5" />
      </span>
      <span className="flex flex-col leading-tight">
        <span className="text-base font-semibold tracking-tight text-white">{APP_NAME}</span>
        <span className="text-xs text-slate-400">Event management SaaS</span>
      </span>
    </Link>
  );
}

export default BrandLogo;
