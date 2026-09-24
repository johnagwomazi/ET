import { useState } from "react";
import { LockKeyhole } from "lucide-react";
import Button from "../ui/Button";
import Input from "../ui/Input";
import PasswordInput from "../ui/PasswordInput";
import { useSessionStore } from "../../store/useSessionStore";

function getUserId(user) {
  return user?.id || user?._id || null;
}

function SessionExpiredDialog() {
  const currentUser = useSessionStore((state) => state.currentUser);
  const requiresReauthentication = useSessionStore((state) => state.requiresReauthentication);
  const isLoading = useSessionStore((state) => state.isLoading);
  const reauthenticate = useSessionStore((state) => state.reauthenticate);
  const logout = useSessionStore((state) => state.logout);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  if (!requiresReauthentication || !currentUser || !getUserId(currentUser)) {
    return null;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    try {
      await reauthenticate({
        email: currentUser.email,
        password,
      });
      setPassword("");
    } catch (submitError) {
      setError(submitError.message || "Unable to restore your session");
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="session-expired-title"
        className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-soft sm:p-6"
      >
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-app-500/10 p-3 text-app-300 ring-1 ring-app-500/20">
            <LockKeyhole className="h-5 w-5" />
          </div>
          <div>
            <h2 id="session-expired-title" className="text-lg font-semibold text-white">
              Sign in to continue
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-400">
              Your session has expired. This page and your unsaved changes will stay here while you sign in again.
            </p>
          </div>
        </div>

        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <Input label="Email" type="email" value={currentUser.email || ""} readOnly />
          <PasswordInput
            label="Password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoFocus
            required
            error={error}
          />
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" onClick={() => logout()} disabled={isLoading}>
              Sign out
            </Button>
            <Button type="submit" isLoading={isLoading} loadingText="Restoring session...">
              Continue
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default SessionExpiredDialog;
