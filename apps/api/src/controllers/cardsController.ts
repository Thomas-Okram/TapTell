import mongoose from "mongoose";
import { CardModel } from "../models/Card.js";
import { StudentModel } from "../models/Student.js";
import type { ScopedSchoolRequest } from "../middlewares/schoolScope.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const listCards = asyncHandler(
  async (req: ScopedSchoolRequest, res: any) => {
    const schoolId = req.schoolScopeId!;
    const { status, q } = req.query as any;

    const filter: any = { schoolId };
    if (status) filter.status = String(status).trim();

    if (q) {
      const s = String(q).trim();
      filter.$or = [{ uid: new RegExp(s, "i") }, { notes: new RegExp(s, "i") }];
    }

    const cards = await CardModel.find(filter)
      .sort({ createdAt: -1 })
      .populate("assignedStudentId", "name className sec rollNumber house")
      .lean();

    res.json({ ok: true, cards });
  }
);

export const createCard = asyncHandler(
  async (req: ScopedSchoolRequest, res: any) => {
    const schoolId = req.schoolScopeId!;
    const uid = String(req.body?.uid ?? "").trim();
    if (!uid)
      return res.status(400).json({ ok: false, error: "uid is required" });

    try {
      const card = await CardModel.create({
        schoolId,
        uid,
        status: "UNASSIGNED",
        assignedStudentId: null,
      });

      res.json({ ok: true, card });
    } catch (e: any) {
      if (e?.code === 11000) {
        return res.status(409).json({
          ok: false,
          error: "Card UID already exists for this school",
        });
      }
      throw e;
    }
  }
);

export const updateCard = asyncHandler(
  async (req: ScopedSchoolRequest, res: any) => {
    const schoolId = req.schoolScopeId!;
    const id = String(req.params.id);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ ok: false, error: "Invalid card id" });
    }

    const patch: any = {};
    const b = req.body ?? {};
    if (b.status !== undefined) patch.status = String(b.status).trim();
    if (b.notes !== undefined) patch.notes = String(b.notes).trim();

    const card = await CardModel.findOneAndUpdate(
      { _id: id, schoolId },
      { $set: patch },
      { new: true }
    ).lean();

    if (!card)
      return res.status(404).json({ ok: false, error: "Card not found" });
    res.json({ ok: true, card });
  }
);

export const deleteCard = asyncHandler(
  async (req: ScopedSchoolRequest, res: any) => {
    const schoolId = req.schoolScopeId!;
    const id = String(req.params.id);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ ok: false, error: "Invalid card id" });
    }

    const card = await CardModel.findOneAndUpdate(
      { _id: id, schoolId },
      { $set: { status: "DISABLED", assignedStudentId: null } },
      { new: true }
    ).lean();

    if (!card)
      return res.status(404).json({ ok: false, error: "Card not found" });
    res.json({ ok: true });
  }
);

export const assignCard = asyncHandler(
  async (req: ScopedSchoolRequest, res: any) => {
    const schoolId = req.schoolScopeId!;
    const cardId = String(req.params.id);
    const studentId = String(req.body?.studentId ?? "");

    if (!mongoose.Types.ObjectId.isValid(cardId))
      return res.status(400).json({ ok: false, error: "Invalid card id" });
    if (!mongoose.Types.ObjectId.isValid(studentId))
      return res.status(400).json({ ok: false, error: "Invalid studentId" });

    const student = await StudentModel.findOne({
      _id: studentId,
      schoolId,
      isActive: true,
    }).lean();
    if (!student)
      return res
        .status(404)
        .json({ ok: false, error: "Student not found / inactive" });

    await CardModel.updateMany(
      { schoolId, assignedStudentId: student._id, _id: { $ne: cardId } },
      { $set: { status: "UNASSIGNED", assignedStudentId: null } }
    );

    const card = await CardModel.findOneAndUpdate(
      { _id: cardId, schoolId },
      { $set: { status: "ASSIGNED", assignedStudentId: student._id } },
      { new: true }
    ).lean();

    if (!card)
      return res.status(404).json({ ok: false, error: "Card not found" });
    res.json({ ok: true, card });
  }
);

export const unassignCard = asyncHandler(
  async (req: ScopedSchoolRequest, res: any) => {
    const schoolId = req.schoolScopeId!;
    const cardId = String(req.params.id);

    if (!mongoose.Types.ObjectId.isValid(cardId))
      return res.status(400).json({ ok: false, error: "Invalid card id" });

    const card = await CardModel.findOneAndUpdate(
      { _id: cardId, schoolId },
      { $set: { status: "UNASSIGNED", assignedStudentId: null } },
      { new: true }
    ).lean();

    if (!card)
      return res.status(404).json({ ok: false, error: "Card not found" });
    res.json({ ok: true, card });
  }
);
