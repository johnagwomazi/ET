import { Link, useParams } from "react-router-dom";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import PageContainer from "../../components/ui/PageContainer";
import { ROUTE_PATHS } from "../../routes/routePaths";

function PublicEventDetailsPage() {
  const params = useParams();

  return (
    <PageContainer className="py-10 sm:py-14">
      <div className="mx-auto max-w-3xl">
        <Card className="space-y-6">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-app-300">Public event</p>
            <h1 className="text-3xl font-semibold text-white">Event details are coming next</h1>
            <p className="text-sm leading-6 text-slate-400">
              This route is in place for the Phase 4.3 customer event details work. The discovery cards can already
              navigate here without rewriting the home page later.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-sm text-slate-300">
            Event ID: <span className="font-medium text-white">{params.eventId || "N/A"}</span>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button as={Link} to={ROUTE_PATHS.HOME}>
              Back to discovery
            </Button>
          </div>
        </Card>
      </div>
    </PageContainer>
  );
}

export default PublicEventDetailsPage;
