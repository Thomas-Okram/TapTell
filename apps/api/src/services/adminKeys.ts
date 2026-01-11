import crypto from "crypto";
import bcrypt from "bcryptjs";
import { AdminModel } from "../models/Admin.js";
import type { Types } from "mongoose";

// Key format: sa_<keyId>.<secret>
// - keyId is stored on admin (fast lookup)
// - only secret is bcrypt-hashed
function makeKeyId() {
  return "k_" + crypto.randomBytes(4).toString("hex"); // 8 hex chars + prefix (short)
}
function makeSecret() {
  return crypto.randomBytes(10).toString("hex"); // 20 chars
}

export async function createSchoolAdminKey(args: {
  name: string;
  schoolId: Types.ObjectId;
}) {
  const keyId = makeKeyId();
  const secret = makeSecret();

  const apiKeyHash = await bcrypt.hash(secret, 10);

  const admin = await AdminModel.create({
    name: args.name.trim(),
    role: "SCHOOL_ADMIN",
    schoolId: args.schoolId,
    apiKeyId: keyId,
    apiKeyHash,
    isActive: true,
  });

  const plaintextKey = `sa_${keyId}.${secret}`;
  return { admin, plaintextKey };
}
