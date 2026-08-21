import Button from "../ui/Button";
import Card from "../ui/Card";

function ErrorState({ title = "Something went wrong", message, onRetry }) {
  return (
    <Card className="mx-auto max-w-xl">
      <div className="space-y-4 text-center">
        <h2 className="text-xl font-semibold text-slate-100">{title}</h2>
        {message ? <p className="text-sm text-slate-400">{message}</p> : null}
        {onRetry ? (
          <Button onClick={onRetry} variant="secondary">
            Try again
          </Button>
        ) : null}
      </div>
    </Card>
  );
}

export default ErrorState;
