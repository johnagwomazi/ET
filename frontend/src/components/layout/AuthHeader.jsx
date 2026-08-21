function AuthHeader({ eyebrow, title, description }) {
  return (
    <div className="space-y-3">
      {eyebrow ? (
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-app-300">{eyebrow}</p>
      ) : null}
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">{title}</h1>
        {description ? <p className="text-sm leading-6 text-slate-400">{description}</p> : null}
      </div>
    </div>
  );
}

export default AuthHeader;
