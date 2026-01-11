import { useEffect, useMemo, useRef, useState } from "react";
import { useAdminAuth } from "../../lib/adminAuth";
import { adminApi } from "../../lib/adminApi";
import { attendanceApi } from "../../lib/attendanceApi";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Table } from "../../components/ui/Table";
import { Modal } from "../../components/ui/Modal";
import { useToasts } from "../../components/ui/Toasts";
import { getSuperSchoolId } from "../../lib/storage";

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

// Make a lightweight signature so we only update state when results actually changed
function signature(items: any[]) {
  return items
    .map((it) => {
      const id = String(it?.id ?? it?._id ?? "");
      const t = String(it?.time ?? it?.markedAt ?? it?.createdAt ?? "");
      const wa = String(it?.whatsappSentAt ?? "");
      const photo = String(it?.photoUrl ?? it?.arrivalPhotoUrl ?? "");
      return `${id}|${t}|${wa}|${photo}`;
    })
    .join("~");
}

export default function Attendance() {
  const { apiBase, adminKey, role } = useAdminAuth();
  const { push } = useToasts();

  const superSchoolId = useMemo(
    () => (role === "SUPER_ADMIN" ? getSuperSchoolId() : undefined),
    [role]
  );

  const [mode, setMode] = useState<"day" | "range">("day");

  const [date, setDate] = useState(todayYMD());
  const [from, setFrom] = useState(todayYMD());
  const [to, setTo] = useState(todayYMD());

  const [className, setClassName] = useState("");
  const [sec, setSec] = useState("");
  const [rollNumber, setRollNumber] = useState("");

  // Only used for first load or manual refresh; not used for live polling to avoid blink
  const [initialLoading, setInitialLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const [items, setItems] = useState<any[]>([]);
  const [count, setCount] = useState<number>(0);

  const [photoOpen, setPhotoOpen] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  const lastSigRef = useRef<string>("");
  const inFlightRef = useRef(false);

  const filters = useMemo(
    () => ({
      className: className || undefined,
      sec: sec || undefined,
      rollNumber: rollNumber || undefined,
    }),
    [className, sec, rollNumber]
  );

  function needSuperSchoolId(): boolean {
    if (role !== "SUPER_ADMIN") return false;
    if (superSchoolId) return false;

    push({
      title: "Select a school",
      message:
        "You are logged in as Super Admin. Please select a School on the dashboard before viewing attendance.",
    });
    return true;
  }

  async function load(opts?: { silent?: boolean }) {
    if (!apiBase || !adminKey) return;
    if (inFlightRef.current) return; // prevent overlapping calls
    if (needSuperSchoolId()) return;

    inFlightRef.current = true;
    const silent = Boolean(opts?.silent);

    // silent refresh should NOT cause table replacement / blinking
    if (silent) setSyncing(true);
    else setInitialLoading(items.length === 0);

    try {
      let res: any;

      if (mode === "day") {
        res = await adminApi.attendanceDay(apiBase, adminKey, {
          date,
          schoolId: superSchoolId, // ✅ required for SUPER_ADMIN
        });

        const nextItems = res?.items ?? [];
        const nextSig = signature(nextItems);

        if (nextSig !== lastSigRef.current) {
          lastSigRef.current = nextSig;
          setItems(nextItems);
          setCount(res?.count ?? nextItems.length);
        } else {
          // still update count if backend provides it
          setCount(res?.count ?? nextItems.length);
        }
      } else {
        // range/report mode
        res = await attendanceApi.query(apiBase, adminKey, {
          from,
          to,
          ...filters,
          schoolId: superSchoolId, // ✅ required for SUPER_ADMIN
        });

        const nextItems = asItems(res);
        const nextSig = signature(nextItems);

        if (nextSig !== lastSigRef.current) {
          lastSigRef.current = nextSig;
          setItems(nextItems);
          setCount(res?.count ?? nextItems.length);
        } else {
          setCount(res?.count ?? nextItems.length);
        }
      }
    } catch (e: any) {
      // keep UI stable; don’t clear table
      push({ title: "Failed to load attendance", message: e?.message });
    } finally {
      inFlightRef.current = false;
      setInitialLoading(false);
      setSyncing(false);
    }
  }

  // Initial load + when controls change (immediate fetch)
  useEffect(() => {
    lastSigRef.current = "";
    setInitialLoading(true);
    load({ silent: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    apiBase,
    adminKey,
    role,
    superSchoolId, // ✅ important
    mode,
    date,
    from,
    to,
    filters.className,
    filters.sec,
    filters.rollNumber,
  ]);

  // ✅ Live updates: Day mode only, every 2.5s, silent (no blink)
  useEffect(() => {
    if (!apiBase || !adminKey) return;
    if (mode !== "day") return;
    if (role === "SUPER_ADMIN" && !superSchoolId) return;

    const id = window.setInterval(() => {
      load({ silent: true });
    }, 2500);

    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBase, adminKey, mode, date, role, superSchoolId]);

  function openPhoto(url?: string | null) {
    if (!url) {
      push({
        title: "No photo",
        message: "This entry does not have a photo URL.",
      });
      return;
    }
    setPhotoUrl(url);
    setPhotoOpen(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xl font-semibold flex items-center gap-2">
            Attendance
            {mode === "day" ? (
              <span className="text-xs text-zinc-500">
                Live{syncing ? " • syncing…" : ""}
              </span>
            ) : null}
          </div>
          <div className="text-sm text-zinc-500">
            View attendance marks, photos, and WhatsApp status
          </div>

          {role === "SUPER_ADMIN" && !superSchoolId ? (
            <div className="mt-1 text-xs text-amber-700">
              Super Admin: select a school first (Dashboard → School selector).
            </div>
          ) : null}
        </div>

        <Button onClick={() => load({ silent: false })} disabled={syncing}>
          Refresh
        </Button>
      </div>

      <Card className="p-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          <Button
            variant={mode === "day" ? "primary" : "secondary"}
            onClick={() => setMode("day")}
          >
            Day (Live)
          </Button>
          <Button
            variant={mode === "range" ? "primary" : "secondary"}
            onClick={() => setMode("range")}
          >
            Range / Report
          </Button>
        </div>

        {mode === "day" ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <div className="text-xs font-medium text-zinc-600 mb-1">Date</div>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2 text-sm text-zinc-500 flex items-end">
              Live feed updates every ~2.5s
            </div>
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <div className="text-xs font-medium text-zinc-600 mb-1">
                  From
                </div>
                <Input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                />
              </div>
              <div>
                <div className="text-xs font-medium text-zinc-600 mb-1">To</div>
                <Input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                />
              </div>
              <div className="text-sm text-zinc-500 flex items-end">
                Uses <code className="mx-1 text-xs">/api/attendance</code>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <div className="text-xs font-medium text-zinc-600 mb-1">
                  Class
                </div>
                <Input
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  placeholder="e.g. 7"
                />
              </div>
              <div>
                <div className="text-xs font-medium text-zinc-600 mb-1">
                  Sec
                </div>
                <Input
                  value={sec}
                  onChange={(e) => setSec(e.target.value)}
                  placeholder="e.g. A"
                />
              </div>
              <div>
                <div className="text-xs font-medium text-zinc-600 mb-1">
                  Roll
                </div>
                <Input
                  value={rollNumber}
                  onChange={(e) => setRollNumber(e.target.value)}
                  placeholder="e.g. 12"
                />
              </div>
            </div>
          </>
        )}
      </Card>

      <div className="text-sm text-zinc-600">
        Count: <span className="font-semibold">{count}</span>
      </div>

      <Table>
        <thead className="bg-zinc-50 text-zinc-600">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Time</th>
            <th className="px-3 py-2 text-left font-medium">Student</th>
            <th className="px-3 py-2 text-left font-medium">Class</th>
            <th className="px-3 py-2 text-left font-medium">Device</th>
            <th className="px-3 py-2 text-left font-medium">WhatsApp</th>
            <th className="px-3 py-2 text-right font-medium">Photo</th>
          </tr>
        </thead>
        <tbody>
          {initialLoading && items.length === 0 ? (
            <tr>
              <td className="px-3 py-3 text-zinc-500" colSpan={6}>
                Loading…
              </td>
            </tr>
          ) : items.length === 0 ? (
            <tr>
              <td className="px-3 py-3 text-zinc-500" colSpan={6}>
                No attendance records.
              </td>
            </tr>
          ) : (
            items.map((it: any) => {
              const t = it?.time ?? it?.markedAt ?? it?.createdAt;
              const student = it?.student ?? {};
              const device = it?.device ?? {};
              return (
                <tr
                  key={String(
                    it?.id ?? it?._id ?? `${t}-${student?.id ?? student?._id}`
                  )}
                  className="border-t border-zinc-200"
                >
                  <td className="px-3 py-2">
                    <div className="text-sm">
                      {t ? new Date(t).toLocaleString() : "-"}
                    </div>
                    {it?.status && (
                      <div className="text-xs text-zinc-500">{it.status}</div>
                    )}
                  </td>

                  <td className="px-3 py-2">
                    <div className="font-medium">{student?.name ?? "-"}</div>
                    <div className="text-xs text-zinc-500">
                      {student?.house ? `House: ${student.house}` : ""}
                    </div>
                  </td>

                  <td className="px-3 py-2">
                    {student?.className ?? "-"}
                    {student?.sec ? student.sec : ""}
                    {student?.rollNumber ? `-${student.rollNumber}` : ""}
                  </td>

                  <td className="px-3 py-2">
                    <div className="font-medium">{device?.name ?? "-"}</div>
                    <div className="text-xs text-zinc-500">
                      {device?.location ?? ""}
                    </div>
                  </td>

                  <td className="px-3 py-2">
                    {it?.whatsappSentAt ? (
                      <div>
                        <div className="text-xs text-emerald-700">Sent</div>
                        <div className="text-xs text-zinc-500">
                          {new Date(it.whatsappSentAt).toLocaleString()}
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-zinc-500">Not sent</div>
                    )}
                  </td>

                  <td className="px-3 py-2 text-right">
                    <Button
                      variant="secondary"
                      onClick={() =>
                        openPhoto(
                          it?.photoUrl ??
                            it?.arrivalPhotoUrl ??
                            it?.student?.photoUrl ??
                            null
                        )
                      }
                    >
                      View
                    </Button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </Table>

      <Modal
        open={photoOpen}
        title="Attendance Photo"
        onClose={() => setPhotoOpen(false)}
        footer={
          <Button variant="secondary" onClick={() => setPhotoOpen(false)}>
            Close
          </Button>
        }
        className="max-w-3xl"
      >
        {photoUrl ? (
          <div className="space-y-2">
            <img
              src={photoUrl}
              alt="Attendance"
              className="w-full rounded-xl border border-zinc-200"
            />
            <div className="text-xs text-zinc-500 break-all">{photoUrl}</div>
          </div>
        ) : (
          <div className="text-sm text-zinc-500">No photo.</div>
        )}
      </Modal>
    </div>
  );
}
