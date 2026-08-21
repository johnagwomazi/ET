import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import Button from "../ui/Button";
import { classNames } from "../../utils/classNames";

function DashboardBottomSheet({ open, title, description, items = [], onClose, onItemSelect }) {
  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-50 app-overlay">
          <button type="button" aria-label="Close sheet" className="absolute inset-0 cursor-default" onClick={onClose} />

          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="absolute inset-x-0 bottom-0 rounded-t-[2rem] border border-slate-800 shadow-soft"
            style={{ background: "var(--page-surface)" }}
          >
            <div className="flex items-start justify-between border-b border-slate-800 px-5 py-4">
              <div className="space-y-1">
                <h3 className="text-lg font-semibold text-white">{title}</h3>
                {description ? <p className="text-sm leading-6 text-slate-400">{description}</p> : null}
              </div>
              <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close sheet">
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid gap-2 px-4 py-4">
              {items.map((item) => {
                const Icon = item.icon;

                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => {
                      onItemSelect?.(item);
                    }}
                    className={classNames(
                      "flex items-center justify-between rounded-2xl border border-slate-800 px-4 py-3 text-left transition",
                      item.tone === "danger"
                        ? "text-rose-300 hover:border-rose-500/30 hover:bg-rose-500/10"
                        : "text-slate-200 hover:border-app-500/30 hover:bg-slate-900"
                    )}
                  >
                    <span className="flex items-center gap-3">
                      {Icon ? <Icon className="h-4 w-4" /> : null}
                      <span className="font-medium">{item.label}</span>
                    </span>
                    {item.comingSoon ? <span className="text-xs uppercase tracking-[0.18em] text-slate-500">Soon</span> : null}
                  </button>
                );
              })}
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}

export default DashboardBottomSheet;
