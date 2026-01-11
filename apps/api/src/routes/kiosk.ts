import { Router } from "express";
import { CardModel } from "../models/Card.js";
import { StudentModel } from "../models/Student.js";
import { AttendanceModel } from "../models/Attendance.js";
import {
  deviceAuth,
  type AuthedDeviceRequest,
} from "../middlewares/deviceAuth.js";
import { cloudinary, isCloudinaryConfigured } from "../config/cloudinary.js";
import { sendArrivalWhatsApp } from "../services/whatsapp.js";
import { getSchoolTimezone, todayInTZ } from "../config/date.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.post(
  "/auth/test",
  deviceAuth,
  asyncHandler(async (req: AuthedDeviceRequest, res) => {
    const device = req.device!;
    res.json({
      ok: true,
      device: {
        id: String(device._id),
        name: device.name ?? "Kiosk Device",
        schoolId: String(device.schoolId),
      },
    });
  })
);

router.post(
  "/attendance/mark",
  deviceAuth,
  asyncHandler(async (req: AuthedDeviceRequest, res) => {
    const device = req.device!;
    const {
      uid,
      photoBase64,
      photoUrl: incomingPhotoUrl,
      photoCloudinaryId,
    } = req.body ?? {};

    if (!uid)
      return res.status(400).json({ ok: false, error: "uid is required" });

    const card = await CardModel.findOne({
      schoolId: device.schoolId,
      uid: String(uid).trim(),
    }).lean();
    if (!card)
      return res.status(404).json({ ok: false, error: "Card not found" });

    if (card.status !== "ASSIGNED" || !card.assignedStudentId) {
      return res.status(400).json({ ok: false, error: "Card not assigned" });
    }

    const student = await StudentModel.findOne({
      _id: card.assignedStudentId,
      schoolId: device.schoolId,
      isActive: true,
    }).lean();

    if (!student)
      return res
        .status(404)
        .json({ ok: false, error: "Student not found / inactive" });

    const tz = await getSchoolTimezone(device.schoolId);
    const date = todayInTZ(tz);

    // If already marked today, do not resend WhatsApp
    const existing = await AttendanceModel.findOne({
      schoolId: device.schoolId,
      studentId: student._id,
      date,
    })
      .select("arrivalPhotoUrl whatsappSentAt markedAt")
      .lean();

    if (existing) {
      return res.json({
        ok: true,
        message: "Attendance already marked",
        student: {
          name: student.name,
          className: student.className,
          sec: student.sec,
          rollNumber: student.rollNumber,
          house: student.house,
        },
        photoUrl: existing.arrivalPhotoUrl ?? null,
        whatsappSentAt: existing.whatsappSentAt ?? null,
        markedAt: existing.markedAt,
      });
    }

    // Create attendance
    const att = await AttendanceModel.create({
      schoolId: device.schoolId,
      studentId: student._id,
      date,
      status: "PRESENT",
      markedAt: new Date(),
      deviceId: device._id,
      cardUid: card.uid,
    });

    // photo handling
    let finalPhotoUrl: string | undefined = incomingPhotoUrl
      ? String(incomingPhotoUrl).trim()
      : undefined;
    let finalCloudId: string | undefined = photoCloudinaryId
      ? String(photoCloudinaryId).trim()
      : undefined;

    if (!finalPhotoUrl && photoBase64) {
      if (isCloudinaryConfigured) {
        try {
          const upload = await cloudinary.uploader.upload(photoBase64, {
            folder: `taptell/${String(device.schoolId)}/attendance/${date}`,
            resource_type: "image",
          });

          finalPhotoUrl = upload.secure_url;
          finalCloudId = upload.public_id;
        } catch (e) {
          console.error("Cloudinary upload failed:", e);
        }
      } else {
        console.warn("Cloudinary not configured; skipping photo upload");
      }
    }

    if (finalPhotoUrl) {
      await AttendanceModel.updateOne(
        { _id: att._id },
        {
          $set: {
            arrivalPhotoUrl: finalPhotoUrl,
            ...(finalCloudId ? { arrivalPhotoCloudinaryId: finalCloudId } : {}),
          },
        }
      );
    }

    // WhatsApp (best-effort)
    try {
      await sendArrivalWhatsApp({
        to: student.parentWhatsapp,
        studentName: student.name,
        timeISO: new Date().toISOString(),
        ...(finalPhotoUrl ? { photoUrl: finalPhotoUrl } : {}),
      });

      await AttendanceModel.updateOne(
        { _id: att._id },
        { $set: { whatsappSentAt: new Date() } }
      );
    } catch (e) {
      console.error("WhatsApp send failed:", e);
    }

    res.json({
      ok: true,
      message: "Attendance marked successfully",
      student: {
        name: student.name,
        className: student.className,
        sec: student.sec,
        rollNumber: student.rollNumber,
        house: student.house,
      },
      photoUrl: finalPhotoUrl ?? null,
    });
  })
);

export default router;
