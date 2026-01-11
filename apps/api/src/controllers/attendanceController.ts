import type { ScopedSchoolRequest } from "../middlewares/schoolScope.ts";
import { AttendanceModel } from "../models/Attendance.js";
import { StudentModel } from "../models/Student.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getSchoolTimezone, todayInTZ } from "../config/date.js";

/**
 * GET /api/attendance
 * Query:
 *  - date=YYYY-MM-DD (default today in school TZ)
 *  - from=YYYY-MM-DD&to=YYYY-MM-DD
 *  - className, sec, rollNumber
 */
export const getAttendance = asyncHandler(
  async (req: ScopedSchoolRequest, res: any) => {
    const schoolId = req.schoolScopeId!;
    const q = req.query as any;

    const tz = await getSchoolTimezone(schoolId);

    const date = q.date ? String(q.date) : "";
    const from = q.from ? String(q.from) : "";
    const to = q.to ? String(q.to) : "";

    const studentFilter: any = { schoolId, isActive: true };
    if (q.className) studentFilter.className = String(q.className).trim();
    if (q.sec) studentFilter.sec = String(q.sec).trim();
    if (q.rollNumber) studentFilter.rollNumber = String(q.rollNumber).trim();

    let studentIds: any[] | undefined;
    const hasStudentFilters = Object.keys(studentFilter).length > 2;

    if (hasStudentFilters) {
      const students = await StudentModel.find(studentFilter)
        .select("_id")
        .lean();
      studentIds = students.map((s) => s._id);
      if (studentIds.length === 0)
        return res.json({ ok: true, count: 0, items: [] });
    }

    const filter: any = { schoolId };
    if (studentIds) filter.studentId = { $in: studentIds };

    if (from && to) filter.date = { $gte: from, $lte: to };
    else filter.date = date || todayInTZ(tz);

    const items = await AttendanceModel.find(filter)
      .sort({ date: -1, markedAt: 1 })
      .populate(
        "studentId",
        "name className sec rollNumber house parentWhatsapp"
      )
      .populate("deviceId", "name location")
      .lean();

    res.json({
      ok: true,
      count: items.length,
      items: items.map((a: any) => ({
        id: String(a._id),
        date: a.date,
        time: a.markedAt,
        status: a.status,
        photoUrl: a.arrivalPhotoUrl ?? null,
        whatsappSentAt: a.whatsappSentAt ?? null,
        student: a.studentId
          ? {
              id: String(a.studentId._id),
              name: a.studentId.name,
              className: a.studentId.className,
              sec: a.studentId.sec,
              rollNumber: a.studentId.rollNumber,
              house: a.studentId.house,
            }
          : null,
        device: a.deviceId
          ? {
              id: String(a.deviceId._id),
              name: a.deviceId.name,
              location: a.deviceId.location ?? null,
            }
          : null,
      })),
    });
  }
);
