import mongoose, { Schema, model, Types, type Model } from "mongoose";

export type AdminRole = "SUPER_ADMIN" | "SCHOOL_ADMIN";

export type AdminDoc = {
  _id: Types.ObjectId;
  name: string;
  role: AdminRole;
  schoolId?: Types.ObjectId;

  // Legacy key system (optional)
  apiKeyId?: string;
  apiKeyHash?: string;

  // ✅ PIN login (preferred for SCHOOL_ADMIN)
  pinHash?: string;

  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

const AdminSchema = new Schema<AdminDoc>(
  {
    name: { type: String, required: true, trim: true },

    role: {
      type: String,
      enum: ["SUPER_ADMIN", "SCHOOL_ADMIN"],
      required: true,
      index: true,
    },

    schoolId: { type: Schema.Types.ObjectId, ref: "School", index: true },

    apiKeyId: { type: String, trim: true, default: undefined },
    apiKeyHash: { type: String, default: undefined },

    pinHash: { type: String, default: undefined },

    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

// ✅ enforce schoolId for SCHOOL_ADMIN
AdminSchema.path("schoolId").validate(function (this: any, v: any) {
  if (this.role === "SCHOOL_ADMIN") return Boolean(v);
  return true;
}, "schoolId is required for SCHOOL_ADMIN");

// ✅ enforce at least one auth method for SCHOOL_ADMIN
AdminSchema.pre("validate", function () {
  const doc = this as any;

  if (doc.role === "SCHOOL_ADMIN") {
    const hasPin = Boolean(doc.pinHash);
    const hasKey = Boolean(doc.apiKeyHash && doc.apiKeyId);

    if (!hasPin && !hasKey) {
      throw new Error("SCHOOL_ADMIN must have pinHash or apiKeyId+apiKeyHash");
    }
  }
});

AdminSchema.index({ schoolId: 1, role: 1 });

// Keep unique apiKeyId if you still use legacy keys
AdminSchema.index({ apiKeyId: 1 }, { unique: true, sparse: true });

const Existing = mongoose.models.Admin as Model<AdminDoc> | undefined;
export const AdminModel = Existing ?? model<AdminDoc>("Admin", AdminSchema);
export const Admin = AdminModel;
