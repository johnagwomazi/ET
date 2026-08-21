import { ChevronDown, MoreHorizontal } from "lucide-react";
import { useState } from "react";
import Button from "../ui/Button";
import { classNames } from "../../utils/classNames";
import Modal from "../ui/Modal";

function ActionMenu({ items = [], disabled = false, align = "right", showLabel = false, label = "Actions" }) {
  const [isOpen, setIsOpen] = useState(false);
  const hasItems = items.length > 0;

  return (
    <div className="inline-flex">
      <Button
        variant="ghost"
        size="sm"
        disabled={disabled}
        onClick={() => setIsOpen((current) => !current)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={label}
      >
        {showLabel ? (
          <>
            <span>{label}</span>
            <ChevronDown className="h-4 w-4" />
          </>
        ) : (
          <MoreHorizontal className="h-4 w-4" />
        )}
      </Button>

      <Modal
        open={isOpen}
        title="Row Actions"
        onClose={() => setIsOpen(false)}
        className="max-w-xl min-h-[32rem]"
        footer={
          <div className="flex justify-end">
            <Button variant="secondary" size="sm" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-400">Choose one of the available actions for this record.</p>

          {hasItems ? (
            <div className="grid gap-2">
              {items.map((item) => {
                const Icon = item.icon;

                return (
                  <button
                    key={item.label}
                    type="button"
                    disabled={item.disabled}
                    onClick={() => {
                      setIsOpen(false);
                      item.onClick?.();
                    }}
                  className={classNames(
                    "flex items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm transition",
                    item.tone === "danger"
                      ? "border-rose-500/20 text-rose-300 hover:bg-rose-500/10"
                        : "border-slate-800 text-slate-200 hover:border-app-500/30 hover:bg-slate-700",
                    item.disabled ? "cursor-not-allowed opacity-50" : ""
                  )}
                >
                    <span className="flex items-center gap-3">
                      {Icon ? <Icon className="h-4 w-4" /> : null}
                      <span className="font-medium">{item.label}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-5 text-sm text-slate-400">
              No actions available for this record.
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}

export default ActionMenu;
