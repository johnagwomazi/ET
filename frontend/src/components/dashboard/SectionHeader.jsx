import Button from "../ui/Button";
import { classNames } from "../../utils/classNames";

function SectionHeader({ eyebrow, title, description, actions, className }) {
  return (
    <div className={classNames("flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4", className)}>
      <div className="space-y-1">
        {eyebrow ? <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-app-300 sm:text-xs sm:tracking-[0.2em]">{eyebrow}</p> : null}
        <h2 className="break-words text-lg font-semibold text-white sm:text-xl">{title}</h2>
        {description ? <p className="max-w-2xl text-xs leading-5 text-slate-400 sm:text-sm sm:leading-6">{description}</p> : null}
      </div>

      {actions ? (
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {actions.map((action) => {
            const Icon = action.icon;

            return (
              <Button
                key={action.label}
                as={action.as}
                variant={action.variant || "secondary"}
                size={action.size || "sm"}
                onClick={action.onClick}
                isLoading={action.isLoading}
                loadingText={action.loadingText}
                className={action.className}
                to={action.to}
                replace={action.replace}
                state={action.state}
                aria-label={action.ariaLabel}
                disabled={action.disabled}
              >
                {Icon ? <Icon className="h-4 w-4" aria-hidden="true" /> : null}
                {action.label}
              </Button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export default SectionHeader;
