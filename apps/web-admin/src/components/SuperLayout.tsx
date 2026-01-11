import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { Button } from "./ui/Button";
import { useAdminAuth } from "../lib/adminAuth";
import { getSuperSchoolId, setSuperSchoolId } from "../lib/storage";
import { superApi } from "../lib/superApi";
import { useToasts } from "./ui/Toasts";

const navLink = ({ isActive }: any) =>
  "block rounded-xl px-3 py-2 text-sm " +
  (isActive ? "bg-zinc-900 text-white" : "text-zinc-700 hover:bg-zinc-100");

function getId(x: any) {
  return String(x?.id ?? x?._id ?? "");
}
function asItems(res: any): any[] {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res?.schools)) return res.schools;
  return [];
}
function routeTitle(pathname: string) {
  if (pathname === "/super") return "Dashboard";
  if (pathname.startsWith("/super/schools")) return "Schools";
  if (pathname.startsWith("/super/school-admins"))
    return "Create School Admin Key";
  return "Super Admin";
}

export function SuperLayout() {
  const loc = useLocation();
  const { apiBase, adminKey, logout } = useAdminAuth();
  const { push } = useToasts();

  const [schools, setSchools] = useState<any[]>([]);
  const [schoolsLoading, setSchoolsLoading] = useState(false);

  const [schoolId, setSchoolId] = useState(getSuperSchoolId());

  const currentSchool = useMemo(() => {
    if (!schoolId) return null;
    return schools.find((s) => getId(s) === schoolId) ?? null;
  }, [schools, schoolId]);

  async function loadSchools(opts?: { silent?: boolean }) {
    setSchoolsLoading(true);
    try {
      const res: any = await superApi.schools.list(apiBase, adminKey);
      const it = asItems(res);
      setSchools(it);
      if (!opts?.silent) push({ title: "Schools refreshed" });
    } catch (e: any) {
      push({ title: "Failed to refresh schools", message: e?.message });
    } finally {
      setSchoolsLoading(false);
    }
  }

  useEffect(() => {
    if (apiBase && adminKey) loadSchools({ silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBase, adminKey]);

  function persistContext(next: string) {
    setSchoolId(next);
    setSuperSchoolId(next);

    if (!next) {
      push({
        title: "Context cleared",
        message: "Select a school when you need tenant-scoped actions.",
      });
      return;
    }

    // Prefer currentSchool name if already loaded
    const s = schools.find((x) => getId(x) === next);
    push({
      title: "Context set",
      message: s ? `${s.name} (${s.code})` : "School selected",
    });
  }

  const title = routeTitle(loc.pathname);

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="mx-auto max-w-6xl p-4 grid gap-4 lg:grid-cols-[260px_1fr]">
        {/* Sidebar */}
        <aside className="rounded-2xl border border-zinc-200 bg-white p-3 h-fit">
          <Link to="/super" className="block px-2 py-2">
            <div className="font-semibold">TapTell</div>
            <div className="text-xs text-zinc-500">Super Admin Panel</div>
          </Link>

          <div className="mt-3 space-y-1">
            <NavLink to="/super" end className={navLink}>
              Dashboard
            </NavLink>
            <NavLink to="/super/schools" className={navLink}>
              Schools
            </NavLink>
            <NavLink to="/super/school-admins" className={navLink}>
              Create School Admin Key
            </NavLink>
          </div>

          <div className="mt-3 pt-3 border-t border-zinc-200">
            <Button className="w-full" variant="secondary" onClick={logout}>
              Logout
            </Button>
          </div>
        </aside>

        {/* Main */}
        <div className="space-y-3">
          {/* Top bar */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <div className="text-lg font-semibold">{title}</div>
                  {schoolId && (
                    <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                      ✅ Context active
                    </span>
                  )}
                </div>

                <div className="text-sm text-zinc-500">
                  School Context:{" "}
                  <span className="font-medium text-zinc-800">
                    {currentSchool
                      ? `${currentSchool.name} (${currentSchool.code})`
                      : "Not selected"}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
                  value={schoolId}
                  onChange={(e) => persistContext(e.target.value)}
                  disabled={schoolsLoading}
                >
                  <option value="">
                    {schoolsLoading
                      ? "Loading schools…"
                      : "Select a school context…"}
                  </option>
                  {schools.map((s) => (
                    <option key={getId(s)} value={getId(s)}>
                      {s?.name} ({s?.code})
                    </option>
                  ))}
                </select>

                <Button
                  variant="secondary"
                  onClick={() => loadSchools()}
                  disabled={schoolsLoading}
                >
                  {schoolsLoading ? "Refreshing…" : "Refresh"}
                </Button>

                {schoolId && (
                  <Button
                    variant="secondary"
                    onClick={() => persistContext("")}
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Warning banner when context missing */}
          {!schoolId && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <div className="font-semibold text-amber-900">
                School Context not set
              </div>
              <div className="mt-1 text-sm text-amber-900/80">
                Some Super Admin actions and tenant reports require a selected
                school. Choose one from the dropdown above.
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link to="/super/schools">
                  <Button>Go to Schools</Button>
                </Link>
                <Button variant="secondary" onClick={() => loadSchools()}>
                  Refresh schools list
                </Button>
              </div>
            </div>
          )}

          {/* Page content */}
          <main className="rounded-2xl border border-zinc-200 bg-white p-4">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
