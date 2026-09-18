import { fail } from "../utils/apiResponse.js";
import { resolveLinkedStudent } from "./enrollmentValidation.js";
import { Membership, MembershipRole } from "../models/index.js";
import { hasPermission } from "../utils/permissions.js";

export function hasPortalSelf(req) {
  return hasPermission(req, "portal.self");
}

export const SUPER_ADMIN_PORTAL_PREVIEW_MESSAGE =
  "Super Admin preview — no student profile is linked to your account. Use Students or Attendance for institute data, or sign in as a student user for the full portal.";

export async function requireStudentPortal(req, res) {
  if (req.isSuperAdmin) {
    const student = await resolveLinkedStudent(req.user, req.institute._id);
    return { student, bypass: true, preview: !student };
  }
  if (!hasPortalSelf(req)) {
    fail(res, 403, "Student portal permission required");
    return null;
  }
  const student = await resolveLinkedStudent(req.user, req.institute._id);
  if (!student) {
    fail(res, 403, "No linked student profile for this user");
    return null;
  }
  return { student, bypass: false, preview: false };
}

export async function validateStudentUserLink(instituteId, userId) {
  if (!userId) return null;
  const membership = await Membership.findOne({ userId, instituteId, status: "active" });
  if (!membership) {
    return "User must have an active membership in this institute";
  }
  const roleLinks = await MembershipRole.find({ membershipId: membership._id }).populate("roleId");
  const codes = roleLinks.map((r) => r.roleId?.code).filter(Boolean);
  if (!codes.includes("STUDENT")) {
    return "User membership must include the STUDENT role for portal access";
  }
  return null;
}
