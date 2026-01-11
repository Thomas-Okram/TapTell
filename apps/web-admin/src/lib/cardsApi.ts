import { apiFetch } from "./http";

export const cardsApi = {
  list: (base: string, key: string, q?: any) =>
    apiFetch(base, "/api/cards", { adminKey: key, query: q }),

  create: (base: string, key: string, body: any) =>
    apiFetch(base, "/api/cards", { adminKey: key, method: "POST", body }),

  update: (base: string, key: string, id: string, body: any) =>
    apiFetch(base, `/api/cards/${id}`, {
      adminKey: key,
      method: "PATCH",
      body,
    }),

  disable: (base: string, key: string, id: string) =>
    apiFetch(base, `/api/cards/${id}`, { adminKey: key, method: "DELETE" }),

  assign: (
    base: string,
    key: string,
    id: string,
    body: { studentId: string }
  ) =>
    apiFetch(base, `/api/cards/${id}/assign`, {
      adminKey: key,
      method: "POST",
      body,
    }),

  unassign: (base: string, key: string, id: string) =>
    apiFetch(base, `/api/cards/${id}/unassign`, {
      adminKey: key,
      method: "POST",
      body: {},
    }),
};
