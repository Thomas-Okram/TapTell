import mongoose, { Schema, model, Types, type Model } from "mongoose";

export type StudentDoc = {
  _id: Types.ObjectId;
  schoolId: Types.ObjectId;

  name: string;
  className: string;
  sec: string;
  rollNumber: string;

  parentWhatsapp: string;
  house: string;

  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
};

const StudentSchema = new Schema<StudentDoc>(
  {
    schoolId: {
      type: Schema.Types.ObjectId,
      ref: "School",
      required: true,
      index: true,
    },

    name: { type: String, required: true, trim: true },
    className: { type: String, required: true, trim: true, index: true },
    sec: { type: String, required: true, trim: true, index: true },
    rollNumber: { type: String, required: true, trim: true, index: true },

    parentWhatsapp: { type: String, required: true, trim: true },
    house: { type: String, required: true, trim: true, index: true },

    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

StudentSchema.index(
  { schoolId: 1, className: 1, sec: 1, rollNumber: 1 },
  { unique: true }
);

const Existing = mongoose.models.Student as Model<StudentDoc> | undefined;
export const StudentModel =
  Existing ?? model<StudentDoc>("Student", StudentSchema);
export const Student = StudentModel;
