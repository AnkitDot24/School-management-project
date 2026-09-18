import mongoose from "mongoose";

const roleSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, uppercase: true, trim: true },
    name: { type: String, required: true },
    instituteId: { type: mongoose.Schema.Types.ObjectId, ref: "Institute", default: null },
    isSystem: { type: Boolean, default: true },
    description: { type: String, default: "" }
  },
  { timestamps: true }
);

roleSchema.index({ code: 1, instituteId: 1 }, { unique: true });

export const Role = mongoose.model("Role", roleSchema);
