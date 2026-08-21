import { classNames } from "../../utils/classNames";

function FilterSelect({ label, value, onChange, options = [], className }) {
  return (
    <label className={classNames("block space-y-2", className)}>
      {label ? <span className="text-sm font-medium text-slate-200">{label}</span> : null}
      <select
        value={value}
        onChange={onChange}
        className="h-11 w-full rounded-xl border border-slate-800 bg-slate-900 px-4 text-sm text-slate-100 outline-none transition focus:border-app-500 focus:ring-2 focus:ring-app-500/20"
      >
        {options.map((option) => (
          <option key={option.value || "all"} value={option.value || ""}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export default FilterSelect;
