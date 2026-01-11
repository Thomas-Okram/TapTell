import mongoose, { Schema, model, Types, type Model } from "mongoose";

export type CardStatus = "UNASSIGNED" | "ASSIGNED" | "LOST" | "DISABLED";

export type CardDoc = {
  _id: Types.ObjectId;
  schoolId: Types.ObjectId;
  uid: string;
  status: CardStatus;
  assignedStudentId?: Types.ObjectId | null;
  notes?: string;
  issuedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

const CardSchema = new Schema<CardDoc>(
  {
    schoolId: {
      type: Schema.Types.ObjectId,
      ref: "School",
      required: true,
      index: true,
    },
    uid: { type: String, required: true, trim: true, index: true },

    status: {
      type: String,
      enum: ["UNASSIGNED", "ASSIGNED", "LOST", "DISABLED"],
      default: "UNASSIGNED",
      index: true,
    },

    assignedStudentId: {
      type: Schema.Types.ObjectId,
      ref: "Student",
      default: null,
      index: true,
    },
    notes: { type: String, trim: true },
    issuedAt: { type: Date },
  },
  { timestamps: true }
);

CardSchema.index({ schoolId: 1, uid: 1 }, { unique: true });

const Existing = mongoose.models.Card as Model<CardDoc> | undefined;
export const CardModel = Existing ?? model<CardDoc>("Card", CardSchema);
export const Card = CardModel;
