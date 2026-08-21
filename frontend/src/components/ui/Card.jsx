import { classNames } from "../../utils/classNames";

function Card({ className, children }) {
  return (
    <section
      className={classNames(
        "rounded-2xl border border-slate-800/80 bg-slate-900/80 p-6 shadow-soft backdrop-blur",
        className
      )}
    >
      {children}
    </section>
  );
}

export default Card;
