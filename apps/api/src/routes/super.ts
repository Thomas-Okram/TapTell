import { Router } from "express";
import mongoose from "mongoose";
import { adminAuth } from "../middlewares/adminAuth.js";
import { requireRole } from "../middlewares/requireRole.js";
import { createSchoolAdminKey } from "../services/adminKeys.js";
import { SchoolModel } from "../models/School.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { AdminModel } from "../models/Admin.js";

const router = Router();

router.use(adminAuth, requireRole("SUPER_ADMIN"));

function makePin() {
  return String(crypto.randomInt(100000, 1000000)); // 6-digit
}

router.post(
  "/school-admins/pin",
  asyncHandler(async (req, res) => {
    const { name, schoolId, pin } = req.body ?? {};
    if (!name || !schoolId) {
      return res
        .status(400)
        .json({ ok: false, error: "name and schoolId are required" });
    }
    if (!mongoose.Types.ObjectId.isValid(String(schoolId))) {
      return res.status(400).json({ ok: false, error: "Invalid schoolId" });
    }

    const plainPin = pin ? String(pin).trim() : makePin();
    if (!/^\d{6}$/.test(plainPin)) {
      return res
        .status(400)
        .json({ ok: false, error: "PIN must be exactly 6 digits" });
    }

    const pinHash = await bcrypt.hash(plainPin, 10);

    const admin = await AdminModel.create({
      name: String(name).trim(),
      role: "SCHOOL_ADMIN",
      schoolId: new mongoose.Types.ObjectId(String(schoolId)),
      pinHash,
      isActive: true,
    });

    return res.json({
      ok: true,
      adminId: String(admin._id),
      pin: plainPin, // shown once
    });
  })
);

router.get(
  "/school-admins",
  asyncHandler(async (req, res) => {
    const schoolId = req.query.schoolId
      ? String(req.query.schoolId).trim()
      : "";
    const filter: any = { role: "SCHOOL_ADMIN" };
    if (schoolId) {
      if (!mongoose.Types.ObjectId.isValid(schoolId)) {
        return res.status(400).json({ ok: false, error: "Invalid schoolId" });
      }
      filter.schoolId = new mongoose.Types.ObjectId(schoolId);
    }

    const admins = await AdminModel.find(filter)
      .select("_id name schoolId isActive createdAt updatedAt")
      .sort({ createdAt: -1 })
      .lean();

    const schoolIds = Array.from(
      new Set(admins.map((a) => String(a.schoolId)).filter(Boolean))
    );
    const schools = await SchoolModel.find({ _id: { $in: schoolIds } })
      .select("_id name code")
      .lean();

    const schoolMap = new Map(schools.map((s) => [String(s._id), s]));

    res.json({
      ok: true,
      admins: admins.map((a) => {
        const s = a.schoolId ? schoolMap.get(String(a.schoolId)) : undefined;
        return {
          id: String(a._id),
          name: a.name,
          schoolId: a.schoolId ? String(a.schoolId) : null,
          school: s ? { id: String(s._id), name: s.name, code: s.code } : null,
          isActive: Boolean(a.isActive),
          createdAt: a.createdAt,
          updatedAt: a.updatedAt,
        };
      }),
    });
  })
);

router.post(
  "/school-admins/:id/rotate-pin",
  asyncHandler(async (req, res) => {
    const id = String(req.params.id);
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ ok: false, error: "Invalid admin id" });
    }

    const plainPin = makePin();
    const pinHash = await bcrypt.hash(plainPin, 10);

    const updated = await AdminModel.findOneAndUpdate(
      { _id: id, role: "SCHOOL_ADMIN" },
      { $set: { pinHash, isActive: true } },
      { new: true }
    ).lean();

    if (!updated)
      return res.status(404).json({ ok: false, error: "Admin not found" });

    return res.json({ ok: true, adminId: id, pin: plainPin });
  })
);

router.patch(
  "/school-admins/:id",
  asyncHandler(async (req, res) => {
    const id = String(req.params.id);
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ ok: false, error: "Invalid admin id" });
    }

    const isActive = req.body?.isActive;
    if (typeof isActive !== "boolean") {
      return res
        .status(400)
        .json({ ok: false, error: "isActive must be boolean" });
    }

    const updated = await AdminModel.findOneAndUpdate(
      { _id: id, role: "SCHOOL_ADMIN" },
      { $set: { isActive } },
      { new: true }
    ).lean();

    if (!updated)
      return res.status(404).json({ ok: false, error: "Admin not found" });

    return res.json({ ok: true });
  })
);

router.get(
  "/schools",
  asyncHandler(async (_req, res) => {
    const schools = await SchoolModel.find().sort({ createdAt: -1 }).lean();
    res.json({ ok: true, schools });
  })
);

router.post(
  "/schools",
  asyncHandler(async (req, res) => {
    const { name, code, timezone } = req.body ?? {};
    if (!name || !code)
      return res
        .status(400)
        .json({ ok: false, error: "name and code are required" });

    const cleanCode = String(code).trim().toUpperCase();
    const dup = await SchoolModel.findOne({ code: cleanCode }).lean();
    if (dup)
      return res
        .status(409)
        .json({ ok: false, error: "School code already exists" });

    const school = await SchoolModel.create({
      name: String(name).trim(),
      code: cleanCode,
      timezone: timezone ? String(timezone) : "Asia/Kolkata",
    });

    res.json({ ok: true, school });
  })
);

router.patch(
  "/schools/:id",
  asyncHandler(async (req, res) => {
    const id = String(req.params.id);
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ ok: false, error: "Invalid school id" });

    const patch: any = {};
    if (req.body?.name) patch.name = String(req.body.name).trim();
    if (req.body?.code) patch.code = String(req.body.code).trim().toUpperCase();
    if (req.body?.timezone) patch.timezone = String(req.body.timezone);

    if (patch.code) {
      const dup = await SchoolModel.findOne({
        code: patch.code,
        _id: { $ne: id },
      }).lean();
      if (dup)
        return res
          .status(409)
          .json({ ok: false, error: "School code already exists" });
    }

    const school = await SchoolModel.findByIdAndUpdate(
      id,
      { $set: patch },
      { new: true }
    ).lean();
    if (!school)
      return res.status(404).json({ ok: false, error: "School not found" });

    res.json({ ok: true, school });
  })
);

router.delete(
  "/schools/:id",
  asyncHandler(async (req, res) => {
    const id = String(req.params.id);
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ ok: false, error: "Invalid school id" });

    const school = await SchoolModel.findByIdAndDelete(id).lean();
    if (!school)
      return res.status(404).json({ ok: false, error: "School not found" });

    res.json({ ok: true });
  })
);

router.post(
  "/school-admins",
  asyncHandler(async (req, res) => {
    const { name, schoolId } = req.body ?? {};
    if (!name || !schoolId)
      return res
        .status(400)
        .json({ ok: false, error: "name and schoolId are required" });

    if (!mongoose.Types.ObjectId.isValid(String(schoolId))) {
      return res.status(400).json({ ok: false, error: "Invalid schoolId" });
    }

    const { admin, plaintextKey } = await createSchoolAdminKey({
      name: String(name),
      schoolId: new mongoose.Types.ObjectId(String(schoolId)),
    });

    // show plaintext ONLY once
    res.json({ ok: true, adminId: String(admin._id), key: plaintextKey });
  })
);

export default router;
