import { useEffect, useMemo, useState } from "react";
import { useAdminAuth } from "../../lib/adminAuth";
import { cardsApi } from "../../lib/cardsApi";
import { studentsApi } from "../../lib/studentsApi";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Table } from "../../components/ui/Table";
import { Modal } from "../../components/ui/Modal";
import { useToasts } from "../../components/ui/Toasts";

type CardModel = {
  id?: string;
  _id?: string;
  uid: string;
  status?: "UNASSIGNED" | "ASSIGNED" | "LOST" | "DISABLED";
  notes?: string;
  assignedStudentId?: string | null;
  student?: any;
};

type Student = {
  id?: string;
  _id?: string;
  name: string;
  className: string;
  sec: string;
  rollNumber: string;
};

function getId(x: any) {
  return String(x?.id ?? x?._id ?? "");
}
function asItems(res: any): any[] {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res?.cards)) return res.cards;
  return [];
}
function asStudents(res: any): any[] {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res?.students)) return res.students;
  return [];
}

function badgeClass(status?: string) {
  if (status === "ASSIGNED")
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "DISABLED") return "bg-zinc-100 text-zinc-600 border-zinc-200";
  if (status === "LOST") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-blue-50 text-blue-700 border-blue-200";
}

export default function Cards() {
  const { apiBase, adminKey } = useAdminAuth();
  const { push } = useToasts();

  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<CardModel[]>([]);

  // create
  const [createOpen, setCreateOpen] = useState(false);
  const [uid, setUid] = useState("");

  // edit
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<CardModel | null>(null);
  const [editStatus, setEditStatus] =
    useState<CardModel["status"]>("UNASSIGNED");
  const [notes, setNotes] = useState("");

  // assign
  const [assignOpen, setAssignOpen] = useState(false);
  const [assigning, setAssigning] = useState<CardModel | null>(null);
  const [studentQ, setStudentQ] = useState("");
  const [studentLoading, setStudentLoading] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);

  const query = useMemo(
    () => ({
      status: status || undefined,
      q: q || undefined,
    }),
    [status, q]
  );

  async function refresh() {
    setLoading(true);
    try {
      const res: any = await cardsApi.list(apiBase, adminKey, query);
      setItems(asItems(res));
    } catch (e: any) {
      push({ title: "Failed to load cards", message: e?.message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBase, adminKey, status, q]);

  async function createCard() {
    if (!uid.trim()) {
      push({ title: "UID required", message: "Enter a card UID." });
      return;
    }
    try {
      await cardsApi.create(apiBase, adminKey, { uid: uid.trim() });
      push({ title: "Card created" });
      setUid("");
      setCreateOpen(false);
      await refresh();
    } catch (e: any) {
      push({ title: "Create failed", message: e?.message });
    }
  }

  function openEdit(c: any) {
    const model: CardModel = c;
    setEditing(model);
    setEditStatus((model?.status as any) ?? "UNASSIGNED");
    setNotes(model?.notes ?? "");
    setEditOpen(true);
  }

  async function saveEdit() {
    if (!editing) return;
    try {
      await cardsApi.update(apiBase, adminKey, getId(editing), {
        status: editStatus,
        notes,
      });
      push({ title: "Card updated" });
      setEditOpen(false);
      await refresh();
    } catch (e: any) {
      push({ title: "Update failed", message: e?.message });
    }
  }

  async function disableCard(c: any) {
    const ok = window.confirm(`Disable card "${c?.uid}"?`);
    if (!ok) return;
    try {
      await cardsApi.disable(apiBase, adminKey, getId(c));
      push({ title: "Card disabled" });
      await refresh();
    } catch (e: any) {
      push({ title: "Disable failed", message: e?.message });
    }
  }

  async function unassign(c: any) {
    const ok = window.confirm(`Unassign card "${c?.uid}"?`);
    if (!ok) return;
    try {
      await cardsApi.unassign(apiBase, adminKey, getId(c));
      push({ title: "Card unassigned" });
      await refresh();
    } catch (e: any) {
      push({ title: "Unassign failed", message: e?.message });
    }
  }

  async function openAssign(c: any) {
    setAssigning(c);
    setStudentQ("");
    setStudents([]);
    setAssignOpen(true);
    await searchStudents("");
  }

  async function searchStudents(text: string) {
    setStudentLoading(true);
    try {
      const res: any = await studentsApi.list(apiBase, adminKey, {
        q: text || undefined,
      });
      setStudents(asStudents(res));
    } catch (e: any) {
      push({ title: "Failed to load students", message: e?.message });
    } finally {
      setStudentLoading(false);
    }
  }

  async function assignTo(st: any) {
    if (!assigning) return;
    try {
      await cardsApi.assign(apiBase, adminKey, getId(assigning), {
        studentId: getId(st),
      });
      push({ title: "Card assigned" });
      setAssignOpen(false);
      await refresh();
    } catch (e: any) {
      push({ title: "Assign failed", message: e?.message });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xl font-semibold">Cards</div>
          <div className="text-sm text-zinc-500">
            Create, assign/unassign, disable
          </div>
        </div>
        <Button onClick={() => setCreateOpen(true)}>Add card</Button>
      </div>

      <Card className="p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <div className="text-xs font-medium text-zinc-600 mb-1">Status</div>
            <select
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">All</option>
              <option value="UNASSIGNED">UNASSIGNED</option>
              <option value="ASSIGNED">ASSIGNED</option>
              <option value="LOST">LOST</option>
              <option value="DISABLED">DISABLED</option>
            </select>
          </div>
          <div>
            <div className="text-xs font-medium text-zinc-600 mb-1">Search</div>
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="uid / notes"
            />
          </div>
        </div>
      </Card>

      <Table>
        <thead className="bg-zinc-50 text-zinc-600">
          <tr>
            <th className="px-3 py-2 text-left font-medium">UID</th>
            <th className="px-3 py-2 text-left font-medium">Status</th>
            <th className="px-3 py-2 text-left font-medium">Assigned To</th>
            <th className="px-3 py-2 text-left font-medium">Notes</th>
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
                No cards found.
              </td>
            </tr>
          ) : (
            items.map((c: any) => {
              const st = c?.student;
              const assignedLabel = st
                ? `${st.name} (Class ${st.className}${st.sec}-${st.rollNumber})`
                : c?.assignedStudentId
                ? `Student ID: ${c.assignedStudentId}`
                : "-";

              return (
                <tr key={getId(c)} className="border-t border-zinc-200">
                  <td className="px-3 py-2 font-medium">{c?.uid}</td>
                  <td className="px-3 py-2">
                    <span
                      className={
                        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs " +
                        badgeClass(c?.status)
                      }
                    >
                      {c?.status ?? "UNASSIGNED"}
                    </span>
                  </td>
                  <td className="px-3 py-2">{assignedLabel}</td>
                  <td className="px-3 py-2">{c?.notes ?? "-"}</td>
                  <td className="px-3 py-2 text-right">
                    <div className="inline-flex flex-wrap justify-end gap-2">
                      <Button variant="secondary" onClick={() => openEdit(c)}>
                        Edit
                      </Button>

                      {c?.status !== "DISABLED" && (
                        <>
                          {c?.status === "ASSIGNED" ? (
                            <Button
                              variant="secondary"
                              onClick={() => unassign(c)}
                            >
                              Unassign
                            </Button>
                          ) : (
                            <Button onClick={() => openAssign(c)}>
                              Assign
                            </Button>
                          )}
                          <Button
                            variant="danger"
                            onClick={() => disableCard(c)}
                          >
                            Disable
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </Table>

      {/* Create */}
      <Modal
        open={createOpen}
        title="Add card"
        onClose={() => setCreateOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={createCard}>Create</Button>
          </>
        }
      >
        <div>
          <div className="text-xs font-medium text-zinc-600 mb-1">
            Card UID *
          </div>
          <Input
            value={uid}
            onChange={(e) => setUid(e.target.value)}
            placeholder="tap/scan UID…"
          />
          <div className="mt-1 text-[11px] text-zinc-500">
            UID must be unique per school.
          </div>
        </div>
      </Modal>

      {/* Edit */}
      <Modal
        open={editOpen}
        title={`Edit card${editing?.uid ? `: ${editing.uid}` : ""}`}
        onClose={() => setEditOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveEdit}>Save</Button>
          </>
        }
      >
        <div className="grid gap-3">
          <div>
            <div className="text-xs font-medium text-zinc-600 mb-1">Status</div>
            <select
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
              value={editStatus ?? "UNASSIGNED"}
              onChange={(e) => setEditStatus(e.target.value as any)}
            >
              <option value="UNASSIGNED">UNASSIGNED</option>
              <option value="ASSIGNED">ASSIGNED</option>
              <option value="LOST">LOST</option>
              <option value="DISABLED">DISABLED</option>
            </select>
          </div>
          <div>
            <div className="text-xs font-medium text-zinc-600 mb-1">Notes</div>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="optional"
            />
          </div>
          <div className="text-[11px] text-zinc-500">
            Note: Assign/unassign is a separate action.
          </div>
        </div>
      </Modal>

      {/* Assign */}
      <Modal
        open={assignOpen}
        title={assigning?.uid ? `Assign card: ${assigning.uid}` : "Assign card"}
        onClose={() => setAssignOpen(false)}
        footer={
          <Button variant="secondary" onClick={() => setAssignOpen(false)}>
            Close
          </Button>
        }
        className="max-w-2xl"
      >
        <div className="space-y-3">
          <div>
            <div className="text-xs font-medium text-zinc-600 mb-1">
              Find student
            </div>
            <Input
              value={studentQ}
              onChange={(e) => setStudentQ(e.target.value)}
              placeholder="name / roll / whatsapp…"
              onKeyDown={(e) => {
                if (e.key === "Enter") searchStudents(studentQ);
              }}
            />
            <div className="mt-2 flex gap-2">
              <Button
                variant="secondary"
                onClick={() => searchStudents(studentQ)}
                disabled={studentLoading}
              >
                {studentLoading ? "Searching…" : "Search"}
              </Button>
              <Button
                variant="secondary"
                onClick={() => searchStudents("")}
                disabled={studentLoading}
              >
                Reset
              </Button>
            </div>
          </div>

          <Table>
            <thead className="bg-zinc-50 text-zinc-600">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Student</th>
                <th className="px-3 py-2 text-left font-medium">Class</th>
                <th className="px-3 py-2 text-left font-medium">Sec</th>
                <th className="px-3 py-2 text-left font-medium">Roll</th>
                <th className="px-3 py-2 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {studentLoading ? (
                <tr>
                  <td className="px-3 py-3 text-zinc-500" colSpan={5}>
                    Loading…
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td className="px-3 py-3 text-zinc-500" colSpan={5}>
                    No students found.
                  </td>
                </tr>
              ) : (
                students.map((s: any) => (
                  <tr key={getId(s)} className="border-t border-zinc-200">
                    <td className="px-3 py-2 font-medium">{s?.name}</td>
                    <td className="px-3 py-2">{s?.className}</td>
                    <td className="px-3 py-2">{s?.sec}</td>
                    <td className="px-3 py-2">{String(s?.rollNumber ?? "")}</td>
                    <td className="px-3 py-2 text-right">
                      <Button onClick={() => assignTo(s)}>Assign</Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </div>
      </Modal>
    </div>
  );
}
