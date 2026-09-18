import bcrypt from "bcryptjs";
import { body } from "express-validator";
import { User, Membership, Institute, Student, Employee } from "../models/index.js";
import { loadLinkedInstituteIds, pickDisplayInstituteId } from "../services/instituteIds.js";
import { ok, created, fail } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { signToken } from "../utils/jwt.js";
import { writeAudit } from "../utils/audit.js";
import { resolveEffectivePermissions } from "../services/effectivePermissions.js";
import { validate } from "../middleware/validate.js";

export const registerValidators = [
  body("name").trim().notEmpty(),
  body("email").isEmail().normalizeEmail(),
  body("password").isLength({ min: 8 }),
  body("gender").optional({ values: "falsy" }).isIn(["Male", "Female", "Other"]),
  body("dateOfBirth").optional({ values: "falsy" }).isISO8601(),
  validate
];

export const loginValidators = [
  body("email").isEmail().normalizeEmail(),
  body("password").notEmpty(),
  validate
];

export const register = asyncHandler(async (req, res) => {
  const { name, email, password, phone, gender, dateOfBirth } = req.body;
  const exists = await User.findOne({ email });
  if (exists) return fail(res, 409, "Email already registered");
  const user = await User.create({
    name,
    email,
    phone: phone || "",
    gender: gender || "",
    dateOfBirth: dateOfBirth || null,
    avatarUrl: req.file ? `/uploads/${req.file.filename}` : "",
    passwordHash: await bcrypt.hash(password, 12)
  });
  await writeAudit(req, { action: "auth.register", entity: "User", entityId: user._id, after: { email } });
  return created(res, publicUser(user), "Registered");
});

function tokenFor(user, extra = {}) {
  return signToken({
    userId: user._id.toString(),
    isSuperAdmin: !!user.isSuperAdmin,
    ...extra
  });
}

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user || !user.isActive) return fail(res, 401, "Invalid credentials");
  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) return fail(res, 401, "Invalid credentials");

  user.lastLoginAt = new Date();
  await user.save();

  const memberships = await Membership.find({ userId: user._id, status: "active" }).populate("instituteId");
  const token = tokenFor(user);
  await writeAudit(req, { action: "auth.login", entity: "User", entityId: user._id });
  return ok(res, {
    token,
    user: publicUser(user),
    memberships: memberships.map(mapMembership),
    needsInstitute: !user.isSuperAdmin
  });
});

export const selectInstituteValidators = [
  body("instituteId").notEmpty(),
  body("membershipId").optional(),
  validate
];

export const selectInstitute = asyncHandler(async (req, res) => {
  const { instituteId, membershipId } = req.body;
  const user = req.user;
  const institute = await Institute.findById(instituteId);
  if (!institute || institute.isDeleted || !institute.isActive) return fail(res, 404, "Institute not found");

  if (user.isSuperAdmin) {
    const token = tokenFor(user, { instituteId: institute._id.toString() });
    await writeAudit(req, {
      action: "auth.selectInstitute",
      entity: "Institute",
      entityId: institute._id,
      instituteId: institute._id
    });
    return ok(res, { token, institute, effectivePermissions: ["*"], roles: ["SUPER_ADMIN"] });
  }

  const membership = await Membership.findOne({
    _id: membershipId,
    userId: user._id,
    instituteId: institute._id,
    status: "active"
  });
  if (!membership) return fail(res, 403, "Active membership required");

  const resolved = await resolveEffectivePermissions({ user, instituteId: institute._id, membership });
  const token = tokenFor(user, {
    instituteId: institute._id.toString(),
    membershipId: membership._id.toString()
  });
  await writeAudit(req, {
    action: "auth.selectInstitute",
    entity: "Institute",
    entityId: institute._id,
    instituteId: institute._id
  });
  const membershipPayload = await serializeMembership(membership, user._id);
  return ok(res, {
    token,
    institute,
    membership: membershipPayload,
    roles: resolved.roles,
    effectivePermissions: resolved.keys,
    displayInstituteId: membershipPayload.displayInstituteId,
    displayInstituteIdKind: membershipPayload.displayInstituteIdKind
  });
});

export const me = asyncHandler(async (req, res) => {
  let effectivePermissions = [];
  let roles = [];
  if (req.user.isSuperAdmin) {
    effectivePermissions = ["*"];
    roles = ["SUPER_ADMIN"];
  } else if (req.membership) {
    const resolved = await resolveEffectivePermissions({
      user: req.user,
      instituteId: req.institute._id,
      membership: req.membership
    });
    effectivePermissions = resolved.keys;
    roles = resolved.roles;
  }
  const memberships = await Membership.find({ userId: req.user._id, status: "active" }).populate("instituteId");
  const membershipPayload = req.membership ? await serializeMembership(req.membership, req.user._id) : null;
  return ok(res, {
    user: publicUser(req.user),
    institute: req.institute || null,
    membership: membershipPayload,
    roles,
    effectivePermissions,
    displayInstituteId: membershipPayload?.displayInstituteId || "",
    displayInstituteIdKind: membershipPayload?.displayInstituteIdKind || "default",
    memberships: await Promise.all(memberships.map((m) => serializeMembership(m, req.user._id)))
  });
});

export const myMemberships = asyncHandler(async (req, res) => {
  const memberships = await Membership.find({ userId: req.user._id, status: "active" }).populate("instituteId");
  return ok(res, memberships.map(mapMembership));
});

export const logout = asyncHandler(async (req, res) => {
  await writeAudit(req, { action: "auth.logout", entity: "User", entityId: req.user._id });
  return ok(res, null, "Logged out");
});

export const updateProfileValidators = [
  body("name").optional().trim().notEmpty(),
  body("phone").optional({ values: "falsy" }).trim(),
  body("gender").optional({ values: "falsy" }).isIn(["Male", "Female", "Other"]),
  body("dateOfBirth").optional({ values: "falsy" }).isISO8601(),
  validate
];

// Self-service profile update. A user can only edit their own account details;
// institute role/permissions stay governed entirely by Membership + Role (RBAC).
export const updateProfile = asyncHandler(async (req, res) => {
  const user = req.user;
  const before = { name: user.name, phone: user.phone, gender: user.gender, dateOfBirth: user.dateOfBirth, avatarUrl: user.avatarUrl };
  if (req.body.name !== undefined) user.name = req.body.name;
  if (req.body.phone !== undefined) user.phone = req.body.phone;
  if (req.body.gender !== undefined) user.gender = req.body.gender;
  if (req.body.dateOfBirth !== undefined) user.dateOfBirth = req.body.dateOfBirth || null;
  if (req.file) user.avatarUrl = `/uploads/${req.file.filename}`;
  await user.save();
  await writeAudit(req, { action: "auth.updateProfile", entity: "User", entityId: user._id, before, after: publicUser(user) });
  return ok(res, publicUser(user), "Profile updated");
});

function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
    gender: user.gender,
    dateOfBirth: user.dateOfBirth,
    isSuperAdmin: user.isSuperAdmin,
    studentId: user.studentId,
    lastLoginAt: user.lastLoginAt
  };
}

async function serializeMembership(m, userId) {
  const institute = m.instituteId?.name ? m.instituteId : null;
  const instituteId = institute?._id || m.instituteId;
  const linked = await loadLinkedInstituteIds(Student, Employee, userId, instituteId);
  const display = pickDisplayInstituteId({
    studentAdmissionNo: linked.studentAdmissionNo,
    employeeCode: linked.employeeCode,
    memberCode: m.memberCode || ""
  });
  return {
    id: m._id,
    status: m.status,
    memberCode: m.memberCode || "",
    studentAdmissionNo: linked.studentAdmissionNo,
    employeeCode: linked.employeeCode,
    displayInstituteId: display.value,
    displayInstituteIdKind: display.kind,
    institute: institute || m.instituteId
  };
}

function mapMembership(m) {
  return {
    id: m._id,
    status: m.status,
    memberCode: m.memberCode || "",
    institute: m.instituteId
  };
}
