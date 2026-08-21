import Card from "../components/ui/Card";

function DashboardPlaceholderPage({ title, description }) {
  return (
    <Card className="border-slate-800/70 bg-slate-950/80">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-app-300">Dashboard shell</p>
        <h1 className="text-2xl font-semibold text-white">{title}</h1>
        <p className="text-sm leading-6 text-slate-400">{description}</p>
      </div>
    </Card>
  );
}

export default DashboardPlaceholderPage;
