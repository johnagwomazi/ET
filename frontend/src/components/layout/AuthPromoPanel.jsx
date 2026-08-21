import { motion } from "framer-motion";
import { CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";

const highlights = [
  "Multi-tenant ready organization flow",
  "Role-aware access and session handling",
  "Production-ready foundation for SaaS growth",
];

function AuthPromoPanel() {
  return (
    <div
      className="relative hidden overflow-hidden rounded-[2rem] border border-slate-800/60 p-8 shadow-2xl shadow-slate-950/40 lg:flex lg:min-h-[42rem] lg:flex-col lg:justify-between"
      style={{ background: "var(--page-surface)" }}
    >
      <div className="absolute -right-12 top-10 h-40 w-40 rounded-full bg-app-500/20 blur-3xl" />
      <div className="absolute bottom-4 left-8 h-36 w-36 rounded-full bg-cyan-400/10 blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative space-y-6"
      >
        <span className="inline-flex items-center gap-2 rounded-full border border-slate-700 px-3 py-1 text-xs font-medium text-slate-300" style={{ background: "var(--page-surface-2)" }}>
          <Sparkles className="h-3.5 w-3.5 text-app-300" />
          Built for event platforms that grow
        </span>

        <div className="space-y-4">
          <h1 className="max-w-xl text-5xl font-semibold tracking-tight text-white">
            Host unforgettable events. Sell tickets effortlessly.
          </h1>
          <p className="max-w-lg text-base leading-7 text-slate-300">
            A clean foundation for customer, organizer, manager, and super admin flows with
            tenant-aware organization handling baked in from the start.
          </p>
        </div>
      </motion.div>

      <div className="relative space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { value: "01", label: "Customer-first" },
            { value: "02", label: "Organizer-ready" },
            { value: "03", label: "Role-aware" },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-slate-800 p-4" style={{ background: "var(--page-background)" }}>
              <p className="text-2xl font-semibold text-white">{item.value}</p>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{item.label}</p>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-slate-800 p-5" style={{ background: "var(--page-background)" }}>
          <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            Security and tenancy foundations
          </div>
          <ul className="mt-4 space-y-3 text-sm text-slate-400">
            {highlights.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-app-300" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default AuthPromoPanel;
