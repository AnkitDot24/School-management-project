import { AuditLog } from "../models/index.js";

export async function writeAudit(req, { action, entity, entityId, before, after, success = true, deleteReason, instituteId }) {
  try {
    const ent = entity || "";
    const eid = entityId ? String(entityId) : "";
    let reason = deleteReason || "";
    if (!reason && action.includes("softDelete") && after?.deleteReason) {
      reason = after.deleteReason;
    }
    if (!reason && action.includes("softDelete") && req.body?.reason) {
      reason = req.body.reason;
    }
    // Only trust req.institute (resolved by instituteContext middleware) or an
    // explicit override. Do NOT fall back to req.auth.instituteId here: for
    // platform-level routes (no instituteContext, e.g. super admin creating a
    // new institute) that would wrongly attribute the log to whichever
    // institute the actor's token happened to be scoped to previously.
    await AuditLog.create({
      actorId: req.user?._id || null,
      actorName: req.user?.name || req.user?.email || "",
      instituteId: instituteId ?? req.institute?._id ?? null,
      membershipId: req.membership?._id || req.auth?.membershipId || null,
      action,
      entity: ent,
      entityId: eid,
      resource: ent,
      resourceId: eid,
      deleteReason: reason,
      before: before || null,
      after: after || null,
      ip: req.ip || req.headers["x-forwarded-for"] || "",
      success
    });
  } catch (err) {
    console.error("audit write failed", err.message);
  }
}
