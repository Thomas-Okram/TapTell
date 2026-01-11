import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Input } from "../ui/Input";
import { authTest } from "../lib/kioskApi";
import { getKioskConfig, normalizeBase, setKioskConfig } from "../lib/storage";

export default function Setup() {
  const nav = useNavigate();
  const existing = useMemo(() => getKioskConfig(), []);

  const [apiBase, setApiBase] = useState(
    existing?.apiBase ?? "http://localhost:4000"
  );
  const [deviceKey, setDeviceKey] = useState(existing?.deviceKey ?? "");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{
    type: "ok" | "err";
    msg: string;
  } | null>(null);

  async function onTest() {
    setLoading(true);
    setStatus(null);
    try {
      const base = normalizeBase(apiBase);
      const key = deviceKey.trim();
      const res = await authTest(base, key);

      setStatus({
        type: "ok",
        msg: `Connected ✅  Device: ${res.device.name}`,
      });
      setKioskConfig(base, key);
      nav("/", { replace: true });
    } catch (e: any) {
      setStatus({ type: "err", msg: e?.message ?? "Connection failed" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-full bg-zinc-950 p-6 text-white">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <div className="pt-2">
          <div className="text-4xl font-extrabold tracking-tight">
            TapTell Kiosk
          </div>
          <div className="mt-2 text-white/70">
            Setup this device once, then switch to the attendance screen.
          </div>
        </div>

        <Card>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xl font-bold">Device Setup</div>
              <div className="mt-1 text-sm text-white/60">
                Enter the API Base + Device Key and test connection.
              </div>
            </div>

            <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
              One-time setup
            </div>
          </div>

          <div className="mt-6 grid gap-4">
            <div>
              <div className="mb-2 text-sm text-white/70">API Base</div>
              <Input
                value={apiBase}
                onChange={(e) => setApiBase(e.target.value)}
                placeholder="http://localhost:4000"
                inputMode="url"
              />
              <div className="mt-2 text-xs text-white/50">
                Must include{" "}
                <span className="font-semibold text-white">http://</span> or{" "}
                <span className="font-semibold text-white">https://</span>
              </div>
            </div>

            <div>
              <div className="mb-2 text-sm text-white/70">Device Key</div>
              <Input
                value={deviceKey}
                onChange={(e) => setDeviceKey(e.target.value)}
                placeholder="Paste device key"
              />
              <div className="mt-2 text-xs text-white/50">
                Tip: you can generate/rotate this in the Admin → Devices screen.
              </div>
            </div>

            {status ? (
              <div
                className={[
                  "rounded-2xl px-4 py-3 text-sm border",
                  status.type === "ok"
                    ? "border-emerald-400/20 bg-emerald-500/15 text-emerald-200"
                    : "border-red-400/20 bg-red-500/15 text-red-200",
                ].join(" ")}
              >
                {status.msg}
              </div>
            ) : null}

            <div className="mt-2 flex flex-col gap-3 sm:flex-row">
              <Button
                onClick={onTest}
                disabled={loading || !apiBase.trim() || !deviceKey.trim()}
              >
                {loading ? "Testing..." : "Test connection & Continue"}
              </Button>

              <Button
                variant="ghost"
                onClick={() => {
                  setStatus(null);
                  setApiBase(existing?.apiBase ?? "http://localhost:4000");
                  setDeviceKey(existing?.deviceKey ?? "");
                }}
                disabled={loading}
              >
                Reset fields
              </Button>
            </div>
          </div>
        </Card>

        <div className="text-xs text-white/40">
          Tip: use a dedicated browser profile + “Launch on startup” for real
          kiosk mode.
        </div>
      </div>
    </div>
  );
}
