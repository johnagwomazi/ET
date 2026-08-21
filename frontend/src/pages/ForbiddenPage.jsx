import { AlertTriangle } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import PageContainer from "../components/ui/PageContainer";
import { ROUTE_PATHS } from "../routes/routePaths";

function ForbiddenPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state || {};
  const fallbackRoute = ROUTE_PATHS.HOME;
  const actionLabel = "Back to home";

  const title = state.title || "Access denied";
  const message = state.message || "You do not have permission to access this page.";

  return (
    <PageContainer className="flex min-h-[calc(100vh-3rem)] items-center py-10">
      <Card className="mx-auto max-w-xl text-center">
        <div className="space-y-4">
          <AlertTriangle className="mx-auto h-10 w-10 text-amber-400" />
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-slate-100">{title}</h1>
            <p className="text-sm text-slate-400">{message}</p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <Button variant="secondary" onClick={() => navigate(fallbackRoute)}>
              {actionLabel}
            </Button>
          </div>
        </div>
      </Card>
    </PageContainer>
  );
}

export default ForbiddenPage;
