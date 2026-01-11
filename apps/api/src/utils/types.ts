import type { Request } from "express";
import type { Types } from "mongoose";

export type AuthedAdmin =
  | { _id: Types.ObjectId | null; role: "SUPER_ADMIN" }
  | {
      _id: Types.ObjectId | null;
      role: "SCHOOL_ADMIN";
      schoolId: Types.ObjectId;
    };

export interface AuthedAdminRequest extends Request {
  admin?: AuthedAdmin;
}
