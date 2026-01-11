import { useEffect, useMemo, useState } from "react";
import { useAdminAuth } from "../../lib/adminAuth";
import { superApi } from "../../lib/superApi";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Table } from "../../components/ui/Table";

function pickItems(res: any) {
  if (Array.isArray(res)) return res;
  return res?.items ?? res?.schools ?? res?.admins ?? [];
}

function extractPin(res: any) {
  return (
    res?.pin ||
    res?.PIN ||
    res?.data?.pin ||
    res?.data?.PIN ||
    res?.result?.pin ||
    null
  );
}

export default function SuperDashboard() {
  const { apiBase, adminKey } = useAdminAuth();

  const [schools, setSchools] = useState<any[]>([]);
  const [admins, setAdmins] = useState<any[]>([]);

  const [schoolsCount, setSchoolsCount] = useState<number | null>(null);

  // create admin form
  const [newName, setNewName] = useState("");
  const [newSchoolId, setNewSchoolId] = useState("");

  // show-once pin panel
  const [pinOnce, setPinOnce] = useState<string | null>(null);
  const [pinTitle, setPinTitle] = useState<string>("");

  const schoolById = useMemo(() => {
    const m = new Map<string, any>();
    for (const s of schools) m.set(String(s.id || s._id), s);
    return m;
  }, [schools]);

  async function loadAll() {
    const sRes: any = await superApi.schools.list(apiBase, adminKey);
    const sItems = pickItems(sRes);
    setSchools(sItems);
    setSchoolsCount(sItems.length);

    const aRes: any = await superApi.schoolAdmins.list(apiBase, adminKey);
    const aItems = pickItems(aRes);
    setAdmins(aItems);
  }

  useEffect(() => {
    loadAll().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBase, adminKey]);

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore
    }
  }

  async function createAdminPin() {
    if (!newName.trim()) return;
    if (!newSchoolId.trim()) return;

    const res: any = await superApi.schoolAdmins.createPin(apiBase, adminKey, {
      name: newName.trim(),
      schoolId: newSchoolId.trim(),
    });

    const pin = extractPin(res);
    if (pin) {
      setPinTitle(`PIN created for ${newName.trim()}`);
      setPinOnce(String(pin));
    } else {
      setPinTitle("PIN created");
      setPinOnce("(PIN not returned)");
    }

    setNewName("");
    // keep school selected
    await loadAll();
  }

  async function rotatePin(adminId: string, adminName?: string) {
    const res: any = await superApi.schoolAdmins.rotatePin(
      apiBase,
      adminKey,
      adminId
    );
    const pin = extractPin(res);
    setPinTitle(`PIN rotated${adminName ? ` for ${adminName}` : ""}`);
    setPinOnce(pin ? String(pin) : "(PIN not returned)");
    await loadAll();
  }

  return (
    <div className="space-y-4">
      <div className="text-xl font-semibold">Super Admin</div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-4">
          <div className="text-sm text-zinc-500">Schools</div>
          <div className="text-3xl font-semibold mt-1">
            {schoolsCount ?? "…"}
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-sm text-zinc-500">School Admins</div>
          <div className="text-3xl font-semibold mt-1">{admins.length}</div>
        </Card>
      </div>

      {/* PIN show-once panel */}
      {pinOnce ? (
        <Card className="p-4 border border-zinc-900/10">
          <div className="text-sm font-semibold">{pinTitle}</div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <code className="rounded-xl bg-zinc-100 px-3 py-2 text-sm">
              {pinOnce}
            </code>
            <Button variant="secondary" onClick={() => copy(pinOnce)}>
              Copy PIN
            </Button>
            <Button variant="ghost" onClick={() => setPinOnce(null)}>
              Dismiss
            </Button>
          </div>
          <div className="mt-2 text-xs text-zinc-500">
            PIN is shown once — copy it now.
          </div>
        </Card>
      ) : null}

      {/* Create School Admin PIN */}
      <Card className="p-4">
        <div className="text-sm font-semibold">Create School Admin (PIN)</div>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <div className="md:col-span-1">
            <div className="mb-1 text-xs font-medium text-zinc-600">Name</div>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Office Admin"
            />
          </div>

          <div className="md:col-span-2">
            <div className="mb-1 text-xs font-medium text-zinc-600">School</div>
            <select
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
              value={newSchoolId}
              onChange={(e) => setNewSchoolId(e.target.value)}
            >
              <option value="">Select a school…</option>
              {schools.map((s: any) => (
                <option key={s.id || s._id} value={s.id || s._id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-3">
          <Button
            onClick={createAdminPin}
            disabled={!newName.trim() || !newSchoolId.trim()}
          >
            Create & show PIN
          </Button>
        </div>
      </Card>

      {/* Admin list */}
      <Table>
        <thead className="bg-zinc-50 text-left">
          <tr>
            <th className="p-3">Name</th>
            <th className="p-3">School</th>
            <th className="p-3">Active</th>
            <th className="p-3"></th>
          </tr>
        </thead>
        <tbody>
          {admins.map((a: any) => {
            const id = String(a.id || a._id);
            const s = a.school || schoolById.get(String(a.schoolId));
            const schoolLabel = s
              ? `${s.name ?? "School"}${s.code ? ` (${s.code})` : ""}`
              : a.schoolId
              ? String(a.schoolId)
              : "—";

            return (
              <tr key={id} className="border-t">
                <td className="p-3">{a.name ?? "—"}</td>
                <td className="p-3">{schoolLabel}</td>
                <td className="p-3">{a.isActive === false ? "No" : "Yes"}</td>
                <td className="p-3 text-right">
                  <Button
                    variant="secondary"
                    onClick={() => rotatePin(id, a.name)}
                  >
                    Rotate PIN
                  </Button>
                </td>
              </tr>
            );
          })}

          {!admins.length ? (
            <tr className="border-t">
              <td className="p-4 text-sm text-zinc-500" colSpan={4}>
                No school admins yet.
              </td>
            </tr>
          ) : null}
        </tbody>
      </Table>

      <div className="text-sm text-zinc-500">
        Use the left menu to manage Schools. Use this page to create/rotate
        School Admin PINs.
      </div>
    </div>
  );
}
