import mongoose, {
  Schema,
  model,
  Types,
  type Model,
  type InferSchemaType,
} from "mongoose";

const SchoolSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    timezone: { type: String, default: "Asia/Kolkata" },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

export type SchoolDoc = InferSchemaType<typeof SchoolSchema> & {
  _id: Types.ObjectId;
};

const Existing = mongoose.models.School as Model<SchoolDoc> | undefined;
export const SchoolModel = Existing ?? model<SchoolDoc>("School", SchoolSchema);
