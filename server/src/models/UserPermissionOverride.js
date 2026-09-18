import mongoose from "mongoose";

const overrideSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    instituteId: { type: mongoose.Schema.Types.ObjectId, ref: "Institute", required: true },
    permissionId: { type: mongoose.Schema.Types.ObjectId, ref: "Permission", required: true },
    effect: { type: String, enum: ["allow", "deny"], required: true },
    validFrom: { type: Date, default: null },
    validTill: { type: Date, default: null },
    reason: { type: String, required: true },
    grantedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }
  },
  { timestamps: true }
);

export const UserPermissionOverride = mongoose.model("UserPermissionOverride", overrideSchema);
