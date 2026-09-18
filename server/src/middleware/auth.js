import { User, Institute } from "../models/index.js";
import { fail } from "../utils/apiResponse.js";
import { verifyToken } from "../utils/jwt.js";
import { writeAudit } from "../utils/audit.js";
import { getActiveMembership, resolveEffectivePermissions } from "../services/effectivePermissions.js";

export async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return fail(res, 401, "Authentication required");
    const payload = verifyToken(token);
    const user = await User.findById(payload.userId);
    if (!user || !user.isActive) return fail(res, 401, "Invalid or inactive user");
    req.auth = payload;
    req.user = user;
    next();
  } catch {
    return fail(res, 401, "Invalid or expired token");
  }
}

export async function instituteContext(req, res, next) {
  try {
    if (req.user.isSuperAdmin) {
      const instituteId = req.auth.instituteId || req.headers["x-institute-id"];
      if (instituteId) {
        req.institute = await Institute.findById(instituteId);
      }
      req.effectivePermissions = ["*"];
      req.isSuperAdmin = true;
      return next();
    }

    const instituteId = req.auth.instituteId;
    const membershipId = req.auth.membershipId;
    if (!instituteId || !membershipId) {
      return fail(res, 403, "Institute membership context required");
    }

    const institute = await Institute.findById(instituteId);
    if (!institute || !institute.isActive || institute.isDeleted) {
      return fail(res, 403, "Institute is not available");
    }

    const headerInst = req.headers["x-institute-uuid"] || req.headers["x-institute-id"];
    if (headerInst) {
      const match =
        String(institute._id) === String(headerInst) ||
        String(institute.code).toUpperCase() === String(headerInst).toUpperCase();
      if (!match) return fail(res, 403, "X-Institute-UUID does not match selected institute context");
    }

    const membership = await getActiveMembership(req.user._id, instituteId, membershipId);
    if (!membership) return fail(res, 403, "Active membership required for selected institute");

    const resolved = await resolveEffectivePermissions({
      user: req.user,
      instituteId,
      membership
    });

    req.institute = institute;
    req.membership = membership;
    req.effectivePermissions = resolved.keys;
    req.roleCodes = resolved.roles;
    req.isSuperAdmin = false;
    next();
  } catch (err) {
    next(err);
  }
}

export function requirePermission(key) {
  return async (req, res, next) => {
    if (req.isSuperAdmin) return next();
    if (!req.effectivePermissions?.includes(key)) {
      await writeAudit(req, { action: "permission.denied", entity: "PermissionCheck", entityId: key, success: false });
      return fail(res, 403, `Missing permission: ${key}`);
    }
    next();
  };
}

export function requireAnyPermission(keys) {
  return async (req, res, next) => {
    if (req.isSuperAdmin) return next();
    const okAny = keys.some((k) => req.effectivePermissions?.includes(k));
    if (!okAny) {
      await writeAudit(req, { action: "permission.denied", entity: "PermissionCheck", entityId: keys.join(","), success: false });
      return fail(res, 403, `Missing any of: ${keys.join(", ")}`);
    }
    next();
  };
}

export function requireAllPermissions(keys) {
  return async (req, res, next) => {
    if (req.isSuperAdmin) return next();
    const okAll = keys.every((k) => req.effectivePermissions?.includes(k));
    if (!okAll) {
      await writeAudit(req, { action: "permission.denied", entity: "PermissionCheck", entityId: keys.join(","), success: false });
      return fail(res, 403, `Missing all of: ${keys.join(", ")}`);
    }
    next();
  };
}

export const protectedInstitute = [authenticate, instituteContext];
