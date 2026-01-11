import { useEffect, useState } from "react";
import { useAdminAuth } from "../../lib/adminAuth";
import { superApi } from "../../lib/superApi";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { useToasts } from "../../components/ui/Toasts";

function asItems(res: any): any[] {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res?.schools)) return res.schools;
  return [];
}
function getId(x: any) {
  return String(x?.id ?? x?._id ?? "");
}

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export default function CreateSchoolAdmin() {
  const { apiBase, adminKey } = useAdminAuth();
  const { push } = useToasts();

  const [schools, setSchools] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [schoolId, setSchoolId] = useState("");

  const [result, setResult] = useState<{
    adminId?: string;
    key?: string;
  } | null>(null);

  async function loadSchools() {
    setLoading(true);
    try {
      const res: any = await superApi.schools.list(apiBase, adminKey);
      const it = asItems(res);
      setSchools(it);
      if (!schoolId && it.length > 0) setSchoolId(getId(it[0]));
    } catch (e: any) {
      push({ title: "Failed to load schools", message: e?.message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSchools();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBase, adminKey]);

  async function create() {
    if (!name.trim() || !schoolId) {
      push({
        title: "Missing fields",
        message: "Name and school are required.",
      });
      return;
    }
    try {
      const res: any = await superApi.createSchoolAdmin(apiBase, adminKey, {
        name: name.trim(),
        schoolId,
      });
      setResult({ adminId: res?.adminId ?? res?.id, key: res?.key });
      setName("");
      push({
        title: "School admin created",
        message: "Key shown once. Copy and store it now.",
      });
    } catch (e: any) {
      push({ title: "Create failed", message: e?.message });
    }
  }

  async function copyKey() {
    if (!result?.key) return;
    const ok = await copy(result.key);
    push({ title: ok ? "Copied" : "Copy failed" });
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xl font-semibold">Create School Admin Key</div>
        <div className="text-sm text-zinc-500">
          Generates a one-time key for a school admin. Save it immediately.
        </div>
      </div>

      <Card className="p-4 space-y-3">
        <div>
          <div className="text-xs font-medium text-zinc-600 mb-1">
            Admin name *
          </div>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Priya Sharma"
          />
        </div>

        <div>
          <div className="text-xs font-medium text-zinc-600 mb-1">School *</div>
          <select
            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
            value={schoolId}
            onChange={(e) => setSchoolId(e.target.value)}
            disabled={loading}
          >
            {schools.map((s) => (
              <option key={getId(s)} value={getId(s)}>
                {s?.name} ({s?.code})
              </option>
            ))}
          </select>
          <div className="mt-1 text-[11px] text-zinc-500">
            School ID is stored in the admin record and used for tenant scoping.
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={create}>Generate key</Button>
          <Button variant="secondary" onClick={loadSchools} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh schools"}
          </Button>
        </div>
      </Card>

      {result?.key && (
        <Card className="p-4">
          <div className="text-sm font-semibold">One-time Admin Key</div>
          <div className="mt-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
            <code className="text-sm break-all">{result.key}</code>
          </div>
          <div className="mt-2 flex gap-2">
            <Button onClick={copyKey}>Copy key</Button>
            <Button variant="secondary" onClick={() => setResult(null)}>
              Hide
            </Button>
          </div>
          <div className="mt-2 text-xs text-zinc-500">
            This key is shown only once by backend. Store it securely.
          </div>
        </Card>
      )}
    </div>
  );
}
