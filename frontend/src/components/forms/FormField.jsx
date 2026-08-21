function FormField({ label, helperText, error, children }) {
  return (
    <label className="block space-y-2">
      {label ? <span className="text-sm font-medium text-slate-200">{label}</span> : null}
      {children}
      {helperText ? <p className="text-xs text-slate-500">{helperText}</p> : null}
      {error ? <p className="text-xs text-rose-400">{error}</p> : null}
    </label>
  );
}

export default FormField;
