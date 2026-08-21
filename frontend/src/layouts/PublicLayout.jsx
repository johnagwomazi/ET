import { Outlet } from "react-router-dom";

function PublicLayout() {
  return (
    <div className="min-h-screen app-shell">
      <main>
        <Outlet />
      </main>
    </div>
  );
}

export default PublicLayout;
