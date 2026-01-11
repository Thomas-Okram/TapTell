import type { Response, NextFunction } from "express";
import type { AuthedAdminRequest } from "../utils/types.js";

export type AdminRole = "SUPER_ADMIN" | "SCHOOL_ADMIN";

export function requireRole(...roles: AdminRole[]) {
  return (req: AuthedAdminRequest, res: Response, next: NextFunction) => {
    const admin = req.admin;
    if (!admin)
      return res.status(401).json({ ok: false, error: "Unauthorized" });

    if (!roles.includes(admin.role as AdminRole)) {
      return res.status(403).json({ ok: false, error: "Forbidden" });
    }

    next();
  };
}
