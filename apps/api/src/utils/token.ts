import crypto from "crypto";

function b64urlEncode(input: Buffer | string) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function b64urlDecode(input: string) {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  const s = input.replace(/-/g, "+").replace(/_/g, "/") + pad;
  return Buffer.from(s, "base64").toString("utf8");
}

export type AdminTokenPayload = {
  sub: string; // adminId
  role: "SUPER_ADMIN" | "SCHOOL_ADMIN";
  schoolId?: string;
  iat: number; // seconds
  exp: number; // seconds
};

export function signAdminToken(secret: string, payload: AdminTokenPayload) {
  const header = { alg: "HS256", typ: "TPT" };
  const h = b64urlEncode(JSON.stringify(header));
  const p = b64urlEncode(JSON.stringify(payload));
  const msg = `${h}.${p}`;
  const sig = crypto.createHmac("sha256", secret).update(msg).digest("base64");
  const s = sig.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  return `${msg}.${s}`;
}

export function verifyAdminToken(
  secret: string,
  token: string
): AdminTokenPayload | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [h, p, s] = parts;
  const msg = `${h}.${p}`;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(msg)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

  // timing-safe compare
  const a = Buffer.from(s);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return null;
  if (!crypto.timingSafeEqual(a, b)) return null;

  const payload = JSON.parse(b64urlDecode(p)) as AdminTokenPayload;
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && now > payload.exp) return null;

  return payload;
}
