import { Link, NavLink, Outlet } from "react-router-dom";
import { useAdminAuth } from "../lib/adminAuth";
import { Button } from "./ui/Button";

const navLink = ({ isActive }: any) =>
  "block rounded-xl px-3 py-2 text-sm " +
  (isActive ? "bg-zinc-900 text-white" : "text-zinc-700 hover:bg-zinc-100");

export function AppLayout() {
  const { me, logout, meStale, lastAuthError, refreshMe } = useAdminAuth();

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="mx-auto max-w-6xl p-4 grid gap-4 lg:grid-cols-[240px_1fr]">
        <aside className="rounded-2xl border border-zinc-200 bg-white p-3 h-fit">
          <Link to="/school" className="block px-2 py-2">
            <div className="font-semibold">TapTell</div>
            <div className="text-xs text-zinc-500">
              {me?.school?.name ?? "School Admin"}
            </div>
          </Link>

          <div className="mt-2 space-y-1">
            <NavLink to="/school" end className={navLink}>
              Dashboard
            </NavLink>
            <NavLink to="/school/students" className={navLink}>
              Students
            </NavLink>
            <NavLink to="/school/cards" className={navLink}>
              Cards
            </NavLink>
            <NavLink to="/school/devices" className={navLink}>
              Devices
            </NavLink>
            <NavLink to="/school/attendance" className={navLink}>
              Attendance
            </NavLink>
          </div>

          <div className="mt-3 pt-3 border-t border-zinc-200">
            <Button className="w-full" variant="secondary" onClick={logout}>
              Logout
            </Button>
          </div>
        </aside>

        <main className="rounded-2xl border border-zinc-200 bg-white p-4">
          {/* ✅ Stale / offline banner (prevents "logout on refresh" UX) */}
          {meStale && (
            <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-3">
              <div className="font-semibold text-amber-900">
                Connection issue
              </div>
              <div className="mt-1 text-sm text-amber-900/80">
                Using last known session.{" "}
                {lastAuthError ? `(${lastAuthError})` : ""}
              </div>

              <div className="mt-2 flex flex-wrap gap-2">
                <Button variant="secondary" onClick={refreshMe}>
                  Retry
                </Button>
                <Button variant="secondary" onClick={logout}>
                  Logout
                </Button>
              </div>
            </div>
          )}

          <Outlet />
        </main>
      </div>
    </div>
  );
}
