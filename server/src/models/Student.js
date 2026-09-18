import mongoose from "mongoose";
import { softDeleteFields } from "../utils/softDelete.js";

const studentSchema = new mongoose.Schema(
  {
    instituteId: { type: mongoose.Schema.Types.ObjectId, ref: "Institute", required: true },
    admissionNo: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, default: "" },
    phone: { type: String, default: "" },
    gender: { type: String, enum: ["male", "female", "other", ""], default: "" },
    dob: { type: Date, default: null },
    guardianName: { type: String, default: "" },
    guardianPhone: { type: String, default: "" },
    address: { type: String, default: "" },
    photoUrl: { type: String, default: "" },
    academicYearId: { type: mongoose.Schema.Types.ObjectId, ref: "AcademicYear", default: null },
    classId: { type: mongoose.Schema.Types.ObjectId, ref: "Class", default: null },
    sectionId: { type: mongoose.Schema.Types.ObjectId, ref: "Section", default: null },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    isActive: { type: Boolean, default: true },
    ...softDeleteFields
  },
  { timestamps: true }
);

studentSchema.index({ instituteId: 1, admissionNo: 1 }, { unique: true });

export const Student = mongoose.model("Student", studentSchema);
