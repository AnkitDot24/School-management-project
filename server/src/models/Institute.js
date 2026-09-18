import mongoose from "mongoose";
import { softDeleteFields } from "../utils/softDelete.js";

const instituteSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    address: { type: String, default: "" },
    phone: { type: String, default: "" },
    email: { type: String, default: "" },
    logoUrl: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    ...softDeleteFields
  },
  { timestamps: true }
);

export const Institute = mongoose.model("Institute", instituteSchema);
