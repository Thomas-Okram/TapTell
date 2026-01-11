import { Router } from "express";
import { adminAuth } from "../middlewares/adminAuth.js";
import { requireRole } from "../middlewares/requireRole.js";
import { schoolScope } from "../middlewares/schoolScope.js";
import {
  listStudents,
  createStudent,
  updateStudent,
  deleteStudent,
} from "../controllers/studentsController.js";

const router = Router();

router.use(adminAuth, requireRole("SUPER_ADMIN", "SCHOOL_ADMIN"), schoolScope);

router.get("/", listStudents);
router.post("/", createStudent);
router.patch("/:id", updateStudent);
router.delete("/:id", deleteStudent);

export default router;
