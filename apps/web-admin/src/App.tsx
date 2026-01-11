// apps/web-admin/src/App.tsx
import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAdminAuth } from "./lib/adminAuth";

import Login from "./pages/Login";

import SchoolDashboard from "./pages/school/Dashboard";
import Students from "./pages/school/Students";
import Cards from "./pages/school/Cards";
import Devices from "./pages/school/Devices";
import Attendance from "./pages/school/Attendance";

import SuperDashboard from "./pages/super/Dashboard";
import SuperSchools from "./pages/super/Schools";
import CreateSchoolAdmin from "./pages/super/CreateSchoolAdmin";

import { AppLayout } from "./components/AppLayout";
import { SuperLayout } from "./components/SuperLayout";

function AuthedHome() {
  const { role } = useAdminAuth();
  if (role === "SUPER_ADMIN") return <Navigate to="/super" replace />;
  return <Navigate to="/school" replace />;
}

function RequireRole({
  role,
  children,
}: {
  role: "SUPER_ADMIN" | "SCHOOL_ADMIN";
  children: React.ReactNode;
}) {
  const { isAuthed, role: current } = useAdminAuth();
  if (!isAuthed) return <Navigate to="/login" replace />;
  if (current !== role) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<AuthedHome />} />

      {/* School Admin area */}
      <Route
        path="/school"
        element={
          <RequireRole role="SCHOOL_ADMIN">
            <AppLayout />
          </RequireRole>
        }
      >
        <Route index element={<SchoolDashboard />} />
        <Route path="students" element={<Students />} />
        <Route path="cards" element={<Cards />} />
        <Route path="devices" element={<Devices />} />
        <Route path="attendance" element={<Attendance />} />
      </Route>

      {/* Super Admin area */}
      <Route
        path="/super"
        element={
          <RequireRole role="SUPER_ADMIN">
            <SuperLayout />
          </RequireRole>
        }
      >
        <Route index element={<SuperDashboard />} />
        <Route path="schools" element={<SuperSchools />} />
        <Route path="school-admins" element={<CreateSchoolAdmin />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
