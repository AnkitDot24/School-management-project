import mongoose from "mongoose";

const membershipSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    instituteId: { type: mongoose.Schema.Types.ObjectId, ref: "Institute", required: true },
    /** Institute-scoped public ID (ADM-/TCH-/PAR-/MEM-/…); immutable after assign. */
    memberCode: { type: String, default: "" },
    status: { type: String, enum: ["active", "inactive", "suspended", "revoked"], default: "active" }
  },
  { timestamps: true }
);

membershipSchema.index({ userId: 1, instituteId: 1 }, { unique: true });
membershipSchema.index(
  { instituteId: 1, memberCode: 1 },
  { unique: true, partialFilterExpression: { memberCode: { $type: "string", $ne: "" } } }
);

export const Membership = mongoose.model("Membership", membershipSchema);
