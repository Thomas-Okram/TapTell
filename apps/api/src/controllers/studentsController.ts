import mongoose from "mongoose";
import { StudentModel } from "../models/Student.js";
import { CardModel } from "../models/Card.js";
import type { ScopedSchoolRequest } from "../middlewares/schoolScope.ts";
import { asyncHandler } from "../utils/asyncHandler.js";

export const listStudents = asyncHandler(
  async (req: ScopedSchoolRequest, res: any) => {
    const schoolId = req.schoolScopeId!;
    const { className, sec, q } = req.query as any;

    const filter: any = { schoolId, isActive: true };
    if (className) filter.className = String(className).trim();
    if (sec) filter.sec = String(sec).trim();

    if (q) {
      const s = String(q).trim();
      filter.$or = [
        { name: new RegExp(s, "i") },
        { rollNumber: new RegExp(s, "i") },
        { parentWhatsapp: new RegExp(s, "i") },
      ];
    }

    const students = await StudentModel.find(filter)
      .sort({ createdAt: -1 })
      .lean();
    res.json({ ok: true, students });
  }
);

export const createStudent = asyncHandler(
  async (req: ScopedSchoolRequest, res: any) => {
    const schoolId = req.schoolScopeId!;
    const b = req.body ?? {};

    const name = String(b.name ?? "").trim();
    const className = String(b.className ?? "").trim();
    const sec = String(b.sec ?? "").trim();
    const rollNumber = String(b.rollNumber ?? "").trim();
    const house = String(b.house ?? "").trim();
    const parentWhatsapp = String(b.parentWhatsapp ?? "").trim();

    if (
      !name ||
      !className ||
      !sec ||
      !rollNumber ||
      !house ||
      !parentWhatsapp
    ) {
      return res.status(400).json({
        ok: false,
        error:
          "name, className, sec, rollNumber, house, parentWhatsapp are required",
      });
    }

    try {
      const student = await StudentModel.create({
        schoolId,
        name,
        className,
        sec,
        rollNumber,
        house,
        parentWhatsapp,
        isActive: true,
      });

      res.json({ ok: true, student });
    } catch (e: any) {
      // common: duplicate unique index (class+sec+rollNumber within school)
      if (e?.code === 11000) {
        return res.status(409).json({
          ok: false,
          error: "Student already exists (same className + sec + rollNumber)",
        });
      }
      throw e;
    }
  }
);

export const updateStudent = asyncHandler(
  async (req: ScopedSchoolRequest, res: any) => {
    const schoolId = req.schoolScopeId!;
    const id = String(req.params.id);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ ok: false, error: "Invalid student id" });
    }

    const patch: any = {};
    const b = req.body ?? {};

    if (b.name !== undefined) patch.name = String(b.name).trim();
    if (b.className !== undefined) patch.className = String(b.className).trim();
    if (b.sec !== undefined) patch.sec = String(b.sec).trim();
    if (b.rollNumber !== undefined)
      patch.rollNumber = String(b.rollNumber).trim();
    if (b.house !== undefined) patch.house = String(b.house).trim();
    if (b.parentWhatsapp !== undefined)
      patch.parentWhatsapp = String(b.parentWhatsapp).trim();
    if (b.isActive !== undefined) patch.isActive = Boolean(b.isActive);

    const student = await StudentModel.findOneAndUpdate(
      { _id: id, schoolId },
      { $set: patch },
      { new: true }
    ).lean();

    if (!student)
      return res.status(404).json({ ok: false, error: "Student not found" });
    res.json({ ok: true, student });
  }
);

export const deleteStudent = asyncHandler(
  async (req: ScopedSchoolRequest, res: any) => {
    const schoolId = req.schoolScopeId!;
    const id = String(req.params.id);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ ok: false, error: "Invalid student id" });
    }

    const student = await StudentModel.findOneAndUpdate(
      { _id: id, schoolId },
      { $set: { isActive: false } },
      { new: true }
    ).lean();

    if (!student)
      return res.status(404).json({ ok: false, error: "Student not found" });

    await CardModel.updateMany(
      { schoolId, assignedStudentId: student._id },
      { $set: { status: "UNASSIGNED", assignedStudentId: null } }
    );

    res.json({ ok: true });
  }
);
