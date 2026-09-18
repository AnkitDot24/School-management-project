import {
  Membership,
  MembershipRole,
  Permission,
  Role,
  RolePermission,
  TemporaryGrant,
  UserPermissionOverride
} from "../models/index.js";

function inWindow(from, till, now) {
  if (from && now < new Date(from)) return false;
  if (till && now > new Date(till)) return false;
  return true;
}

export async function resolveEffectivePermissions({ user, instituteId, membership }) {
  if (user?.isSuperAdmin) {
    const all = await Permission.find().lean();
    return { keys: all.map((p) => p.key), isSuperAdmin: true, roles: ["SUPER_ADMIN"] };
  }

  const now = new Date();
  const membershipRoles = await MembershipRole.find({ membershipId: membership._id }).lean();
  const activeRoleIds = membershipRoles
    .filter((mr) => inWindow(mr.validFrom, mr.validTill, now))
    .map((mr) => mr.roleId);

  const roles = await Role.find({ _id: { $in: activeRoleIds } }).lean();
  const rolePerms = await RolePermission.find({ roleId: { $in: activeRoleIds } }).populate("permissionId").lean();

  const keySet = new Set();
  for (const rp of rolePerms) {
    if (rp.permissionId?.key) keySet.add(rp.permissionId.key);
  }

  const grants = await TemporaryGrant.find({
    userId: user._id,
    instituteId,
    validFrom: { $lte: now },
    validTill: { $gte: now }
  }).populate("permissionId");

  for (const g of grants) {
    if (g.permissionId?.key) keySet.add(g.permissionId.key);
  }

  const overrides = await UserPermissionOverride.find({
    userId: user._id,
    instituteId
  }).populate("permissionId");

  for (const o of overrides) {
    if (!inWindow(o.validFrom, o.validTill, now)) continue;
    if (o.effect === "allow" && o.permissionId?.key) keySet.add(o.permissionId.key);
  }
  for (const o of overrides) {
    if (!inWindow(o.validFrom, o.validTill, now)) continue;
    if (o.effect === "deny" && o.permissionId?.key) keySet.delete(o.permissionId.key);
  }

  return {
    keys: [...keySet],
    isSuperAdmin: false,
    roles: roles.map((r) => r.code),
    membership
  };
}

export async function getActiveMembership(userId, instituteId, membershipId) {
  const membership = await Membership.findOne({
    _id: membershipId,
    userId,
    instituteId,
    status: "active"
  });
  return membership;
}
