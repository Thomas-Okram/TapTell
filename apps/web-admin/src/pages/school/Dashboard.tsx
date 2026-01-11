import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAdminAuth } from "../../lib/adminAuth";
import { adminApi } from "../../lib/adminApi";
import { studentsApi } from "../../lib/studentsApi";
import { cardsApi } from "../../lib/cardsApi";
import { devicesApi } from "../../lib/devicesApi";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { useToasts } from "../../components/ui/Toasts";

function todayYMD() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
function asItems(res: any): any[] {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.items)) return res.items;
  return [];
}

export default function Dashboard() {
  const { apiBase, adminKey, me } = useAdminAuth();
  const { push } = useToasts();

  const [loading, setLoading] = useState(false);
  const [date] = useState(todayYMD());

  const [todayCount, setTodayCount] = useState<number | null>(null);
  const [studentsCount, setStudentsCount] = useState<number | null>(null);
  const [cardsCount, setCardsCount] = useState<number | null>(null);
  const [devicesCount, setDevicesCount] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [dash, students, cards, devices] = await Promise.all([
        adminApi.dashboard(apiBase, adminKey, { date }) as any,
        studentsApi.list(apiBase, adminKey) as any,
        cardsApi.list(apiBase, adminKey) as any,
        devicesApi.list(apiBase, adminKey) as any,
      ]);

      setTodayCount(dash?.todayAttendanceCount ?? 0);
      setStudentsCount(asItems(students).length);
      setCardsCount(asItems(cards).length);
      setDevicesCount(asItems(devices).length);
    } catch (e: any) {
      push({ title: "Dashboard load failed", message: e?.message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBase, adminKey]);

  const checklist = [
    {
      label: "Add students",
      done: (studentsCount ?? 0) > 0,
      to: "/school/students",
    },
    { label: "Add cards", done: (cardsCount ?? 0) > 0, to: "/school/cards" },
    { label: "Assign cards to students", done: false, to: "/school/cards" }, // we can compute later if backend returns status counts
    {
      label: "Add device (kiosk)",
      done: (devicesCount ?? 0) > 0,
      to: "/school/devices",
    },
    {
      label: "Start marking attendance",
      done: (todayCount ?? 0) > 0,
      to: "/school/attendance",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-2xl font-semibold">
            {me?.school?.name ?? "School Dashboard"}
          </div>
          <div className="text-sm text-zinc-500">Today: {date}</div>
        </div>
        <Button variant="secondary" onClick={load} disabled={loading}>
          {loading ? "Refreshing…" : "Refresh"}
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <div className="text-xs text-zinc-500">Today’s Attendance</div>
          <div className="mt-1 text-3xl font-semibold">{todayCount ?? "—"}</div>
          <Link
            to="/school/attendance"
            className="mt-2 inline-block text-sm underline"
          >
            View attendance
          </Link>
        </Card>

        <Card className="p-4">
          <div className="text-xs text-zinc-500">Students</div>
          <div className="mt-1 text-3xl font-semibold">
            {studentsCount ?? "—"}
          </div>
          <Link
            to="/school/students"
            className="mt-2 inline-block text-sm underline"
          >
            Manage students
          </Link>
        </Card>

        <Card className="p-4">
          <div className="text-xs text-zinc-500">Cards</div>
          <div className="mt-1 text-3xl font-semibold">{cardsCount ?? "—"}</div>
          <Link
            to="/school/cards"
            className="mt-2 inline-block text-sm underline"
          >
            Manage cards
          </Link>
        </Card>

        <Card className="p-4">
          <div className="text-xs text-zinc-500">Devices</div>
          <div className="mt-1 text-3xl font-semibold">
            {devicesCount ?? "—"}
          </div>
          <Link
            to="/school/devices"
            className="mt-2 inline-block text-sm underline"
          >
            Manage devices
          </Link>
        </Card>
      </div>

      {/* Setup checklist + quick actions */}
      <div className="grid gap-3 lg:grid-cols-2">
        <Card className="p-4">
          <div className="font-semibold">Setup Checklist</div>
          <div className="mt-1 text-sm text-zinc-500">
            Complete these steps to start smooth attendance.
          </div>

          <div className="mt-3 space-y-2">
            {checklist.map((c) => (
              <div
                key={c.label}
                className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 p-3"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={c.done ? "text-emerald-700" : "text-zinc-400"}
                  >
                    {c.done ? "✅" : "⬜"}
                  </span>
                  <div className="text-sm font-medium">{c.label}</div>
                </div>
                <Link to={c.to} className="text-sm underline">
                  Open
                </Link>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <div className="font-semibold">Quick Actions</div>
          <div className="mt-1 text-sm text-zinc-500">
            Common tasks in one click.
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <Link to="/school/students">
              <Button className="w-full">Add student</Button>
            </Link>
            <Link to="/school/cards">
              <Button className="w-full" variant="secondary">
                Add card
              </Button>
            </Link>
            <Link to="/school/devices">
              <Button className="w-full" variant="secondary">
                Add device
              </Button>
            </Link>
            <Link to="/school/attendance">
              <Button className="w-full" variant="secondary">
                View today
              </Button>
            </Link>
          </div>

          <div className="mt-3 text-xs text-zinc-500">
            Tip: Devices page shows deviceKey which you’ll use later in the
            kiosk app setup.
          </div>
        </Card>
      </div>
    </div>
  );
}
