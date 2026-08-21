import Card from "../ui/Card";

function EmptyState({ title = "Nothing here yet", message }) {
  return (
    <Card className="mx-auto max-w-xl">
      <div className="space-y-2 text-center">
        <h2 className="text-xl font-semibold text-slate-100">{title}</h2>
        {message ? <p className="text-sm text-slate-400">{message}</p> : null}
      </div>
    </Card>
  );
}

export default EmptyState;
