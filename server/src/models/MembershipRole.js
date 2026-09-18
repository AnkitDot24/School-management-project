import mongoose from "mongoose";

const membershipRoleSchema = new mongoose.Schema(
  {
    membershipId: { type: mongoose.Schema.Types.ObjectId, ref: "Membership", required: true },
    roleId: { type: mongoose.Schema.Types.ObjectId, ref: "Role", required: true },
    validFrom: { type: Date, required: true, default: Date.now },
    validTill: { type: Date, default: null }
  },
  { timestamps: true }
);

membershipRoleSchema.index({ membershipId: 1, roleId: 1 });

export const MembershipRole = mongoose.model("MembershipRole", membershipRoleSchema);
