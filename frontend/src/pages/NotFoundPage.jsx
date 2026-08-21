import { AlertTriangle } from "lucide-react";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import PageContainer from "../components/ui/PageContainer";
import { Link } from "react-router-dom";
import { ROUTE_PATHS } from "../routes/routePaths";

function NotFoundPage() {
  return (
    <PageContainer className="flex min-h-[calc(100vh-3rem)] items-center py-10">
      <Card className="mx-auto max-w-xl text-center">
        <div className="space-y-4">
          <AlertTriangle className="mx-auto h-10 w-10 text-amber-400" />
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-slate-100">Page not found</h1>
            <p className="text-sm text-slate-400">
              The route you requested does not exist yet.
            </p>
          </div>
          <Button as={Link} to={ROUTE_PATHS.HOME}>
            Back to home
          </Button>
        </div>
      </Card>
    </PageContainer>
  );
}

export default NotFoundPage;
