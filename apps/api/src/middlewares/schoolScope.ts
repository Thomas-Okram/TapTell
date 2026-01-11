import type { Response, NextFunction } from "express";
import mongoose from "mongoose";
import type { AuthedAdminRequest } from "../utils/types.ts";

export interface ScopedSchoolRequest extends AuthedAdminRequest {
  schoolScopeId?: mongoose.Types.ObjectId;
}

/**
 * SCHOOL_ADMIN: always uses admin.schoolId
 * SUPER_ADMIN: must pass schoolId in query or body
 */
export function schoolScope(
  req: ScopedSchoolRequest,
  res: Response,
  next: NextFunction
) {
  const admin = req.admin;
  if (!admin) return res.status(401).json({ ok: false, error: "Unauthorized" });

  if (admin.role === "SCHOOL_ADMIN") {
    if (!admin.schoolId) {
      return res
        .status(500)
        .json({ ok: false, error: "Admin misconfigured: missing schoolId" });
    }
    req.schoolScopeId = admin.schoolId;
    return next();
  }

  const fromQuery = req.query?.schoolId ? String(req.query.schoolId) : "";
  const fromBody = req.body?.schoolId ? String(req.body.schoolId) : "";
  const sid = (fromQuery || fromBody).trim();

  if (!sid)
    return res
      .status(400)
      .json({ ok: false, error: "schoolId is required for SUPER_ADMIN" });
  if (!mongoose.Types.ObjectId.isValid(sid))
    return res.status(400).json({ ok: false, error: "Invalid schoolId" });

  req.schoolScopeId = new mongoose.Types.ObjectId(sid);
  return next();
}
