import mongoose from "mongoose";

const parentLinkSchema = new mongoose.Schema(
  {
    instituteId: { type: mongoose.Schema.Types.ObjectId, ref: "Institute", required: true },
    parentUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    relation: { type: String, default: "" },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

parentLinkSchema.index({ parentUserId: 1, studentId: 1 }, { unique: true });

export const ParentStudentLink = mongoose.model("ParentStudentLink", parentLinkSchema);
