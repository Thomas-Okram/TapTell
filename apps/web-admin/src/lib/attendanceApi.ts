import { apiFetch } from "./http";

export const attendanceApi = {
  query: (base: string, key: string, q?: any) =>
    apiFetch(base, "/api/attendance", { adminKey: key, query: q }),
};
