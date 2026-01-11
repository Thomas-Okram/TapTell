import { apiFetch } from "./http";

export const adminApi = {
  me: (base: string, key: string) =>
    apiFetch(base, "/api/admin/me", { adminKey: key }),

  dashboard: (
    base: string,
    key: string,
    q?: { schoolId?: string; date?: string }
  ) => apiFetch(base, "/api/admin/dashboard", { adminKey: key, query: q }),

  attendanceDay: (
    base: string,
    key: string,
    q: { date: string; schoolId?: string }
  ) => apiFetch(base, "/api/admin/attendance/day", { adminKey: key, query: q }),
};
