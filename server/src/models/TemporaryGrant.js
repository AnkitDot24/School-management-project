import mongoose from "mongoose";

const temporaryGrantSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    instituteId: { type: mongoose.Schema.Types.ObjectId, ref: "Institute", required: true },
    permissionId: { type: mongoose.Schema.Types.ObjectId, ref: "Permission", required: true },
    validFrom: { type: Date, required: true },
    validTill: { type: Date, required: true },
    reason: { type: String, required: true },
    grantedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

export const TemporaryGrant = mongoose.model("TemporaryGrant", temporaryGrantSchema);
