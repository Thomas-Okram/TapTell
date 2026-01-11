import { Router } from "express";
import {
  deviceAuth,
  type AuthedDeviceRequest,
} from "../middlewares/deviceAuth.js";
import { cloudinary, isCloudinaryConfigured } from "../config/cloudinary.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.post(
  "/upload",
  deviceAuth,
  asyncHandler(async (req: AuthedDeviceRequest, res) => {
    const { photoBase64, folder } = req.body as {
      photoBase64?: string;
      folder?: string;
    };

    if (!isCloudinaryConfigured) {
      return res
        .status(500)
        .json({ ok: false, error: "Cloudinary not configured" });
    }

    if (!photoBase64 || typeof photoBase64 !== "string") {
      return res.status(400).json({ ok: false, error: "photoBase64 required" });
    }

    const looksLikeImage =
      photoBase64.startsWith("data:image/") || photoBase64.length > 2000;
    if (!looksLikeImage) {
      return res
        .status(400)
        .json({ ok: false, error: "Invalid image payload" });
    }

    const device = req.device!;
    const upload = await cloudinary.uploader.upload(photoBase64, {
      folder: folder ?? `taptell/${String(device.schoolId)}/attendance`,
      resource_type: "image",
    });

    res.json({ ok: true, url: upload.secure_url, public_id: upload.public_id });
  })
);

export default router;
