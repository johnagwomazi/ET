import { useId } from "react";
import { X } from "lucide-react";
import { createPortal } from "react-dom";
import Button from "./Button";
import { classNames } from "../../utils/classNames";
import { useDialogAccessibility } from "../../hooks/useDialogAccessibility";

function Modal({ open, title, children, onClose, footer, className }) {
  const titleId = useId();
  const dialogRef = useDialogAccessibility(open, onClose);

  if (!open) {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center app-overlay p-3 sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose?.();
        }
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={classNames(
          "flex max-h-[calc(100dvh-1.5rem)] min-w-0 w-full max-w-lg flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-900 shadow-soft sm:max-h-[85vh] sm:rounded-2xl",
          className
        )}
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-800 px-4 py-3 sm:px-5 sm:py-4">
          <h2 id={titleId} className="min-w-0 break-words text-base font-semibold text-slate-100 sm:text-lg">{title}</h2>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close modal">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="min-w-0 flex-1 overflow-y-auto px-4 py-3 text-[13px] text-slate-300 sm:px-5 sm:py-4 sm:text-sm">{children}</div>

        {footer ? <div className="border-t border-slate-800 px-4 py-3 sm:px-5 sm:py-4">{footer}</div> : null}
      </div>
    </div>,
    document.body
  );
}

export default Modal;
