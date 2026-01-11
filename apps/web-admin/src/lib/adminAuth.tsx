import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  getAdminKey,
  getApiBase,
  setAdminKey,
  setApiBase,
  clearAuth,
  getCachedMe,
  setCachedMe,
  clearCachedMe,
} from "./storage";
import { adminApi } from "./adminApi";
import { ApiError } from "./http";

export type AdminRole = "SUPER_ADMIN" | "SCHOOL_ADMIN";

export type AdminMe = {
  ok: true;
  admin: {
    id: string;
    name: string;
    role: AdminRole;
    schoolId?: string | null;
  };
  school?: { id: string; name: string; code: string } | null;
};

type Ctx = {
  apiBase: string;
  adminKey: string;
  me: AdminMe | null;
  isReady: boolean;
  isAuthed: boolean;
  role: AdminRole | null;
  meStale: boolean;
  lastAuthError?: string | null;

  setCreds: (apiBase: string, adminKey: string) => void;
  refreshMe: () => Promise<void>;

  // ✅ key-based login (super or pre-issued token)
  login: (apiBase: string, adminKey: string) => Promise<void>;

  // ✅ NEW: schoolCode + pin -> token -> stored as adminKey
  loginWithPin: (
    apiBase: string,
    schoolCode: string,
    pin: string
  ) => Promise<void>;

  logout: () => void;
};

const AuthCtx = createContext<Ctx | null>(null);

function normalizeApiBase(base: string) {
  return base.trim().replace(/\/+$/, "");
}

function extractToken(j: any): string | null {
  // Accept common shapes:
  // { ok:true, token:"tpt_..." }
  // { ok:true, adminKey:"tpt_..." }
  // { token: ... } etc.
  const token =
    j?.token ??
    j?.adminKey ??
    j?.key ??
    j?.data?.token ??
    j?.data?.adminKey ??
    j?.data?.key ??
    null;

  if (!token) return null;
  return String(token);
}

async function loginPinRequest(base: string, schoolCode: string, pin: string) {
  const res = await fetch(`${base}/api/admin/login-pin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      schoolCode: schoolCode.trim(),
      pin: pin.trim(),
    }),
  });

  const j = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(
      res.status,
      j?.error || j?.message || `Login failed (${res.status})`,
      j
    );
  }

  const token = extractToken(j);
  if (!token) throw new Error("Login did not return a token.");
  return token;
}

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [apiBase, setBase] = useState(getApiBase());
  const [adminKey, setKey] = useState(getAdminKey());

  // ✅ start from cached /me so refresh doesn't “log you out” on transient failures
  const [me, setMe] = useState<AdminMe | null>(() => getCachedMe<AdminMe>());

  const [isReady, setReady] = useState(false);
  const [meStale, setMeStale] = useState(false);
  const [lastAuthError, setLastAuthError] = useState<string | null>(null);

  // ✅ critical fix: keep latest creds in a ref so refreshMe() never reads stale state
  const credsRef = useRef<{ apiBase: string; adminKey: string }>({
    apiBase,
    adminKey,
  });
  credsRef.current = { apiBase, adminKey };

  const setCreds = (b: string, k: string) => {
    const base = normalizeApiBase(b);
    const key = k.trim();

    // update ref immediately (not batched)
    credsRef.current = { apiBase: base, adminKey: key };

    // update react state (async/batched)
    setBase(base);
    setKey(key);

    // persist
    setApiBase(base);
    setAdminKey(key);
  };

  const logout = () => {
    clearAuth();
    clearCachedMe();

    // clear state
    setBase("");
    setKey("");
    setMe(null);
    setMeStale(false);
    setLastAuthError(null);

    // clear ref
    credsRef.current = { apiBase: "", adminKey: "" };
  };

  const refreshMe = async () => {
    const base = credsRef.current.apiBase;
    const key = credsRef.current.adminKey;

    if (!base || !key) {
      setMe(null);
      setMeStale(false);
      setLastAuthError(null);
      return;
    }

    try {
      // adminApi.me must call GET /api/admin/me with x-admin-key
      const data = (await adminApi.me(base, key)) as any as AdminMe;

      setMe(data);
      setCachedMe(data);
      setMeStale(false);
      setLastAuthError(null);
    } catch (err: any) {
      // ✅ ONLY hard-logout on 401/403 (invalid key/token)
      if (
        err instanceof ApiError &&
        (err.status === 401 || err.status === 403)
      ) {
        logout();
        return;
      }

      // otherwise keep cached me and show a “stale/offline” state
      setMeStale(true);
      setLastAuthError(err?.message ?? "Unable to reach server");
    }
  };

  // ✅ clean one-call key-based login (fixes “works only second time”)
  const login = async (base: string, key: string) => {
    setCreds(base, key);
    await refreshMe(); // reads from ref => uses base/key immediately
  };

  // ✅ NEW: schoolCode + pin login
  const loginWithPin = async (
    base: string,
    schoolCode: string,
    pin: string
  ) => {
    const b = normalizeApiBase(base);
    if (!b) throw new Error("API Base is required.");
    if (!schoolCode.trim()) throw new Error("School Code is required.");
    if (!pin.trim()) throw new Error("PIN is required.");

    // call backend to get token (tpt_...)
    const token = await loginPinRequest(b, schoolCode, pin);

    // store as adminKey and load /me
    setCreds(b, token);
    await refreshMe();
  };

  useEffect(() => {
    (async () => {
      setReady(true);
      await refreshMe();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<Ctx>(() => {
    const role = me?.admin?.role ?? null;
    return {
      apiBase,
      adminKey,
      me,
      isReady,

      // ✅ auth based on creds + cached me (still valid UX)
      isAuthed: !!apiBase && !!adminKey && !!me,
      role,

      meStale,
      lastAuthError: lastAuthError ?? undefined,

      setCreds,
      refreshMe,
      login,
      loginWithPin,
      logout,
    };
  }, [apiBase, adminKey, me, isReady, meStale, lastAuthError]);

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAdminAuth() {
  const v = useContext(AuthCtx);
  if (!v) throw new Error("useAdminAuth must be used inside AdminAuthProvider");
  return v;
}
