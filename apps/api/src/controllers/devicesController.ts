import mongoose from "mongoose";
import { nanoid } from "nanoid";
import { DeviceModel } from "../models/Device.js";
import type { ScopedSchoolRequest } from "../middlewares/schoolScope.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const listDevices = asyncHandler(
  async (req: ScopedSchoolRequest, res: any) => {
    const schoolId = req.schoolScopeId!;
    const devices = await DeviceModel.find({ schoolId })
      .sort({ createdAt: -1 })
      .lean();
    res.json({ ok: true, devices });
  }
);

export const createDevice = asyncHandler(
  async (req: ScopedSchoolRequest, res: any) => {
    const schoolId = req.schoolScopeId!;
    const name = String(req.body?.name ?? "").trim();
    const location =
      req.body?.location !== undefined
        ? String(req.body.location).trim()
        : undefined;

    if (!name)
      return res.status(400).json({ ok: false, error: "name is required" });

    const deviceKey = nanoid(28);

    const device = await DeviceModel.create({
      schoolId,
      name,
      deviceKey,
      isActive: true,
      ...(location ? { location } : {}),
    });

    res.json({ ok: true, device });
  }
);

export const updateDevice = asyncHandler(
  async (req: ScopedSchoolRequest, res: any) => {
    const schoolId = req.schoolScopeId!;
    const id = String(req.params.id);

    if (!mongoose.isValidObjectId(id))
      return res.status(400).json({ ok: false, error: "Invalid device id" });

    const patch: Record<string, any> = {};
    if (req.body?.name !== undefined) patch.name = String(req.body.name).trim();
    if (req.body?.location !== undefined)
      patch.location = String(req.body.location).trim();
    if (req.body?.isActive !== undefined)
      patch.isActive = Boolean(req.body.isActive);

    const device = await DeviceModel.findOneAndUpdate(
      { _id: id, schoolId },
      { $set: patch },
      { new: true }
    ).lean();
    if (!device)
      return res.status(404).json({ ok: false, error: "Device not found" });

    res.json({ ok: true, device });
  }
);

export const rotateDeviceKey = asyncHandler(
  async (req: ScopedSchoolRequest, res: any) => {
    const schoolId = req.schoolScopeId!;
    const id = String(req.params.id);

    if (!mongoose.isValidObjectId(id))
      return res.status(400).json({ ok: false, error: "Invalid device id" });

    const newKey = nanoid(28);

    const device = await DeviceModel.findOneAndUpdate(
      { _id: id, schoolId },
      { $set: { deviceKey: newKey } },
      { new: true }
    ).lean();

    if (!device)
      return res.status(404).json({ ok: false, error: "Device not found" });
    res.json({ ok: true, device });
  }
);

export const deactivateDevice = asyncHandler(
  async (req: ScopedSchoolRequest, res: any) => {
    const schoolId = req.schoolScopeId!;
    const id = String(req.params.id);

    if (!mongoose.isValidObjectId(id))
      return res.status(400).json({ ok: false, error: "Invalid device id" });

    const device = await DeviceModel.findOneAndUpdate(
      { _id: id, schoolId },
      { $set: { isActive: false } },
      { new: true }
    ).lean();

    if (!device)
      return res.status(404).json({ ok: false, error: "Device not found" });
    res.json({ ok: true });
  }
);
