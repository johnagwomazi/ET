import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import Button from "../ui/Button";
import { ROUTE_PATHS } from "../../routes/routePaths";
import * as authService from "../../services/auth.service";
import { useSessionStore } from "../../store/useSessionStore";
import { getPostLoginRouteForUser } from "../../utils/auth";
import { savePendingGoogleRegistration } from "../../utils/pendingAuth";

const googleClientId = String(import.meta.env.VITE_GOOGLE_CLIENT_ID || "").trim();
let googleScriptPromise;

function loadGoogleIdentityScript() {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (googleScriptPromise) return googleScriptPromise;

  googleScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-google-identity="true"]');
    const script = existing || document.createElement("script");
    if (!existing) {
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.dataset.googleIdentity = "true";
      document.head.appendChild(script);
    }
    script.addEventListener("load", resolve, { once: true });
    script.addEventListener("error", () => reject(new Error("Google sign-in could not be loaded")), { once: true });
  });
  return googleScriptPromise;
}

function GoogleAuthButton({ accountType, returnTo }) {
  const containerRef = useRef(null);
  const navigate = useNavigate();
  const refreshCurrentUser = useSessionStore((state) => state.refreshCurrentUser);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (!googleClientId) return undefined;
    let active = true;

    loadGoogleIdentityScript()
      .then(() => {
        if (!active || !containerRef.current) return;
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: async ({ credential }) => {
            setIsLoading(true);
            try {
              const result = await authService.authenticateWithGoogle({
                credential,
                ...(accountType ? { accountType } : {}),
              });

              if (result.user) {
                const user = await refreshCurrentUser();
                toast.success("Signed in with Google");
                navigate(getPostLoginRouteForUser(user, returnTo));
                return;
              }

              savePendingGoogleRegistration({
                completionToken: result.completionToken,
                profile: result.profile,
                accountType: accountType || null,
              });
              navigate(result.requiresAccountType ? ROUTE_PATHS.SIGN_UP : `${ROUTE_PATHS.GOOGLE_COMPLETE}?accountType=${accountType}`);
            } catch (error) {
              toast.error(error.message || "Google sign-in failed");
            } finally {
              setIsLoading(false);
            }
          },
        });
        containerRef.current.replaceChildren();
        window.google.accounts.id.renderButton(containerRef.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          text: "continue_with",
          shape: "pill",
          width: Math.min(400, containerRef.current.clientWidth || 400),
        });
      })
      .catch((error) => {
        if (active) setLoadError(error.message);
      });

    return () => {
      active = false;
    };
  }, [accountType, navigate, refreshCurrentUser, returnTo]);

  if (!googleClientId) {
    return (
      <div className="space-y-2">
        <Button type="button" variant="secondary" className="w-full" disabled>
          Continue with Google
        </Button>
        <p className="text-center text-xs text-amber-300">Google authentication is not configured.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div ref={containerRef} className={isLoading ? "pointer-events-none flex min-h-10 justify-center opacity-60" : "flex min-h-10 justify-center"} />
      {isLoading ? <p className="text-center text-xs text-slate-400">Completing Google sign-in...</p> : null}
      {loadError ? <p className="text-center text-xs text-rose-400" role="alert">{loadError}</p> : null}
    </div>
  );
}

export default GoogleAuthButton;
