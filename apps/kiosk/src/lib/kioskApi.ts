export class ApiError extends Error {
  status: number;
  payload: any;
  constructor(status: number, message: string, payload: any) {
    super(message);
    this.status = status;
    this.payload = payload;
  }
}

async function kioskFetch<T>(
  apiBase: string,
  path: string,
  deviceKey: string,
  init?: RequestInit & { bodyJson?: any }
): Promise<T> {
  const res = await fetch(`${apiBase}${path}`, {
    method: init?.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      "x-device-key": deviceKey,
      ...(init?.headers ?? {}),
    },
    body:
      init?.bodyJson !== undefined ? JSON.stringify(init.bodyJson) : init?.body,
  });

  const text = await res.text();
  let payload: any = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }

  if (!res.ok) {
    const msg =
      (payload && (payload.error || payload.message)) ||
      `Request failed (${res.status})`;
    throw new ApiError(res.status, msg, payload);
  }

  return payload as T;
}

export async function authTest(apiBase: string, deviceKey: string) {
  return kioskFetch<{
    ok: true;
    device: { id: string; name: string; schoolId: string };
  }>(apiBase, "/api/kiosk/auth/test", deviceKey, {
    method: "POST",
    bodyJson: {},
  });
}

/**
 * Upload captured photo to backend media endpoint (deviceAuth)
 * Backend then uploads to Cloudinary and returns URL + public_id.
 */
export async function uploadAttendancePhoto(params: {
  apiBase: string;
  deviceKey: string;
  photoBase64: string;
  folder?: string;
}) {
  const { apiBase, deviceKey, photoBase64, folder } = params;

  return kioskFetch<{
    ok: true;
    url: string;
    public_id: string;
  }>(apiBase, "/api/media/upload", deviceKey, {
    method: "POST",
    bodyJson: {
      photoBase64,
      folder: folder ?? "attendance",
    },
  });
}

/**
 * Mark attendance.
 * Supports BOTH:
 * - photoUrl + photoCloudinaryId (preferred)
 * - photoBase64 (fallback)
 */
export async function markAttendance(params: {
  apiBase: string;
  deviceKey: string;
  uid: string;

  // preferred
  photoUrl?: string;
  photoCloudinaryId?: string;

  // fallback
  photoBase64?: string | null;
}) {
  const { apiBase, deviceKey, uid, photoUrl, photoCloudinaryId, photoBase64 } =
    params;

  // exactOptionalPropertyTypes-safe:
  // only include optional fields if they exist
  const body: any = {
    uid,
    ...(photoUrl ? { photoUrl } : {}),
    ...(photoCloudinaryId ? { photoCloudinaryId } : {}),
    ...(photoBase64 ? { photoBase64 } : {}),
  };

  return kioskFetch<{
    ok: true;
    message: string;
    photoUrl: string | null;
    student?: {
      name: string;
      className?: string;
      sec?: string;
      rollNumber?: string;
      house?: string;
    };
  }>(apiBase, "/api/kiosk/attendance/mark", deviceKey, {
    method: "POST",
    bodyJson: body,
  });
}
