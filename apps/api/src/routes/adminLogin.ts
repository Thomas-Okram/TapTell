import { Router } from "express";
import bcrypt from "bcryptjs";
import { asyncHandler } from "../utils/asyncHandler.js";
import { SchoolModel } from "../models/School.js";
import { AdminModel } from "../models/Admin.js";
import { env } from "../config/env.js";
import { signAdminToken } from "../utils/token.js";

const router = Router();

/**
 * POST /api/admin/login-pin
 * body: { schoolCode: string, pin: string }
 *
 * Returns token that you store and use as x-admin-key = "tpt_<token>"
 */
router.post(
  "/login-pin",
  asyncHandler(async (req, res) => {
    const schoolCode = String(req.body?.schoolCode ?? "")
      .trim()
      .toUpperCase();
    const pin = String(req.body?.pin ?? "").trim();

    if (!schoolCode || !pin) {
      return res
        .status(400)
        .json({ ok: false, error: "schoolCode and pin are required" });
    }

    const school = await SchoolModel.findOne({
      code: schoolCode,
      isActive: true,
    })
      .select("_id name code timezone")
      .lean();

    if (!school)
      return res
        .status(401)
        .json({ ok: false, error: "Invalid school code / inactive" });

    // Find active admins for this school (PIN-based)
    const admins = await AdminModel.find({
      role: "SCHOOL_ADMIN",
      schoolId: school._id,
      isActive: true,
      pinHash: { $exists: true, $ne: null },
    })
      .select("_id name pinHash schoolId role")
      .lean();

    if (admins.length === 0) {
      return res
        .status(401)
        .json({ ok: false, error: "No PIN admins configured for this school" });
    }

    let matched: any = null;
    for (const a of admins) {
      if (!a.pinHash) continue;
      const ok = await bcrypt.compare(pin, a.pinHash);
      if (ok) {
        matched = a;
        break;
      }
    }

    if (!matched)
      return res.status(401).json({ ok: false, error: "Invalid PIN" });

    // 30 days token
    const now = Math.floor(Date.now() / 1000);
    const exp = now + 60 * 60 * 24 * 30;

    const token = signAdminToken(env.ADMIN_TOKEN_SECRET, {
      sub: String(matched._id),
      role: "SCHOOL_ADMIN",
      schoolId: String(matched.schoolId),
      iat: now,
      exp,
    });

    return res.json({
      ok: true,
      admin: {
        id: String(matched._id),
        name: matched.name,
        role: "SCHOOL_ADMIN",
        schoolId: String(matched.schoolId),
      },
      school: {
        id: String(school._id),
        name: school.name,
        code: school.code,
        timezone: school.timezone ?? "Asia/Kolkata",
      },
      token: `tpt_${token}`,
      expiresAt: new Date(exp * 1000).toISOString(),
    });
  })
);

export default router;
