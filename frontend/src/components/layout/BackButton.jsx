import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

function BackButton({ to, label = "Back" }) {
  return (
    <Link to={to} className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-slate-200">
      <ArrowLeft className="h-4 w-4" />
      <span>{label}</span>
    </Link>
  );
}

export default BackButton;
