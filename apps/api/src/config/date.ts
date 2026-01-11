import { SchoolModel } from "../models/School.js";

function ymdFromParts(parts: Intl.DateTimeFormatPart[]) {
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const y = get("year");
  const m = get("month").padStart(2, "0");
  const d = get("day").padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function todayInTZ(timezone: string) {
  const dtf = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = dtf.formatToParts(new Date());
  return ymdFromParts(parts);
}

export async function getSchoolTimezone(schoolId: any) {
  const school = await SchoolModel.findById(schoolId).select("timezone").lean();
  return school?.timezone ?? "Asia/Kolkata";
}
