import { apiFetch } from "./http";

export const studentsApi = {
  list: (base: string, key: string, q?: any) =>
    apiFetch(base, "/api/students", { adminKey: key, query: q }),

  create: (base: string, key: string, body: any) =>
    apiFetch(base, "/api/students", { adminKey: key, method: "POST", body }),

  update: (base: string, key: string, id: string, body: any) =>
    apiFetch(base, `/api/students/${id}`, {
      adminKey: key,
      method: "PATCH",
      body,
    }),

  remove: (base: string, key: string, id: string) =>
    apiFetch(base, `/api/students/${id}`, { adminKey: key, method: "DELETE" }),
};
