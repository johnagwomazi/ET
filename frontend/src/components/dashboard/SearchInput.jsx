import { Search } from "lucide-react";
import { classNames } from "../../utils/classNames";

function SearchInput({ label = "Search", value, onChange, placeholder = "Search...", className }) {
  return (
    <label className={classNames("block space-y-2", className)}>
      <span className="text-sm font-medium text-slate-200">{label}</span>
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <input
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="h-11 w-full rounded-xl border border-slate-800 bg-slate-900 pl-11 pr-4 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-app-500 focus:ring-2 focus:ring-app-500/20"
        />
      </div>
    </label>
  );
}

export default SearchInput;
