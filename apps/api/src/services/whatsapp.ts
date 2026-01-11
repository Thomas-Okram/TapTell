type SendArrivalArgs = {
  to: string;
  studentName: string;
  schoolName?: string;
  timeISO: string;
  photoUrl?: string;
};

function normPhone(phone: string) {
  return String(phone).replace(/[^\d]/g, "");
}

function envOrThrow(name: string) {
  const v = process.env[name];
  if (!v || !v.trim()) throw new Error(`Missing env: ${name}`);
  return v.trim();
}

async function postJson(
  url: string,
  headers: Record<string, string>,
  body: any
) {
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });

  const text = await resp.text();
  if (!resp.ok)
    throw new Error(`WhatsApp provider error (${resp.status}): ${text}`);

  try {
    return JSON.parse(text);
  } catch {
    return { ok: true, raw: text };
  }
}

async function sendViaWappie(args: SendArrivalArgs) {
  const base = envOrThrow("WAPPIE_BASE_URL").replace(/\/+$/, "");
  const apiKey = envOrThrow("WAPPIE_API_KEY");

  const authHeader = (process.env.WAPPIE_AUTH_HEADER || "x-api-key").trim();
  const authPrefix = (process.env.WAPPIE_AUTH_PREFIX || "").toString();

  const textPath = (process.env.WAPPIE_SEND_TEXT_PATH || "").trim();
  const imagePath = (process.env.WAPPIE_SEND_IMAGE_PATH || "").trim();

  const fieldTo = (process.env.WAPPIE_FIELD_TO || "to").trim();
  const fieldText = (process.env.WAPPIE_FIELD_TEXT || "message").trim();
  const fieldImageUrl = (
    process.env.WAPPIE_FIELD_IMAGE_URL || "imageUrl"
  ).trim();
  const fieldCaption = (process.env.WAPPIE_FIELD_CAPTION || "caption").trim();

  if (!textPath) throw new Error("Missing env: WAPPIE_SEND_TEXT_PATH");
  if (!imagePath) throw new Error("Missing env: WAPPIE_SEND_IMAGE_PATH");

  const to = normPhone(args.to);

  const msg =
    `✅ Attendance marked\n` +
    `Student: ${args.studentName}\n` +
    `Time: ${new Date(args.timeISO).toLocaleString()}\n` +
    `${args.schoolName ? `School: ${args.schoolName}\n` : ""}`;

  const headers: Record<string, string> = {
    [authHeader]: `${authPrefix}${apiKey}`,
  };

  if (args.photoUrl) {
    const url = `${base}${imagePath.startsWith("/") ? "" : "/"}${imagePath}`;
    return postJson(url, headers, {
      [fieldTo]: to,
      [fieldImageUrl]: args.photoUrl,
      [fieldCaption]: msg,
    });
  }

  const url = `${base}${textPath.startsWith("/") ? "" : "/"}${textPath}`;
  return postJson(url, headers, { [fieldTo]: to, [fieldText]: msg });
}

export async function sendArrivalWhatsApp(args: SendArrivalArgs) {
  const provider = (process.env.WHATSAPP_PROVIDER || "off")
    .trim()
    .toLowerCase();
  if (provider === "off") return { ok: true, skipped: true };

  if (!args.to || !args.to.trim()) {
    return { ok: true, skipped: true, reason: "missing parentWhatsapp" };
  }

  if (provider === "wappie") {
    const r = await sendViaWappie(args);
    return { ok: true, provider: "wappie", result: r };
  }

  if (provider === "meta") {
    throw new Error("WHATSAPP_PROVIDER=meta not configured in this file");
  }

  throw new Error(`Unknown WHATSAPP_PROVIDER: ${provider}`);
}
