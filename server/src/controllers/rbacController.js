import { body, param } from "express-validator";
import {
  Role,
  RolePermission,
  Permission,
  Membership,
  MembershipRole,
  TemporaryGrant,
  UserPermissionOverride,
  User
} from "../models/index.js";
import { ok, created, fail } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { writeAudit } from "../utils/audit.js";
import { validate } from "../middleware/validate.js";
import {
  ensureMembershipMemberCode,
  peekNextInstituteId,
  roleCodeToMemberPrefix,
  httpFailFromError
} from "../services/instituteIds.js";

const inst = (req) => req.institute._id;

export const listPermissions = asyncHandler(async (req, res) => {
  const items = await Permission.find().sort({ module: 1, key: 1 });
  return ok(res, items);
});

export const listRoles = asyncHandler(async (req, res) => {
  const items = await Role.find({ instituteId: inst(req) });
  const withPerms = await Promise.all(
    items.map(async (role) => {
      const rps = await RolePermission.find({ roleId: role._id }).populate("permissionId");
      return { ...role.toObject(), permissions: rps.map((r) => r.permissionId) };
    })
  );
  return ok(res, withPerms);
});

export const setRolePermissionsValidators = [
  param("id").isMongoId(),
  body("permissionKeys").isArray(),
  validate
];

export const setRolePermissions = asyncHandler(async (req, res) => {
  const role = await Role.findOne({ _id: req.params.id, instituteId: inst(req) });
  if (!role) return fail(res, 404, "Role not found");
  const perms = await Permission.find({ key: { $in: req.body.permissionKeys } });
  await RolePermission.deleteMany({ roleId: role._id });
  await RolePermission.insertMany(perms.map((p) => ({ roleId: role._id, permissionId: p._id })));
  await writeAudit(req, { action: "rbac.setRolePermissions", entity: "Role", entityId: role._id, after: req.body.permissionKeys });
  return ok(res, { roleId: role._id, permissionKeys: perms.map((p) => p.key) });
});

export const listMemberships = asyncHandler(async (req, res) => {
  const q = req.query.q;
  const memberships = await Membership.find({ instituteId: inst(req) }).populate("userId");
  const result = [];
  for (const m of memberships) {
    if (
      q &&
      m.userId &&
      !`${m.userId.name} ${m.userId.email} ${m.memberCode || ""}`.toLowerCase().includes(q.toLowerCase())
    ) {
      continue;
    }
    const mrs = await MembershipRole.find({ membershipId: m._id }).populate("roleId");
    result.push({ ...m.toObject(), roles: mrs });
  }
  return ok(res, result);
});

export const peekNextMembershipCode = asyncHandler(async (req, res) => {
  const roleCode = req.query.roleCode || "";
  const prefix = roleCodeToMemberPrefix(roleCode || null);
  const memberCode = await peekNextInstituteId(Membership, inst(req), "memberCode", prefix);
  return ok(res, { memberCode, prefix });
});

export const createMembershipValidators = [
  body("email").isEmail().normalizeEmail(),
  body("roleCodes").isArray({ min: 1 }),
  validate
];

export const createMembership = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) return fail(res, 404, "User not found. They must register first.");
  let membership = await Membership.findOne({ userId: user._id, instituteId: inst(req) });
  if (!membership) {
    membership = await Membership.create({
      userId: user._id,
      instituteId: inst(req),
      status: req.body.status || "active"
    });
  } else {
    membership.status = req.body.status || membership.status;
    await membership.save();
  }
  const roles = await Role.find({ instituteId: inst(req), code: { $in: req.body.roleCodes } });
  if (!roles.length) return fail(res, 422, "No valid roles for this institute");
  try {
    await ensureMembershipMemberCode(membership, req.body.roleCodes, Membership);
  } catch (err) {
    return httpFailFromError(res, err);
  }
  const validFrom = req.body.validFrom ? new Date(req.body.validFrom) : new Date();
  const validTill = req.body.validTill ? new Date(req.body.validTill) : null;
  for (const role of roles) {
    await MembershipRole.updateOne(
      { membershipId: membership._id, roleId: role._id },
      { $set: { validFrom, validTill } },
      { upsert: true }
    );
  }
  await writeAudit(req, { action: "membership.create", entity: "Membership", entityId: membership._id, after: req.body });
  return created(res, membership);
});

export const addMembershipRoleValidators = [
  param("id").isMongoId(),
  body("roleId").isMongoId(),
  body("validFrom").optional().isISO8601(),
  validate
];

export const addMembershipRole = asyncHandler(async (req, res) => {
  const membership = await Membership.findOne({ _id: req.params.id, instituteId: inst(req) });
  if (!membership) return fail(res, 404, "Membership not found");
  const role = await Role.findOne({ _id: req.body.roleId, instituteId: inst(req) });
  if (!role) return fail(res, 404, "Role not found");
  const doc = await MembershipRole.findOneAndUpdate(
    { membershipId: membership._id, roleId: role._id },
    {
      validFrom: req.body.validFrom ? new Date(req.body.validFrom) : new Date(),
      validTill: req.body.validTill ? new Date(req.body.validTill) : null
    },
    { upsert: true, new: true }
  );
  await writeAudit(req, { action: "membership.role.assign", entity: "MembershipRole", entityId: doc._id });
  return ok(res, doc);
});

export const grantValidators = [
  body("userId").isMongoId(),
  body("permissionKey").notEmpty(),
  body("validFrom").notEmpty(),
  body("validTill").notEmpty(),
  body("reason").trim().isLength({ min: 3 }),
  validate
];

export const createGrant = asyncHandler(async (req, res) => {
  const perm = await Permission.findOne({ key: req.body.permissionKey });
  if (!perm) return fail(res, 404, "Permission not found");
  if (new Date(req.body.validTill) <= new Date(req.body.validFrom)) {
    return fail(res, 422, "validTill must be after validFrom");
  }
  const grant = await TemporaryGrant.create({
    userId: req.body.userId,
    instituteId: inst(req),
    permissionId: perm._id,
    validFrom: req.body.validFrom,
    validTill: req.body.validTill,
    reason: req.body.reason,
    grantedBy: req.user._id
  });
  await writeAudit(req, { action: "rbac.temporaryGrant", entity: "TemporaryGrant", entityId: grant._id, after: grant });
  return created(res, grant);
});

export const listGrants = asyncHandler(async (req, res) => {
  const items = await TemporaryGrant.find({ instituteId: inst(req) }).populate("permissionId userId grantedBy");
  return ok(res, items);
});

export const overrideValidators = [
  body("userId").isMongoId(),
  body("permissionKey").notEmpty(),
  body("effect").isIn(["allow", "deny"]),
  body("reason").trim().isLength({ min: 3 }),
  validate
];

export const createOverride = asyncHandler(async (req, res) => {
  const perm = await Permission.findOne({ key: req.body.permissionKey });
  if (!perm) return fail(res, 404, "Permission not found");
  const doc = await UserPermissionOverride.create({
    userId: req.body.userId,
    instituteId: inst(req),
    permissionId: perm._id,
    effect: req.body.effect,
    validFrom: req.body.validFrom || null,
    validTill: req.body.validTill || null,
    reason: req.body.reason,
    grantedBy: req.user._id
  });
  await writeAudit(req, { action: "rbac.override", entity: "UserPermissionOverride", entityId: doc._id, after: doc });
  return created(res, doc);
});

export const listOverrides = asyncHandler(async (req, res) => {
  const items = await UserPermissionOverride.find({ instituteId: inst(req) }).populate("permissionId userId");
  return ok(res, items);
});

export const deleteGrant = asyncHandler(async (req, res) => {
  const doc = await TemporaryGrant.findOneAndDelete({ _id: req.params.id, instituteId: inst(req) });
  if (!doc) return fail(res, 404, "Grant not found");
  await writeAudit(req, { action: "rbac.grant.delete", entity: "TemporaryGrant", entityId: doc._id });
  return ok(res, null, "Grant deleted");
});

export const deleteOverride = asyncHandler(async (req, res) => {
  const doc = await UserPermissionOverride.findOneAndDelete({ _id: req.params.id, instituteId: inst(req) });
  if (!doc) return fail(res, 404, "Override not found");
  await writeAudit(req, { action: "rbac.override.delete", entity: "UserPermissionOverride", entityId: doc._id });
  return ok(res, null, "Override deleted");
});

export const removeMembershipRole = asyncHandler(async (req, res) => {
  const membership = await Membership.findOne({ _id: req.params.id, instituteId: inst(req) });
  if (!membership) return fail(res, 404, "Membership not found");
  const doc = await MembershipRole.findOneAndDelete({ membershipId: membership._id, roleId: req.params.roleId });
  if (!doc) return fail(res, 404, "Role assignment not found");
  await writeAudit(req, { action: "membership.role.remove", entity: "MembershipRole", entityId: doc._id });
  return ok(res, null, "Role removed from membership");
});
