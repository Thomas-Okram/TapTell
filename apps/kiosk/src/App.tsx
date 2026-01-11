// apps/kiosk/src/App.tsx
import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Setup from "./pages/Setup";
import Attend from "./pages/Attend";
import { getKioskConfig } from "./lib/storage";

function RequireSetup({ children }: { children: React.ReactNode }) {
  const cfg = getKioskConfig();
  if (!cfg) return <Navigate to="/setup" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <div className="min-h-full">
      <Routes>
        <Route path="/setup" element={<Setup />} />
        <Route
          path="/"
          element={
            <RequireSetup>
              <Attend />
            </RequireSetup>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
