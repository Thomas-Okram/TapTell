import { Router } from "express";
import { adminAuth } from "../middlewares/adminAuth.js";
import { requireRole } from "../middlewares/requireRole.js";

import { SchoolModel } from "../models/School.js";
import { AttendanceModel } from "../models/Attendance.js";
import { StudentModel } from "../models/Student.js";
import { DeviceModel } from "../models/Device.js";

import { asyncHandler } from "../utils/asyncHandler.js";
import { todayInTZ } from "../config/date.js";

const router = Router();

router.use(adminAuth, requireRole("SUPER_ADMIN", "SCHOOL_ADMIN"));

async function resolveSchool(req: any) {
  const admin = req.admin;
  if (!admin) return null;

  // SCHOOL_ADMIN is scoped by token
  if (admin.role === "SCHOOL_ADMIN") {
    const school = await SchoolModel.findById(admin.schoolId).lean();
    return school ?? null;
  }

  // SUPER_ADMIN must specify school
  const schoolId = req.query.schoolId ? String(req.query.schoolId).trim() : "";
  if (schoolId) return (await SchoolModel.findById(schoolId).lean()) ?? null;

  const schoolCode = req.query.schoolCode
    ? String(req.query.schoolCode).trim().toUpperCase()
    : "";
  if (schoolCode)
    return (await SchoolModel.findOne({ code: schoolCode }).lean()) ?? null;

  return null;
}

router.get("/me", (req: any, res) =>
  res.json({ ok: true, admin: req.admin ?? null })
);

router.get(
  "/dashboard",
  asyncHandler(async (req: any, res) => {
    const school = await resolveSchool(req);
    if (!school) {
      return res.status(400).json({
        ok: false,
        error:
          "School not resolved. SCHOOL_ADMIN uses token scope; SUPER_ADMIN must pass schoolId or schoolCode.",
      });
    }

    const tz = school.timezone ?? "Asia/Kolkata";
    const date = req.query.date ? String(req.query.date) : todayInTZ(tz);

    const todayCount = await AttendanceModel.countDocuments({
      schoolId: school._id,
      date,
    });

    res.json({
      ok: true,
      school: {
        id: String(school._id),
        name: school.name,
        code: school.code,
        timezone: tz,
      },
      date,
      todayAttendanceCount: todayCount,
    });
  })
);

// ✅ FIX: add missing endpoint used by frontend
// GET /api/admin/attendance/day?date=YYYY-MM-DD
// SUPER_ADMIN may also pass schoolId or schoolCode (like dashboard)
router.get(
  "/attendance/day",
  asyncHandler(async (req: any, res) => {
    const school = await resolveSchool(req);
    if (!school) {
      return res.status(400).json({
        ok: false,
        error:
          "School not resolved. SCHOOL_ADMIN uses token scope; SUPER_ADMIN must pass schoolId or schoolCode.",
      });
    }

    const tz = school.timezone ?? "Asia/Kolkata";
    const date = req.query.date ? String(req.query.date) : todayInTZ(tz);

    const rows = await AttendanceModel.find({
      schoolId: school._id,
      date,
    })
      .sort({ markedAt: -1, createdAt: -1 })
      .lean();

    // Collect referenced ids (safe)
    const studentIds = Array.from(
      new Set(
        rows
          .map((r: any) => r.studentId)
          .filter(Boolean)
          .map((x: any) => String(x))
      )
    );

    const deviceIds = Array.from(
      new Set(
        rows
          .map((r: any) => r.deviceId)
          .filter(Boolean)
          .map((x: any) => String(x))
      )
    );

    // Fetch related entities
    const [students, devices] = await Promise.all([
      studentIds.length
        ? StudentModel.find({ _id: { $in: studentIds } })
            .select("name className sec rollNumber house")
            .lean()
        : Promise.resolve([]),
      deviceIds.length
        ? DeviceModel.find({ _id: { $in: deviceIds } })
            .select("name location")
            .lean()
        : Promise.resolve([]),
    ]);

    const studentById = new Map<string, any>();
    for (const s of students as any[]) studentById.set(String(s._id), s);

    const deviceById = new Map<string, any>();
    for (const d of devices as any[]) deviceById.set(String(d._id), d);

    const items = rows.map((a: any) => {
      const s = a.studentId ? studentById.get(String(a.studentId)) : null;
      const d = a.deviceId ? deviceById.get(String(a.deviceId)) : null;

      return {
        id: String(a._id),
        time: a.markedAt ?? a.createdAt ?? null,
        status: a.status ?? "PRESENT",
        photoUrl: a.arrivalPhotoUrl ?? a.photoUrl ?? null,
        whatsappSentAt: a.whatsappSentAt ?? null,

        student: s
          ? {
              id: String(s._id),
              name: s.name,
              className: s.className,
              sec: s.sec,
              rollNumber: s.rollNumber,
              house: s.house,
            }
          : null,

        device: d
          ? {
              id: String(d._id),
              name: d.name,
              location: d.location,
            }
          : null,
      };
    });

    return res.json({
      ok: true,
      school: {
        id: String(school._id),
        name: school.name,
        code: school.code,
      },
      date,
      count: items.length,
      items,
    });
  })
);

export default router;
