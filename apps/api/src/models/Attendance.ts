import mongoose, { Schema, model, Types, type Model } from "mongoose";

export type AttendanceStatus = "PRESENT";

export type AttendanceDoc = {
  _id: Types.ObjectId;
  schoolId: Types.ObjectId;
  studentId: Types.ObjectId;

  date: string; // YYYY-MM-DD in school timezone
  status: AttendanceStatus;
  markedAt: Date;

  deviceId?: Types.ObjectId;
  cardUid?: string;

  arrivalPhotoUrl?: string;
  arrivalPhotoCloudinaryId?: string;
  whatsappSentAt?: Date;

  createdAt: Date;
  updatedAt: Date;
};

const AttendanceSchema = new Schema<AttendanceDoc>(
  {
    schoolId: {
      type: Schema.Types.ObjectId,
      ref: "School",
      required: true,
      index: true,
    },
    studentId: {
      type: Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true,
    },

    date: { type: String, required: true, index: true, trim: true },

    status: {
      type: String,
      enum: ["PRESENT"],
      default: "PRESENT",
      required: true,
      index: true,
    },

    markedAt: { type: Date, required: true, index: true },

    deviceId: {
      type: Schema.Types.ObjectId,
      ref: "Device",
      default: undefined,
      index: true,
    },
    cardUid: { type: String, trim: true, default: undefined, index: true },

    arrivalPhotoUrl: { type: String, trim: true, default: undefined },
    arrivalPhotoCloudinaryId: { type: String, trim: true, default: undefined },
    whatsappSentAt: { type: Date, default: undefined },
  },
  { timestamps: true, strict: true }
);

AttendanceSchema.index(
  { schoolId: 1, studentId: 1, date: 1 },
  { unique: true }
);
AttendanceSchema.index({ schoolId: 1, date: 1, markedAt: 1 });

const Existing = mongoose.models.Attendance as Model<AttendanceDoc> | undefined;
export const AttendanceModel =
  Existing ?? model<AttendanceDoc>("Attendance", AttendanceSchema);
export const Attendance = AttendanceModel;
