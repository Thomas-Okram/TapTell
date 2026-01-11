import { Router } from "express";
import { adminAuth } from "../middlewares/adminAuth.js";
import { requireRole } from "../middlewares/requireRole.js";
import { schoolScope } from "../middlewares/schoolScope.js";
import {
  listDevices,
  createDevice,
  updateDevice,
  rotateDeviceKey,
  deactivateDevice,
} from "../controllers/devicesController.js";

const router = Router();

router.use(adminAuth, requireRole("SUPER_ADMIN", "SCHOOL_ADMIN"), schoolScope);

router.get("/", listDevices);
router.post("/", createDevice);
router.patch("/:id", updateDevice);
router.post("/:id/rotate-key", rotateDeviceKey);
router.delete("/:id", deactivateDevice);

export default router;
