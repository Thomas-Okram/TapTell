import type { Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import { env } from "../config/env.js";
import { AdminModel } from "../models/Admin.js";
import type { AuthedAdminRequest } from "../utils/types.ts";
import { verifyAdminToken } from "../utils/token.js";

/**
 * Header: x-admin-key
 * Supported:
 * - SUPER_ADMIN_KEY (env)
 * - Token: "tpt_<token>"
 * - Legacy school admin key: "sa_<keyId>.<secret>" (optional)
 */
export async function adminAuth(
  req: AuthedAdminRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const raw = req.header("x-admin-key")?.trim();
    if (!raw)
      return res.status(401).json({ ok: false, error: "Missing x-admin-key" });

    // 1) Super admin env key
    if (env.SUPER_ADMIN_KEY && raw === env.SUPER_ADMIN_KEY.trim()) {
      req.admin = { _id: null, role: "SUPER_ADMIN" };
      return next();
    }

    // 2) Token
    if (raw.startsWith("tpt_")) {
      const token = raw.slice(4);
      const payload = verifyAdminToken(env.ADMIN_TOKEN_SECRET, token);
      if (!payload)
        return res
          .status(401)
          .json({ ok: false, error: "Invalid/expired token" });

      if (payload.role === "SCHOOL_ADMIN") {
        if (!payload.schoolId)
          return res
            .status(401)
            .json({ ok: false, error: "Invalid token scope" });
        req.admin = {
          _id: payload.sub ? (payload.sub as any) : null,
          role: "SCHOOL_ADMIN",
          schoolId: payload.schoolId as any,
        };
        return next();
      }

      req.admin = {
        _id: payload.sub ? (payload.sub as any) : null,
        role: "SUPER_ADMIN",
      };
      return next();
    }

    // 3) Legacy "sa_" key (keep if you want backwards compatibility)
    if (raw.startsWith("sa_")) {
      const rest = raw.slice(3);
      const dot = rest.indexOf(".");
      if (dot <= 0)
        return res
          .status(401)
          .json({ ok: false, error: "Invalid admin key format" });

      const keyId = rest.slice(0, dot).trim();
      const secret = rest.slice(dot + 1).trim();

      const admin = await AdminModel.findOne({
        apiKeyId: keyId,
        isActive: true,
      })
        .select("_id role schoolId apiKeyHash")
        .lean();

      if (!admin || !admin.apiKeyHash)
        return res.status(401).json({ ok: false, error: "Invalid admin key" });

      const ok = await bcrypt.compare(secret, admin.apiKeyHash);
      if (!ok)
        return res.status(401).json({ ok: false, error: "Invalid admin key" });

      if (admin.role === "SCHOOL_ADMIN") {
        if (!admin.schoolId)
          return res.status(500).json({
            ok: false,
            error: "Admin misconfigured: missing schoolId",
          });
        req.admin = {
          _id: admin._id,
          role: "SCHOOL_ADMIN",
          schoolId: admin.schoolId,
        };
        return next();
      }

      req.admin = { _id: admin._id, role: "SUPER_ADMIN" };
      return next();
    }

    return res.status(401).json({ ok: false, error: "Invalid admin key" });
  } catch (e: any) {
    console.error("adminAuth error:", e);
    return res
      .status(500)
      .json({ ok: false, error: e?.message ?? "Auth error" });
  }
}
