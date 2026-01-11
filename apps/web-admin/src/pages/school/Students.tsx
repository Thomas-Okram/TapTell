import { useEffect, useMemo, useState } from "react";
import { studentsApi } from "../../lib/studentsApi";
import { useAdminAuth } from "../../lib/adminAuth";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Table } from "../../components/ui/Table";
import { Modal } from "../../components/ui/Modal";
import { useToasts } from "../../components/ui/Toasts";

type Student = {
  id?: string;
  _id?: string;
  name: string;
  className: string;
  sec: string;
  rollNumber: string;
  house?: string;
  parentWhatsapp?: string;
  isActive?: boolean;
};

function getId(x: any) {
  return String(x?.id ?? x?._id ?? "");
}
function asItems(res: any): any[] {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res?.students)) return res.students;
  return [];
}

export default function Students() {
  const { apiBase, adminKey } = useAdminAuth();
  const { push } = useToasts();

  const [className, setClassName] = useState("");
  const [sec, setSec] = useState("");
  const [q, setQ] = useState("");

  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Student[]>([]);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);

  const [form, setForm] = useState<Student>({
    name: "",
    className: "",
    sec: "",
    rollNumber: "",
    house: "",
    parentWhatsapp: "",
    isActive: true,
  });

  const query = useMemo(
    () => ({
      className: className || undefined,
      sec: sec || undefined,
      q: q || undefined,
    }),
    [className, sec, q]
  );

  async function refresh() {
    setLoading(true);
    try {
      const res: any = await studentsApi.list(apiBase, adminKey, query);
      setItems(asItems(res));
    } catch (e: any) {
      push({ title: "Failed to load students", message: e?.message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBase, adminKey, className, sec, q]);

  function openCreate() {
    setEditing(null);
    setForm({
      name: "",
      className: className || "",
      sec: sec || "",
      rollNumber: "",
      house: "",
      parentWhatsapp: "",
      isActive: true,
    });
    setOpen(true);
  }

  function openEdit(s: any) {
    const st: Student = {
      ...s,
      name: s?.name ?? "",
      className: s?.className ?? "",
      sec: s?.sec ?? "",
      rollNumber: String(s?.rollNumber ?? ""),
      house: s?.house ?? "",
      parentWhatsapp: s?.parentWhatsapp ?? "",
      isActive: s?.isActive ?? true,
    };
    setEditing(st);
    setForm(st);
    setOpen(true);
  }

  async function save() {
    if (!form.name || !form.className || !form.sec || !form.rollNumber) {
      push({
        title: "Missing fields",
        message: "Name, Class, Sec, Roll are required.",
      });
      return;
    }
    try {
      if (editing) {
        await studentsApi.update(apiBase, adminKey, getId(editing), form);
        push({ title: "Student updated" });
      } else {
        await studentsApi.create(apiBase, adminKey, form);
        push({ title: "Student created" });
      }
      setOpen(false);
      await refresh();
    } catch (e: any) {
      push({ title: "Save failed", message: e?.message });
    }
  }

  async function remove(st: any) {
    const id = getId(st);
    if (!id) return;
    const ok = window.confirm(
      `Delete student "${st?.name}"? This is a soft delete.`
    );
    if (!ok) return;
    try {
      await studentsApi.remove(apiBase, adminKey, id);
      push({ title: "Student deleted" });
      await refresh();
    } catch (e: any) {
      push({ title: "Delete failed", message: e?.message });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xl font-semibold">Students</div>
          <div className="text-sm text-zinc-500">
            Manage student records (school-scoped)
          </div>
        </div>
        <Button onClick={openCreate}>Add student</Button>
      </div>

      <Card className="p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <div className="text-xs font-medium text-zinc-600 mb-1">Class</div>
            <Input
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              placeholder="e.g. 7"
            />
          </div>
          <div>
            <div className="text-xs font-medium text-zinc-600 mb-1">
              Section
            </div>
            <Input
              value={sec}
              onChange={(e) => setSec(e.target.value)}
              placeholder="e.g. A"
            />
          </div>
          <div>
            <div className="text-xs font-medium text-zinc-600 mb-1">Search</div>
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="name / roll / whatsapp"
            />
          </div>
        </div>
      </Card>

      <Table>
        <thead className="bg-zinc-50 text-zinc-600">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Name</th>
            <th className="px-3 py-2 text-left font-medium">Class</th>
            <th className="px-3 py-2 text-left font-medium">Sec</th>
            <th className="px-3 py-2 text-left font-medium">Roll</th>
            <th className="px-3 py-2 text-left font-medium">House</th>
            <th className="px-3 py-2 text-left font-medium">Parent WhatsApp</th>
            <th className="px-3 py-2 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td className="px-3 py-3 text-zinc-500" colSpan={7}>
                Loading…
              </td>
            </tr>
          ) : items.length === 0 ? (
            <tr>
              <td className="px-3 py-3 text-zinc-500" colSpan={7}>
                No students found.
              </td>
            </tr>
          ) : (
            items.map((s: any) => (
              <tr key={getId(s)} className="border-t border-zinc-200">
                <td className="px-3 py-2">
                  <div className="font-medium">{s?.name}</div>
                  {s?.isActive === false && (
                    <div className="text-xs text-red-600">Inactive</div>
                  )}
                </td>
                <td className="px-3 py-2">{s?.className}</td>
                <td className="px-3 py-2">{s?.sec}</td>
                <td className="px-3 py-2">{String(s?.rollNumber ?? "")}</td>
                <td className="px-3 py-2">{s?.house ?? "-"}</td>
                <td className="px-3 py-2">{s?.parentWhatsapp ?? "-"}</td>
                <td className="px-3 py-2 text-right">
                  <div className="inline-flex gap-2">
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
        title={editing ? "Edit student" : "Add student"}
        onClose={() => setOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save}>
              {editing ? "Save changes" : "Create"}
            </Button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <div className="text-xs font-medium text-zinc-600 mb-1">Name *</div>
            <Input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            />
          </div>

          <div>
            <div className="text-xs font-medium text-zinc-600 mb-1">
              Class *
            </div>
            <Input
              value={form.className}
              onChange={(e) =>
                setForm((p) => ({ ...p, className: e.target.value }))
              }
            />
          </div>
          <div>
            <div className="text-xs font-medium text-zinc-600 mb-1">
              Section *
            </div>
            <Input
              value={form.sec}
              onChange={(e) => setForm((p) => ({ ...p, sec: e.target.value }))}
            />
          </div>

          <div>
            <div className="text-xs font-medium text-zinc-600 mb-1">
              Roll Number *
            </div>
            <Input
              value={form.rollNumber}
              onChange={(e) =>
                setForm((p) => ({ ...p, rollNumber: e.target.value }))
              }
            />
          </div>
          <div>
            <div className="text-xs font-medium text-zinc-600 mb-1">House</div>
            <Input
              value={form.house ?? ""}
              onChange={(e) =>
                setForm((p) => ({ ...p, house: e.target.value }))
              }
            />
          </div>

          <div className="sm:col-span-2">
            <div className="text-xs font-medium text-zinc-600 mb-1">
              Parent WhatsApp
            </div>
            <Input
              value={form.parentWhatsapp ?? ""}
              onChange={(e) =>
                setForm((p) => ({ ...p, parentWhatsapp: e.target.value }))
              }
              placeholder="+91..."
            />
            <div className="mt-1 text-[11px] text-zinc-500">
              Used for WhatsApp arrival message.
            </div>
          </div>

          <div className="sm:col-span-2">
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isActive !== false}
                onChange={(e) =>
                  setForm((p) => ({ ...p, isActive: e.target.checked }))
                }
              />
              Active
            </label>
          </div>
        </div>
      </Modal>
    </div>
  );
}
