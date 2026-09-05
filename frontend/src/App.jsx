import AppRouter from "./routes/AppRouter";
import { useEffect } from "react";
import { useSessionStore } from "./store/useSessionStore";
import { useOrganizationContextStore } from "./store/useOrganizationContextStore";
import AppErrorBoundary from "./components/common/AppErrorBoundary";

function App() {
  const initializeSession = useSessionStore((state) => state.initializeSession);
  const currentUser = useSessionStore((state) => state.currentUser);
  const syncOrganizationContext = useOrganizationContextStore((state) => state.syncFromUser);

  useEffect(() => {
    initializeSession().catch(() => {});
  }, [initializeSession]);

  useEffect(() => {
    syncOrganizationContext(currentUser);
  }, [currentUser, syncOrganizationContext]);

  return (
    <AppErrorBoundary>
      <AppRouter />
    </AppErrorBoundary>
  );
}

export default App;
