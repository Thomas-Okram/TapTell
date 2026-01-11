const K = {
  apiBase: "taptell_apiBase",
  adminKey: "taptell_adminKey",
  superSchoolId: "taptell_superSchoolId",
  cachedMe: "taptell_cachedMe",
};

export function getApiBase() {
  return localStorage.getItem(K.apiBase) ?? "";
}
export function setApiBase(v: string) {
  localStorage.setItem(K.apiBase, v);
}

export function getAdminKey() {
  return localStorage.getItem(K.adminKey) ?? "";
}
export function setAdminKey(v: string) {
  localStorage.setItem(K.adminKey, v);
}

export function getSuperSchoolId() {
  return localStorage.getItem(K.superSchoolId) ?? "";
}
export function setSuperSchoolId(v: string) {
  localStorage.setItem(K.superSchoolId, v);
}

/** Cache last known /api/admin/me response so refresh doesn’t “log out” on temporary API failures */
export function getCachedMe<T = any>(): T | null {
  try {
    const raw = localStorage.getItem(K.cachedMe);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
export function setCachedMe(v: any) {
  try {
    localStorage.setItem(K.cachedMe, JSON.stringify(v));
  } catch {
    // ignore storage quota errors
  }
}
export function clearCachedMe() {
  localStorage.removeItem(K.cachedMe);
}

/** Clears all auth-related storage */
export function clearAuth() {
  localStorage.removeItem(K.adminKey);
  localStorage.removeItem(K.cachedMe);
  // do NOT clear apiBase by default (nice UX)
  // do NOT clear superSchoolId by default (super admin preference)
}
