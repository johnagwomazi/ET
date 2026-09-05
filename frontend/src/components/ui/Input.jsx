import { forwardRef, useId } from "react";
import { classNames } from "../../utils/classNames";

const Input = forwardRef(function Input(
  { className, label, error, helperText, type = "text", id, "aria-describedby": ariaDescribedBy, ...props },
  ref
) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const helperId = helperText ? `${inputId}-helper` : null;
  const errorId = error ? `${inputId}-error` : null;
  const describedBy = [ariaDescribedBy, helperId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <label className="block space-y-2">
      {label ? <span className="text-sm font-medium text-slate-200">{label}</span> : null}

      <input
        ref={ref}
        id={inputId}
        type={type}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        className={classNames(
          "h-11 w-full rounded-xl border border-slate-800 bg-slate-900 px-4 text-sm text-slate-100 placeholder:text-slate-500 shadow-sm outline-none transition focus:border-app-500 focus:ring-2 focus:ring-app-500/20",
          error && "border-rose-500 focus:border-rose-500 focus:ring-rose-500/20",
          className
        )}
        {...props}
      />

      {helperText ? <p id={helperId} className="text-xs text-slate-500">{helperText}</p> : null}
      {error ? <p id={errorId} className="text-xs text-rose-400" role="alert">{error}</p> : null}
    </label>
  );
});

export default Input;
