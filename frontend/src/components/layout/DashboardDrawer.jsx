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
            className={`absolute top-0 h-full w-full border-slate-800 shadow-soft ${side === "left" ? "left-0 border-r" : "right-0 border-l"} ${widthClass}`}
            style={{ background: "var(--page-surface)" }}
          >
            <div className="flex h-full flex-col">
              <div className="flex items-start justify-between border-b border-slate-800 px-6 py-5">
                <div className="space-y-1">
                  <h3 id={titleId} className="text-lg font-semibold text-white">{title}</h3>
                  {subtitle ? <p className="text-sm leading-6 text-slate-400">{subtitle}</p> : null}
                </div>

                <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close drawer">
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>

              {footer ? <div className="border-t border-slate-800 px-6 py-4">{footer}</div> : null}
            </div>
          </motion.aside>
        </div>
      ) : null}
    </AnimatePresence>
  );
}

export default DashboardDrawer;
