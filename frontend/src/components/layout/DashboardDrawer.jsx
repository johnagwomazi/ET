import { useId } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import Button from "../ui/Button";
import { useDialogAccessibility } from "../../hooks/useDialogAccessibility";

function DashboardDrawer({ open, title, subtitle, children, footer, onClose, side = "right", widthClass = "max-w-md" }) {
  const slideFrom = side === "left" ? { x: "-100%" } : { x: "100%" };
  const titleId = useId();
  const drawerRef = useDialogAccessibility(open, onClose);

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-50 app-overlay">
          <button type="button" aria-label="Close drawer" className="absolute inset-0 cursor-default" onClick={onClose} />

          <motion.aside
            ref={drawerRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={slideFrom}
            animate={{ x: 0 }}
            exit={slideFrom}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className={`absolute top-0 h-full min-w-0 w-full border-slate-800 shadow-soft ${side === "left" ? "left-0 border-r" : "right-0 border-l"} ${widthClass}`}
            style={{ background: "var(--page-surface)" }}
          >
            <div className="flex h-full flex-col">
              <div className="flex min-w-0 items-start justify-between gap-3 border-b border-slate-800 px-4 py-3 sm:px-6 sm:py-5">
                <div className="min-w-0 space-y-1">
                  <h3 id={titleId} className="break-words text-base font-semibold text-white sm:text-lg">{title}</h3>
                  {subtitle ? <p className="break-all text-xs leading-5 text-slate-400 sm:text-sm sm:leading-6">{subtitle}</p> : null}
                </div>

                <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close drawer">
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="min-w-0 flex-1 overflow-y-auto px-4 py-3 sm:px-6 sm:py-5">{children}</div>

              {footer ? <div className="border-t border-slate-800 px-4 py-3 sm:px-6 sm:py-4">{footer}</div> : null}
            </div>
          </motion.aside>
        </div>
      ) : null}
    </AnimatePresence>
  );
}

export default DashboardDrawer;
