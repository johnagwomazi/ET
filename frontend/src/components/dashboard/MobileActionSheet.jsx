import Button from "../ui/Button";
import Modal from "../ui/Modal";
import { classNames } from "../../utils/classNames";

function MobileActionSheet({ open, title = "Actions", description, items = [], onClose }) {
  const hasItems = items.length > 0;

  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      className="max-w-md"
      footer={
        <div className="flex justify-end">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {description ? <p className="text-sm leading-6 text-slate-400">{description}</p> : null}

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
                    onClose?.();
                    item.onClick?.();
                  }}
                    className={classNames(
                      "flex min-h-12 items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm transition",
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
            No actions available for this member.
          </div>
        )}
      </div>
    </Modal>
  );
}

export default MobileActionSheet;
