import { forwardRef } from "react";
import { classNames } from "../../utils/classNames";
import Spinner from "./Spinner";

const baseClasses =
  "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-app-400 focus:ring-offset-2 focus:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-60";

const variantClasses = {
  primary: "bg-app-500 text-white hover:bg-app-600",
  secondary: "bg-slate-700 text-slate-100 hover:bg-slate-700",
  ghost: "bg-transparent text-slate-200 hover:bg-slate-700",
  danger: "bg-rose-500 text-white hover:bg-rose-600",
};

const sizeClasses = {
  sm: "h-9 px-3 text-xs",
  md: "h-11 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

const Button = forwardRef(function Button(
  {
    as: Component = "button",
    className,
    variant = "primary",
    size = "md",
    type = "button",
    isLoading = false,
    loadingText,
    disabled,
    children,
    ...props
  },
  ref
) {
  const componentProps =
    Component === "button"
      ? { type, disabled: disabled || isLoading }
      : {
          "aria-disabled": disabled || isLoading ? "true" : undefined,
        };

  return (
    <Component
      ref={ref}
      className={classNames(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...componentProps}
      {...props}
    >
      {isLoading ? (
        <>
          <Spinner className="h-4 w-4 border-slate-200 border-t-transparent" />
          <span>{loadingText || children}</span>
        </>
      ) : (
        children
      )}
    </Component>
  );
});

export default Button;
