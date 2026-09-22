import { classNames } from "../../utils/classNames";

function Card({ className, children }) {
  return (
    <section
      className={classNames(
        "min-w-0 rounded-xl border border-slate-800/80 bg-slate-900/80 p-3 shadow-soft backdrop-blur sm:rounded-2xl sm:p-6",
        className
      )}
    >
      {children}
    </section>
  );
}

export default Card;
