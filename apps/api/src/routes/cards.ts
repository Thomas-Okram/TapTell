import { Router } from "express";
import { adminAuth } from "../middlewares/adminAuth.js";
import { requireRole } from "../middlewares/requireRole.js";
import { schoolScope } from "../middlewares/schoolScope.js";
import {
  listCards,
  createCard,
  updateCard,
  deleteCard,
  assignCard,
  unassignCard,
} from "../controllers/cardsController.js";

const router = Router();

router.use(adminAuth, requireRole("SUPER_ADMIN", "SCHOOL_ADMIN"), schoolScope);

router.get("/", listCards);
router.post("/", createCard);
router.patch("/:id", updateCard);
router.delete("/:id", deleteCard);
router.post("/:id/assign", assignCard);
router.post("/:id/unassign", unassignCard);

export default router;
