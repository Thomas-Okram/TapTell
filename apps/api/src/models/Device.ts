import mongoose, {
  Schema,
  model,
  Types,
  type Model,
  type InferSchemaType,
} from "mongoose";

const DeviceSchema = new Schema(
  {
    schoolId: {
      type: Schema.Types.ObjectId,
      ref: "School",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    deviceKey: { type: String, required: true, unique: true, index: true },
    location: { type: String, trim: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

DeviceSchema.index({ schoolId: 1, name: 1 });

export type DeviceDoc = InferSchemaType<typeof DeviceSchema> & {
  _id: Types.ObjectId;
};

const Existing = mongoose.models.Device as Model<DeviceDoc> | undefined;
export const DeviceModel = Existing ?? model<DeviceDoc>("Device", DeviceSchema);
