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
      className="fixed inset-0 z-50 flex items-center justify-center app-overlay p-4"
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
          "flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-soft",
          className
        )}
      >
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <h2 id={titleId} className="text-lg font-semibold text-slate-100">{title}</h2>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close modal">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 text-sm text-slate-300">{children}</div>

        {footer ? <div className="border-t border-slate-800 px-5 py-4">{footer}</div> : null}
      </div>
    </div>,
    document.body
  );
}

export default Modal;
