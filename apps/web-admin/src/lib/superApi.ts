import { apiFetch } from "./http";

export const superApi = {
  schools: {
    list: (base: string, key: string) =>
      apiFetch(base, "/api/super/schools", { adminKey: key }),

    create: (base: string, key: string, body: any) =>
      apiFetch(base, "/api/super/schools", {
        adminKey: key,
        method: "POST",
        body, // ✅ pass object
      }),

    update: (base: string, key: string, id: string, body: any) =>
      apiFetch(base, `/api/super/schools/${id}`, {
        adminKey: key,
        method: "PATCH",
        body, // ✅ pass object
      }),

    remove: (base: string, key: string, id: string) =>
      apiFetch(base, `/api/super/schools/${id}`, {
        adminKey: key,
        method: "DELETE",
      }),
  },

  // ✅ School Admin PIN flows
  schoolAdmins: {
    list: (base: string, key: string) =>
      apiFetch(base, "/api/super/school-admins", { adminKey: key }),

    createPin: (
      base: string,
      key: string,
      body: { name: string; schoolId: string }
    ) =>
      apiFetch(base, "/api/super/school-admins/pin", {
        adminKey: key,
        method: "POST",
        body, // ✅ pass object
      }),

    rotatePin: (base: string, key: string, id: string) =>
      apiFetch(base, `/api/super/school-admins/${id}/rotate-pin`, {
        adminKey: key,
        method: "POST",
        body: {}, // ✅ pass object (optional but fine)
      }),
  },

  // Backwards compatibility alias
  createSchoolAdmin: (
    base: string,
    key: string,
    body: { name: string; schoolId: string }
  ) =>
    apiFetch(base, "/api/super/school-admins/pin", {
      adminKey: key,
      method: "POST",
      body, // ✅ pass object
    }),
};
