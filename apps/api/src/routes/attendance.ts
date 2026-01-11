import { Router } from "express";
import { adminAuth } from "../middlewares/adminAuth.js";
import { requireRole } from "../middlewares/requireRole.js";
import { schoolScope } from "../middlewares/schoolScope.js";
import { getAttendance } from "../controllers/attendanceController.js";

const router = Router();

router.use(adminAuth, requireRole("SUPER_ADMIN", "SCHOOL_ADMIN"), schoolScope);
router.get("/", getAttendance);

export default router;
