import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import ErrorState from "../components/common/ErrorState";
import StatusBadge from "../components/dashboard/StatusBadge";
import { ROUTE_PATHS } from "../routes/routePaths";
import { useSessionStore } from "../store/useSessionStore";
import * as authService from "../services/auth.service";
import { formatDateTime } from "../utils/formatters";

function InvitationPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const currentUser = useSessionStore((state) => state.currentUser);
  const isAuthenticated = useSessionStore((state) => state.isAuthenticated);
  const refreshCurrentUser = useSessionStore((state) => state.refreshCurrentUser);
  const [invitation, setInvitation] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const invitationPath = `/invitations/${token}`;

  useEffect(() => {
    authService.getOrganizationInvitation(token)
      .then((result) => setInvitation(result.invitation))
      .catch((requestError) => setError(requestError.message || "This invitation is unavailable"))
      .finally(() => setLoading(false));
  }, [token]);

  async function acceptInvitation() {
    setAccepting(true);
    try {
      await authService.acceptOrganizationInvitation(token);
      await refreshCurrentUser();
      toast.success("Invitation accepted");
      navigate(ROUTE_PATHS.MANAGER_EVENTS, { replace: true });
    } catch (requestError) {
      toast.error(requestError.message || "Unable to accept invitation");
    } finally {
      setAccepting(false);
    }
  }

  if (loading) return <Card className="mx-auto max-w-2xl p-8 text-center text-slate-400">Loading invitation...</Card>;
  if (error || !invitation) return <ErrorState title="Invitation unavailable" message={error} />;
  const emailMatches = currentUser?.email?.toLowerCase() === invitation.email?.toLowerCase();

  return (
    <Card className="mx-auto max-w-2xl border-slate-800/70 bg-slate-950/90 p-5 sm:p-8">
      <div className="space-y-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-300">Organization invitation</p>
          <h1 className="mt-2 text-2xl font-semibold text-white">Join {invitation.organization?.name}</h1>
          <p className="mt-2 text-sm text-slate-400">Accept as {String(invitation.role).toLowerCase()} using {invitation.email}.</p>
        </div>
        <div className="space-y-3">
          {(invitation.events || []).map((event) => (
            <div key={event.id} className="flex flex-col gap-2 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div><p className="font-medium text-white">{event.eventName}</p><p className="text-sm text-slate-400">{formatDateTime(event.startAt)}</p></div>
              <StatusBadge status={event.status} />
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-500">Invitation expires {formatDateTime(invitation.expiresAt)}.</p>
        {isAuthenticated ? (
          <div className="space-y-3">
            {!emailMatches ? <p className="text-sm text-amber-300">Sign out and use {invitation.email} to accept this invitation.</p> : null}
            <Button className="w-full" onClick={acceptInvitation} isLoading={accepting} disabled={!emailMatches}>Accept invitation</Button>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <Button as={Link} to={ROUTE_PATHS.LOGIN} state={{ from: invitationPath }}>Sign in to accept</Button>
            <Button as={Link} variant="secondary" to={`${ROUTE_PATHS.REGISTER_CUSTOMER}?invitation=${encodeURIComponent(token)}`}>Create account</Button>
          </div>
        )}
      </div>
    </Card>
  );
}

export default InvitationPage;
