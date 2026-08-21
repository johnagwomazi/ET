import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "../ui/Button";
import { classNames } from "../../utils/classNames";

function ConfirmationDialog({
  open,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  tone = "primary",
  requiresReason = false,
  reasonLabel = "Reason",
  reasonPlaceholder = "Add a reason...",
  isLoading = false,
  onCancel,
  onConfirm,
}) {
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (!open) {
      setReason("");
    }
  }, [open]);

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center app-overlay p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900 shadow-soft"
          >
            <div className="border-b border-slate-800 px-6 py-5">
              <h3 className="text-lg font-semibold text-white">{title}</h3>
              {message ? <p className="mt-2 text-sm leading-6 text-slate-400">{message}</p> : null}
            </div>

            <div className="space-y-4 px-6 py-5">
              {requiresReason ? (
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-slate-200">{reasonLabel}</span>
                  <textarea
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    placeholder={reasonPlaceholder}
                    rows={4}
                    className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-app-500 focus:ring-2 focus:ring-app-500/20"
                  />
                </label>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-800 px-6 py-4">
              <Button variant="ghost" onClick={onCancel} disabled={isLoading}>
                {cancelText}
              </Button>
              <Button
                variant={tone === "danger" ? "danger" : "primary"}
                onClick={() => onConfirm?.(requiresReason ? reason : undefined)}
                isLoading={isLoading}
              >
                {confirmText}
              </Button>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}

export default ConfirmationDialog;
