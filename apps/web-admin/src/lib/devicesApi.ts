import { apiFetch } from "./http";

export const devicesApi = {
  list: (base: string, key: string, q?: any) =>
    apiFetch(base, "/api/devices", { adminKey: key, query: q }),

  create: (base: string, key: string, body: any) =>
    apiFetch(base, "/api/devices", { adminKey: key, method: "POST", body }),

  update: (base: string, key: string, id: string, body: any) =>
    apiFetch(base, `/api/devices/${id}`, {
      adminKey: key,
      method: "PATCH",
      body,
    }),

  rotateKey: (base: string, key: string, id: string) =>
    apiFetch(base, `/api/devices/${id}/rotate-key`, {
      adminKey: key,
      method: "POST",
      body: {},
    }),

  deactivate: (base: string, key: string, id: string) =>
    apiFetch(base, `/api/devices/${id}`, { adminKey: key, method: "DELETE" }),
};
