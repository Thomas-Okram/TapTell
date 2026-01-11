import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "../lib/adminAuth";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Card } from "../components/ui/Card";
import { useToasts } from "../components/ui/Toasts";

function normalizeApiBase(input: string) {
  let v = input.trim();
  if (!v) return "";

  // Fix common typo: "http//" / "https//" -> "http://" / "https://"
  v = v.replace(/^http\/\//i, "http://").replace(/^https\/\//i, "https://");

  // If user typed "localhost:4000", add scheme
  if (!/^https?:\/\//i.test(v)) v = "http://" + v;

  // Remove trailing slashes
  v = v.replace(/\/+$/, "");

  return v;
}

async function healthCheck(base: string) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 4000);
  try {
    const res = await fetch(`${base}/health`, { signal: ctrl.signal });
    return res.ok;
  } finally {
    clearTimeout(t);
  }
}

async function loginWithPin(base: string, schoolCode: string, pin: string) {
  const res = await fetch(`${base}/api/admin/login-pin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ schoolCode: schoolCode.trim(), pin: pin.trim() }),
  });

  const j = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(j?.error || j?.message || `Login failed (${res.status})`);
  }

  // Backend might return token in different field names; handle safely:
  const token =
    j?.token || j?.adminKey || j?.key || j?.data?.token || j?.data?.adminKey;

  if (!token) throw new Error("Login did not return a token.");
  return String(token);
}

export default function Login() {
  const nav = useNavigate();
  const { push } = useToasts();
  const { login } = useAdminAuth(); // ✅ uses login()

  const [mode, setMode] = useState<"SCHOOL" | "SUPER">("SCHOOL");

  const [apiBase, setApiBase] = useState("");
  const [loading, setLoading] = useState(false);

  // School login
  const [schoolCode, setSchoolCode] = useState("");
  const [pin, setPin] = useState("");

  // Super login (optional)
  const [superKey, setSuperKey] = useState("");

  const normalizedBase = useMemo(() => normalizeApiBase(apiBase), [apiBase]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    const base = normalizeApiBase(apiBase);

    try {
      if (!base) throw new Error("API Base is required.");

      // quick connectivity test (prevents confusing /me timeouts)
      try {
        await healthCheck(base);
      } catch (err: any) {
        const msg =
          err?.name === "AbortError"
            ? "Server did not respond (timeout). Check API Base and backend is running."
            : "Cannot reach server. Check API Base and backend is running.";
        throw new Error(msg);
      }

      let token = "";

      if (mode === "SCHOOL") {
        if (!schoolCode.trim()) throw new Error("School Code is required.");
        if (!pin.trim()) throw new Error("PIN is required.");

        // ✅ login-pin returns token that becomes x-admin-key value
        token = await loginWithPin(base, schoolCode, pin);
      } else {
        if (!superKey.trim()) throw new Error("Super Admin Key is required.");
        token = superKey.trim();
      }

      // ✅ stores token as adminKey and loads /me
      await login(base, token);

      nav("/", { replace: true });
    } catch (err: any) {
      push({
        title: "Login failed",
        message: err?.message ?? "Check details / server",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-5">
        <div className="text-xl font-semibold">TapTell Admin</div>
        <div className="mt-1 text-sm text-zinc-500">
          School Admin uses School Code + PIN. Super Admin can use key.
        </div>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => setMode("SCHOOL")}
            className={[
              "flex-1 rounded-xl px-3 py-2 text-sm font-medium border",
              mode === "SCHOOL"
                ? "bg-zinc-900 text-white border-zinc-900"
                : "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50",
            ].join(" ")}
          >
            School Admin
          </button>
          <button
            type="button"
            onClick={() => setMode("SUPER")}
            className={[
              "flex-1 rounded-xl px-3 py-2 text-sm font-medium border",
              mode === "SUPER"
                ? "bg-zinc-900 text-white border-zinc-900"
                : "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50",
            ].join(" ")}
          >
            Super Admin
          </button>
        </div>

        <form onSubmit={onSubmit} className="mt-4 space-y-3">
          <div>
            <div className="text-sm font-medium">API Base</div>
            <Input
              value={apiBase}
              onChange={(e) => setApiBase(e.target.value)}
              placeholder="http://localhost:4000"
              required
              autoComplete="off"
            />
            {apiBase.trim() && normalizedBase !== apiBase.trim() && (
              <div className="mt-1 text-xs text-zinc-500">
                Will use: <code>{normalizedBase}</code>
              </div>
            )}
          </div>

          {mode === "SCHOOL" ? (
            <>
              <div>
                <div className="text-sm font-medium">School Code</div>
                <Input
                  value={schoolCode}
                  onChange={(e) => setSchoolCode(e.target.value)}
                  placeholder="e.g. DPS01"
                  required
                  autoComplete="off"
                />
              </div>

              <div>
                <div className="text-sm font-medium">PIN</div>
                <Input
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="Enter PIN"
                  required
                  autoComplete="off"
                />
              </div>
            </>
          ) : (
            <div>
              <div className="text-sm font-medium">Super Admin Key</div>
              <Input
                value={superKey}
                onChange={(e) => setSuperKey(e.target.value)}
                placeholder="SUPER_ADMIN_KEY"
                required
                autoComplete="off"
              />
            </div>
          )}

          <Button disabled={loading} className="w-full">
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <div className="mt-4 text-xs text-zinc-500">
          Tip: Local dev base is <code>http://localhost:4000</code> (include{" "}
          <code>://</code>).
        </div>
      </Card>
    </div>
  );
}
