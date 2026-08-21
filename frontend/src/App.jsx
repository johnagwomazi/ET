import AppRouter from "./routes/AppRouter";
import { useEffect } from "react";
import { useSessionStore } from "./store/useSessionStore";
import LoadingState from "./components/common/LoadingState";
import { useOrganizationContextStore } from "./store/useOrganizationContextStore";

function App() {
  const initializeSession = useSessionStore((state) => state.initializeSession);
  const isInitializing = useSessionStore((state) => state.isInitializing);
  const currentUser = useSessionStore((state) => state.currentUser);
  const syncOrganizationContext = useOrganizationContextStore((state) => state.syncFromUser);

  useEffect(() => {
    initializeSession().catch((error) => {
      console.log(error);
    });
  }, [initializeSession]);

  useEffect(() => {
    syncOrganizationContext(currentUser);
  }, [currentUser, syncOrganizationContext]);

  if (isInitializing) {
    return <LoadingState label="Loading application..." />;
  }

  return <AppRouter />;
}

export default App;
