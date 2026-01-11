export class ApiError extends Error {
  status: number;
  payload: any;
  constructor(status: number, message: string, payload?: any) {
    super(message);
    this.status = status;
    this.payload = payload;
  }
}

function normBase(base: string) {
  return base.trim().replace(/\/+$/, "");
}

export async function apiFetch<T>(
  base: string,
  path: string,
  opts: {
    method?: string;
    adminKey?: string;
    query?: Record<string, string | number | undefined | null>;
    body?: any; // can be object OR string
  } = {}
): Promise<T> {
  const url = new URL(normBase(base) + path);

  if (opts.query) {
    for (const [k, v] of Object.entries(opts.query)) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }
  }

  const headers: Record<string, string> = {};
  if (opts.adminKey) headers["x-admin-key"] = opts.adminKey;

  let body: BodyInit | undefined = undefined;

  if (opts.body !== undefined) {
    // ✅ If caller passes a string, assume it is already serialized
    if (typeof opts.body === "string") {
      body = opts.body;
      headers["Content-Type"] = headers["Content-Type"] ?? "application/json";
    } else {
      // ✅ Normal case: object -> stringify once
      body = JSON.stringify(opts.body);
      headers["Content-Type"] = "application/json";
    }
  }

  const res = await fetch(url.toString(), {
    method: opts.method ?? (opts.body !== undefined ? "POST" : "GET"),
    headers,
    body,
  });

  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }

  if (!res.ok) {
    const msg =
      json?.error ?? json?.message ?? `Request failed (${res.status})`;
    throw new ApiError(res.status, msg, json);
  }

  return json as T;
}
