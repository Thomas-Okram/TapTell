import { useEffect, useState } from "react";
import { superApi } from "../../lib/superApi";
import { useAdminAuth } from "../../lib/adminAuth";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Table } from "../../components/ui/Table";
import { Modal } from "../../components/ui/Modal";
import { useToasts } from "../../components/ui/Toasts";
import { getSuperSchoolId, setSuperSchoolId } from "../../lib/storage";

type School = {
  id?: string;
  _id?: string;
  name: string;
  code: string;
  timezone?: string;
  isActive?: boolean;
};

function getId(x: any) {
  return String(x?.id ?? x?._id ?? "");
}
function asItems(res: any): any[] {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res?.schools)) return res.schools;
  return [];
}

export default function Schools() {
  const { apiBase, adminKey } = useAdminAuth();
  const { push } = useToasts();

  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<School[]>([]);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<School | null>(null);
  const [form, setForm] = useState<School>({
    name: "",
    code: "",
    timezone: "Asia/Kolkata",
  });

  const [context, setContext] = useState(getSuperSchoolId());

  async function refresh() {
    setLoading(true);
    try {
      const res: any = await superApi.schools.list(apiBase, adminKey);
      setItems(asItems(res));
    } catch (e: any) {
      push({ title: "Failed to load schools", message: e?.message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBase, adminKey]);

  function openCreate() {
    setEditing(null);
    setForm({ name: "", code: "", timezone: "Asia/Kolkata" });
    setOpen(true);
  }

  function openEdit(s: any) {
    setEditing(s);
    setForm({
      name: s?.name ?? "",
      code: s?.code ?? "",
      timezone: s?.timezone ?? "",
    });
    setOpen(true);
  }

  async function save() {
    if (!form.name.trim() || !form.code.trim()) {
      push({ title: "Missing fields", message: "Name and code are required." });
      return;
    }
    try {
      if (editing) {
        await superApi.schools.update(apiBase, adminKey, getId(editing), {
          name: form.name.trim(),
          code: form.code.trim(),
          timezone: form.timezone?.trim() || undefined,
        });
        push({ title: "School updated" });
      } else {
        await superApi.schools.create(apiBase, adminKey, {
          name: form.name.trim(),
          code: form.code.trim(),
          timezone: form.timezone?.trim() || undefined,
        });
        push({ title: "School created" });
      }
      setOpen(false);
      await refresh();
    } catch (e: any) {
      push({ title: "Save failed", message: e?.message });
    }
  }

  async function remove(s: any) {
    const ok = window.confirm(`Delete school "${s?.name}"?`);
    if (!ok) return;
    try {
      await superApi.schools.remove(apiBase, adminKey, getId(s));
      push({ title: "School deleted" });
      await refresh();
    } catch (e: any) {
      push({ title: "Delete failed", message: e?.message });
    }
  }

  function setContextTo(s: any) {
    const id = getId(s);
    setSuperSchoolId(id);
    setContext(id);
    push({
      title: "Context saved",
      message: "School context set for super admin workflows.",
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xl font-semibold">Schools</div>
          <div className="text-sm text-zinc-500">Create and manage tenants</div>
        </div>
        <Button onClick={openCreate}>Add school</Button>
      </div>

      <Card className="p-4">
        <div className="text-sm">
          Current School Context:{" "}
          <span className="font-semibold">{context || "Not set"}</span>
        </div>
        <div className="text-xs text-zinc-500 mt-1">
          Context is helpful later when super admin wants report-style views for
          a specific school.
        </div>
      </Card>

      <Table>
        <thead className="bg-zinc-50 text-zinc-600">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Name</th>
            <th className="px-3 py-2 text-left font-medium">Code</th>
            <th className="px-3 py-2 text-left font-medium">Timezone</th>
            <th className="px-3 py-2 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td className="px-3 py-3 text-zinc-500" colSpan={4}>
                Loading…
              </td>
            </tr>
          ) : items.length === 0 ? (
            <tr>
              <td className="px-3 py-3 text-zinc-500" colSpan={4}>
                No schools found.
              </td>
            </tr>
          ) : (
            items.map((s: any) => (
              <tr key={getId(s)} className="border-t border-zinc-200">
                <td className="px-3 py-2">
                  <div className="font-medium">{s?.name}</div>
                  <div className="text-xs text-zinc-500">ID: {getId(s)}</div>
                </td>
                <td className="px-3 py-2">{s?.code}</td>
                <td className="px-3 py-2">{s?.timezone ?? "-"}</td>
                <td className="px-3 py-2 text-right">
                  <div className="inline-flex flex-wrap justify-end gap-2">
                    <Button variant="secondary" onClick={() => setContextTo(s)}>
                      Set context
                    </Button>
                    <Button variant="secondary" onClick={() => openEdit(s)}>
                      Edit
                    </Button>
                    <Button variant="danger" onClick={() => remove(s)}>
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </Table>

      <Modal
        open={open}
        title={editing ? "Edit school" : "Add school"}
        onClose={() => setOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save}>{editing ? "Save" : "Create"}</Button>
          </>
        }
      >
        <div className="grid gap-3">
          <div>
            <div className="text-xs font-medium text-zinc-600 mb-1">Name *</div>
            <Input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="TapTell Public School"
            />
          </div>
          <div>
            <div className="text-xs font-medium text-zinc-600 mb-1">Code *</div>
            <Input
              value={form.code}
              onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
              placeholder="TAP001"
            />
          </div>
          <div>
            <div className="text-xs font-medium text-zinc-600 mb-1">
              Timezone
            </div>
            <Input
              value={form.timezone ?? ""}
              onChange={(e) =>
                setForm((p) => ({ ...p, timezone: e.target.value }))
              }
              placeholder="Asia/Kolkata"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
