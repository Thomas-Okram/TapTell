import { useEffect, useState } from "react";
import { useAdminAuth } from "../../lib/adminAuth";
import { devicesApi } from "../../lib/devicesApi";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Table } from "../../components/ui/Table";
import { Modal } from "../../components/ui/Modal";
import { useToasts } from "../../components/ui/Toasts";

type Device = {
  id?: string;
  _id?: string;
  name: string;
  location?: string;
  deviceKey?: string;
  isActive?: boolean;
};

function getId(x: any) {
  return String(x?.id ?? x?._id ?? "");
}
function asItems(res: any): any[] {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res?.devices)) return res.devices;
  return [];
}

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export default function Devices() {
  const { apiBase, adminKey } = useAdminAuth();
  const { push } = useToasts();

  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Device[]>([]);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Device | null>(null);
  const [form, setForm] = useState<Device>({
    name: "",
    location: "",
    isActive: true,
  });

  async function refresh() {
    setLoading(true);
    try {
      const res: any = await devicesApi.list(apiBase, adminKey);
      setItems(asItems(res));
    } catch (e: any) {
      push({ title: "Failed to load devices", message: e?.message });
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
    setForm({ name: "", location: "", isActive: true });
    setOpen(true);
  }

  function openEdit(d: any) {
    setEditing(d);
    setForm({
      name: d?.name ?? "",
      location: d?.location ?? "",
      isActive: d?.isActive ?? true,
    });
    setOpen(true);
  }

  async function save() {
    if (!form.name.trim()) {
      push({ title: "Name required", message: "Device name is required." });
      return;
    }
    try {
      if (editing) {
        await devicesApi.update(apiBase, adminKey, getId(editing), {
          name: form.name.trim(),
          location: form.location?.trim() || undefined,
          isActive: form.isActive,
        });
        push({ title: "Device updated" });
      } else {
        const res: any = await devicesApi.create(apiBase, adminKey, {
          name: form.name.trim(),
          location: form.location?.trim() || undefined,
        });
        const created = res?.device ?? res;
        const key = created?.deviceKey;
        push({
          title: "Device created",
          message: key ? "Device key returned. Copy it now." : undefined,
        });
      }
      setOpen(false);
      await refresh();
    } catch (e: any) {
      push({ title: "Save failed", message: e?.message });
    }
  }

  async function rotate(d: any) {
    const ok = window.confirm(
      `Rotate device key for "${d?.name}"?\n\nThis will break the kiosk until it is updated with the new key.`
    );
    if (!ok) return;
    try {
      const res: any = await devicesApi.rotateKey(apiBase, adminKey, getId(d));
      const newKey = res?.deviceKey ?? res?.key ?? res?.device?.deviceKey;
      push({
        title: "Key rotated",
        message: newKey ? "New key returned. Copy it now." : undefined,
      });
      await refresh();
    } catch (e: any) {
      push({ title: "Rotate failed", message: e?.message });
    }
  }

  async function deactivate(d: any) {
    const ok = window.confirm(`Deactivate device "${d?.name}"?`);
    if (!ok) return;
    try {
      await devicesApi.deactivate(apiBase, adminKey, getId(d));
      push({ title: "Device deactivated" });
      await refresh();
    } catch (e: any) {
      push({ title: "Deactivate failed", message: e?.message });
    }
  }

  async function copyKey(d: any) {
    const key = d?.deviceKey;
    if (!key) {
      push({
        title: "No key",
        message:
          "This row didn't include a deviceKey (check backend response).",
      });
      return;
    }
    const ok = await copy(key);
    push({
      title: ok ? "Copied" : "Copy failed",
      message: ok ? "Device key copied to clipboard." : "Clipboard blocked.",
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xl font-semibold">Devices</div>
          <div className="text-sm text-zinc-500">
            Manage kiosks and device keys
          </div>
        </div>
        <Button onClick={openCreate}>Add device</Button>
      </div>

      <Table>
        <thead className="bg-zinc-50 text-zinc-600">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Name</th>
            <th className="px-3 py-2 text-left font-medium">Location</th>
            <th className="px-3 py-2 text-left font-medium">Status</th>
            <th className="px-3 py-2 text-left font-medium">Device Key</th>
            <th className="px-3 py-2 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td className="px-3 py-3 text-zinc-500" colSpan={5}>
                Loading…
              </td>
            </tr>
          ) : items.length === 0 ? (
            <tr>
              <td className="px-3 py-3 text-zinc-500" colSpan={5}>
                No devices found.
              </td>
            </tr>
          ) : (
            items.map((d: any) => (
              <tr key={getId(d)} className="border-t border-zinc-200">
                <td className="px-3 py-2 font-medium">{d?.name}</td>
                <td className="px-3 py-2">{d?.location ?? "-"}</td>
                <td className="px-3 py-2">
                  {d?.isActive === false ? (
                    <span className="text-xs text-red-600">Inactive</span>
                  ) : (
                    <span className="text-xs text-emerald-700">Active</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <code className="text-xs">
                      {d?.deviceKey ? d.deviceKey.slice(0, 6) + "…" : "-"}
                    </code>
                    {d?.deviceKey && (
                      <Button variant="secondary" onClick={() => copyKey(d)}>
                        Copy
                      </Button>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2 text-right">
                  <div className="inline-flex flex-wrap justify-end gap-2">
                    <Button variant="secondary" onClick={() => openEdit(d)}>
                      Edit
                    </Button>
                    <Button variant="secondary" onClick={() => rotate(d)}>
                      Rotate key
                    </Button>
                    <Button variant="danger" onClick={() => deactivate(d)}>
                      Deactivate
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
        title={editing ? "Edit device" : "Add device"}
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
        <Card className="p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <div className="text-xs font-medium text-zinc-600 mb-1">
                Name *
              </div>
              <Input
                value={form.name}
                onChange={(e) =>
                  setForm((p) => ({ ...p, name: e.target.value }))
                }
                placeholder="Gate 1"
              />
            </div>
            <div className="sm:col-span-2">
              <div className="text-xs font-medium text-zinc-600 mb-1">
                Location
              </div>
              <Input
                value={form.location ?? ""}
                onChange={(e) =>
                  setForm((p) => ({ ...p, location: e.target.value }))
                }
                placeholder="Main entrance"
              />
            </div>

            {editing && (
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
            )}

            {!editing && (
              <div className="sm:col-span-2 text-[11px] text-zinc-500">
                After creating, the backend should return a <b>deviceKey</b>.
                Copy it and use it in the kiosk app setup later.
              </div>
            )}
          </div>
        </Card>
      </Modal>
    </div>
  );
}
