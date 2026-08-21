import Button from "../ui/Button";
import { classNames } from "../../utils/classNames";

function SectionHeader({ eyebrow, title, description, actions, className }) {
  return (
    <div className={classNames("flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="space-y-1">
        {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.2em] text-app-300">{eyebrow}</p> : null}
        <h2 className="text-xl font-semibold text-white">{title}</h2>
        {description ? <p className="max-w-2xl text-sm leading-6 text-slate-400">{description}</p> : null}
      </div>

      {actions ? (
        <div className="flex flex-wrap items-center gap-2">
          {actions.map((action) => (
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
            >
              {action.label}
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default SectionHeader;
