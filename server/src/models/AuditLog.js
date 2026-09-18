import mongoose from "mongoose";

const auditSchema = new mongoose.Schema(
  {
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    actorName: { type: String, default: "" },
    instituteId: { type: mongoose.Schema.Types.ObjectId, ref: "Institute", default: null },
    membershipId: { type: mongoose.Schema.Types.ObjectId, ref: "Membership", default: null },
    action: { type: String, required: true },
    permissionChecked: { type: String, default: "" },
    entity: { type: String, default: "" },
    entityId: { type: String, default: "" },
    resource: { type: String, default: "" },
    resourceId: { type: String, default: "" },
    deleteReason: { type: String, default: "" },
    before: { type: mongoose.Schema.Types.Mixed, default: null },
    after: { type: mongoose.Schema.Types.Mixed, default: null },
    ip: { type: String, default: "" },
    success: { type: Boolean, default: true }
  },
  { timestamps: true }
);

auditSchema.index({ instituteId: 1, createdAt: -1 });
auditSchema.index({ action: 1, createdAt: -1 });

export const AuditLog = mongoose.model("AuditLog", auditSchema);
