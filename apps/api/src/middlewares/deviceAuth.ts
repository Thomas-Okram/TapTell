import type { Request, Response, NextFunction } from "express";
import type { Types } from "mongoose";
import { DeviceModel } from "../models/Device.js";

export type AuthedDevice = {
  _id: Types.ObjectId;
  schoolId: Types.ObjectId;
  name?: string;
};

export interface AuthedDeviceRequest extends Request {
  device?: AuthedDevice;
}

export async function deviceAuth(
  req: AuthedDeviceRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const key = req.header("x-device-key")?.trim();
    if (!key)
      return res.status(401).json({ ok: false, error: "Missing x-device-key" });

    const device = await DeviceModel.findOne(
      { deviceKey: key, isActive: true },
      { _id: 1, schoolId: 1, name: 1 }
    ).lean();

    if (!device)
      return res.status(401).json({ ok: false, error: "Invalid device key" });

    req.device = {
      _id: device._id,
      schoolId: device.schoolId,
      name: device.name,
    };
    next();
  } catch (e) {
    next(e);
  }
}
