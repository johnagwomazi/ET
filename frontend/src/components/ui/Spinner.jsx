function Spinner({ className = "" }) {
  return (
    <span
      className={`inline-block h-5 w-5 animate-spin rounded-full border-2 border-slate-500 border-t-transparent ${className}`}
      aria-hidden="true"
    />
  );
}

export default Spinner;
