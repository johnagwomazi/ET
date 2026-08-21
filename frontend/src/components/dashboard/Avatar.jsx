import { classNames } from "../../utils/classNames";
import { getInitials } from "../../utils/formatters";

function Avatar({ name, src, size = "md", className }) {
  const sizeClasses = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-12 w-12 text-base",
  };

  if (src) {
    return (
      <img
        src={src}
        alt={name || "Avatar"}
        className={classNames("rounded-full object-cover", sizeClasses[size], className)}
      />
    );
  }

  return (
    <div
      className={classNames(
        "inline-flex items-center justify-center rounded-full bg-app-500 font-semibold text-white shadow-lg shadow-app-500/20",
        sizeClasses[size],
        className
      )}
      aria-hidden="true"
    >
      {getInitials(name)}
    </div>
  );
}

export default Avatar;
