import mongoose from "mongoose";
import { softDeleteFields } from "../utils/softDelete.js";

const employeeSchema = new mongoose.Schema(
  {
    instituteId: { type: mongoose.Schema.Types.ObjectId, ref: "Institute", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    employeeCode: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, default: "" },
    phone: { type: String, default: "" },
    type: { type: String, enum: ["teacher", "staff", "admin_staff"], required: true },
    designation: { type: String, default: "" },
    department: { type: String, default: "" },
    salary: { type: Number, min: 0, default: null },
    photoUrl: { type: String, default: "" },
    joiningDate: { type: Date, default: null },
    isActive: { type: Boolean, default: true },
    ...softDeleteFields
  },
  { timestamps: true }
);

employeeSchema.index({ instituteId: 1, employeeCode: 1 }, { unique: true });

export const Employee = mongoose.model("Employee", employeeSchema);
