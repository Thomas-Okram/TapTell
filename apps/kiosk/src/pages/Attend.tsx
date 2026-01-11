import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Input } from "../ui/Input";
import { clearKioskConfig, getKioskConfig } from "../lib/storage";
import {
  authTest,
  markAttendance,
  uploadAttendancePhoto,
} from "../lib/kioskApi";

import { captureFromVideo, getCameraStream } from "../lib/camera";
import { useNavigate } from "react-router-dom";
import { ding } from "../lib/sound";

type Status =
  | { type: "idle" }
  | { type: "busy"; msg: string }
  | { type: "ok"; title: string; msg?: string; photoUrl?: string | null }
  | { type: "err"; title: string; msg: string };

function nowTimeLabel() {
  const d = new Date();
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/**
 * Auto-submit behavior
 * - Some card readers type UID but don't send Enter.
 * - Set UID_AUTOSUBMIT_LEN to a length that matches your reader's UID output.
 * - 0 disables auto-submit.
 */
const UID_AUTOSUBMIT_LEN = 10; // <-- change to your UID length (or set 0 to disable)

/** Full-screen success splash duration */
const SPLASH_MS = 1000;

export default function Attend() {
  const nav = useNavigate();
  const cfg = useMemo(() => getKioskConfig()!, []);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const uidRef = useRef<HTMLInputElement | null>(null);

  const [uid, setUid] = useState("");
  const [camReady, setCamReady] = useState(false);
  const [status, setStatus] = useState<Status>({ type: "idle" });
  const [deviceName, setDeviceName] = useState<string>("");

  // Splash state
  const [splash, setSplash] = useState<null | {
    title: string;
    subtitle?: string;
    photoUrl?: string | null;
  }>(null);

  // Prevent double submits
  const submittingRef = useRef(false);

  // Track last auto-submitted UID to avoid repeated calls while input stays same
  const lastAutoUidRef = useRef<string>("");

  // Start camera
  useEffect(() => {
    let stream: MediaStream | null = null;

    (async () => {
      try {
        stream = await getCameraStream();
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setCamReady(true);
        }
      } catch {
        setCamReady(false);
      }
    })();

    return () => {
      stream?.getTracks()?.forEach((t) => t.stop());
    };
  }, []);

  // Fetch device name once
  useEffect(() => {
    (async () => {
      try {
        const res = await authTest(cfg.apiBase, cfg.deviceKey);
        setDeviceName(res.device.name);
      } catch {
        // ignore
      }
    })();
  }, [cfg.apiBase, cfg.deviceKey]);

  useEffect(() => {
    uidRef.current?.focus();
  }, []);

  async function submitUid(rawUid: string) {
    const u = rawUid.trim();
    if (!u) return;
    if (submittingRef.current) return;

    submittingRef.current = true;
    setStatus({ type: "busy", msg: "Capturing photo…" });

    try {
      // 1) Capture photo
      let photoBase64: string | null = null;
      if (camReady && videoRef.current) {
        photoBase64 = captureFromVideo(videoRef.current, {
          maxW: 720,
          jpegQuality: 0.75,
        });
      }

      // 2) Upload to Cloudinary via backend media route
      let uploadedUrl: string | undefined;
      let uploadedPublicId: string | undefined;

      if (photoBase64) {
        try {
          setStatus({ type: "busy", msg: "Uploading photo…" });
          const up = await uploadAttendancePhoto({
            apiBase: cfg.apiBase,
            deviceKey: cfg.deviceKey,
            photoBase64,
          });
          uploadedUrl = up.url;
          uploadedPublicId = up.public_id;
        } catch (e) {
          console.warn("Photo upload failed; continuing without photo:", e);
        }
      }

      // 3) Mark attendance (send URL if we have it; else fallback base64)
      setStatus({ type: "busy", msg: "Marking attendance…" });

      const res = await markAttendance({
        apiBase: cfg.apiBase,
        deviceKey: cfg.deviceKey,
        uid: u,
        ...(uploadedUrl ? { photoUrl: uploadedUrl } : {}),
        ...(uploadedPublicId ? { photoCloudinaryId: uploadedPublicId } : {}),
        ...(!uploadedUrl && photoBase64 ? { photoBase64 } : {}),
      });

      const studentLine = res.student
        ? `${res.student.name}${
            res.student.className
              ? ` • Class ${res.student.className}${
                  res.student.sec ? res.student.sec : ""
                }`
              : ""
          }${res.student.rollNumber ? ` • Roll ${res.student.rollNumber}` : ""}`
        : undefined;

      ding();

      const finalPhoto = res.photoUrl ?? uploadedUrl ?? null;

      setSplash({
        title: "Attendance marked ✅",
        subtitle: studentLine ?? res.message,
        photoUrl: finalPhoto,
      });

      setStatus({
        type: "ok",
        title: "Attendance marked ✅",
        msg: studentLine ?? res.message,
        photoUrl: finalPhoto,
      });

      setUid("");
      lastAutoUidRef.current = "";

      setTimeout(() => setSplash(null), SPLASH_MS);
      setTimeout(() => setStatus({ type: "idle" }), 1800);
      setTimeout(() => uidRef.current?.focus(), 60);
    } catch (e: any) {
      setStatus({
        type: "err",
        title: "Couldn’t mark attendance",
        msg: e?.message ?? "Please try again",
      });
      setTimeout(() => uidRef.current?.focus(), 60);
    } finally {
      submittingRef.current = false;
    }
  }

  // Auto-submit when UID reaches a specific length
  useEffect(() => {
    if (!UID_AUTOSUBMIT_LEN) return;
    const u = uid.trim();
    if (!u) return;

    if (u.length >= UID_AUTOSUBMIT_LEN && lastAutoUidRef.current !== u) {
      lastAutoUidRef.current = u;
      submitUid(u);
    }
  }, [uid]);

  function onResetDevice() {
    clearKioskConfig();
    nav("/setup", { replace: true });
  }

  const statusBox =
    status.type === "idle"
      ? {
          ring: "ring-white/10",
          bg: "bg-white/5",
          title: "Ready",
          subtitle: "Waiting for card tap…",
        }
      : status.type === "busy"
      ? {
          ring: "ring-white/10",
          bg: "bg-white/5",
          title: "Working",
          subtitle: status.msg,
        }
      : status.type === "ok"
      ? {
          ring: "ring-emerald-400/20",
          bg: "bg-emerald-500/10",
          title: "Attendance marked ✅",
          subtitle: status.msg ?? "",
        }
      : {
          ring: "ring-rose-400/20",
          bg: "bg-rose-500/10",
          title: "Error",
          subtitle: status.msg,
        };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200">
      {/* Full-screen success splash */}
      {splash ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/90 backdrop-blur-sm">
          <div className="mx-auto w-full max-w-2xl px-6">
            <div className="rounded-[32px] border border-emerald-400/15 bg-emerald-500/10 p-10 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.9)]">
              <div className="text-5xl font-extrabold tracking-tight text-emerald-100">
                {splash.title}
              </div>
              {splash.subtitle ? (
                <div className="mt-4 text-xl text-emerald-100/80">
                  {splash.subtitle}
                </div>
              ) : null}

              {splash.photoUrl ? (
                <div className="mt-7 overflow-hidden rounded-3xl border border-white/10 bg-black/30">
                  <img src={splash.photoUrl} alt="arrival" className="w-full" />
                </div>
              ) : null}

              <div className="mt-6 text-sm text-emerald-100/60">
                Ready for next student…
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* subtle background glow */}
      <div className="pointer-events-none fixed inset-0 opacity-60">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-[-220px] right-[-160px] h-[520px] w-[520px] rounded-full bg-white/5 blur-3xl" />
      </div>

      <div className="relative p-6">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
          {/* Top bar */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-4xl font-extrabold tracking-tight text-zinc-100">
                TapTell Attendance
              </div>
              <div className="mt-2 text-sm text-zinc-300/80">
                Tap card → photo capture → attendance marked
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-200/80">
                  {deviceName ? (
                    <>
                      Device:{" "}
                      <span className="text-zinc-100">{deviceName}</span>
                    </>
                  ) : (
                    "Device: —"
                  )}
                </div>
                <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-200/80">
                  Time: <span className="text-zinc-100">{nowTimeLabel()}</span>
                </div>
                <div
                  className={[
                    "rounded-full border px-3 py-1 text-xs",
                    camReady
                      ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
                      : "border-white/10 bg-white/5 text-zinc-200/70",
                  ].join(" ")}
                >
                  Camera: {camReady ? "Ready" : "Unavailable"}
                </div>

                {UID_AUTOSUBMIT_LEN ? (
                  <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-200/70">
                    Auto-submit: {UID_AUTOSUBMIT_LEN} chars
                  </div>
                ) : null}
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="ghost" onClick={onResetDevice}>
                Reset
              </Button>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-5">
            {/* Left panel */}
            <Card className="lg:col-span-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xl font-bold text-zinc-100">
                    Scan Card UID
                  </div>
                  <div className="mt-1 text-sm text-zinc-300/80">
                    Keep this screen open. Card reader will type the UID and
                    press Enter (if supported).
                  </div>
                </div>
                <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-200/70">
                  Auto-focus input
                </div>
              </div>

              <div className="mt-5">
                <Input
                  ref={uidRef}
                  value={uid}
                  onChange={(e) => setUid(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") submitUid(uid);
                  }}
                  placeholder="Tap card… UID will appear here"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  className="text-2xl"
                />

                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <Button
                    onClick={() => submitUid(uid)}
                    disabled={!uid.trim() || status.type === "busy"}
                  >
                    {status.type === "busy" ? "Working…" : "Mark attendance"}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setUid("");
                      setStatus({ type: "idle" });
                      lastAutoUidRef.current = "";
                      uidRef.current?.focus();
                    }}
                  >
                    Clear
                  </Button>
                </div>
              </div>

              {/* Status */}
              <div
                className={[
                  "mt-6 rounded-3xl p-5 ring-1",
                  statusBox.bg,
                  statusBox.ring,
                ].join(" ")}
              >
                <div className="text-2xl font-extrabold text-zinc-100">
                  {statusBox.title}
                </div>
                <div className="mt-1 text-sm text-zinc-200/80">
                  {statusBox.subtitle}
                </div>
              </div>
            </Card>

            {/* Right panel */}
            <Card className="lg:col-span-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xl font-bold text-zinc-100">Camera</div>
                  <div className="mt-1 text-sm text-zinc-300/80">
                    Photo is captured automatically on scan.
                  </div>
                </div>
              </div>

              <div className="mt-4 overflow-hidden rounded-3xl border border-white/10 bg-black/40">
                <video
                  ref={videoRef}
                  className="h-64 w-full object-cover"
                  playsInline
                  muted
                />
              </div>

              <div className="mt-3 text-xs text-zinc-200/60">
                {camReady
                  ? "Camera ready. Photo will be attached to attendance & WhatsApp."
                  : "Camera permission denied / unavailable. Attendance will still work."}
              </div>
            </Card>
          </div>

          <div className="text-xs text-zinc-400/70">
            Pro tip: If the card reader “types” into the wrong field, click the
            UID box once to refocus.
          </div>
        </div>
      </div>
    </div>
  );
}
