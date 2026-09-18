import { fail } from "../utils/apiResponse.js";
import { ROLE_DEFAULTS } from "../rbac/catalog.js";

export const EMP_PREFIX = "EMP";
export const STU_PREFIX = "STU";
export const MEM_PREFIX = "MEM";

/** Institute-scoped public ID prefix per RBAC role code (membership memberCode). */
export const ROLE_CODE_TO_ID_PREFIX = {
  INSTITUTE_ADMIN: "ADM",
  PRINCIPAL: "PRN",
  TEACHER: "TCH",
  ACCOUNTANT: "ACC",
  CFO: "CFO",
  HR_MANAGER: "HRM",
  LIBRARIAN: "LIB",
  HOSTEL_WARDEN: "HST",
  TRANSPORT_ADMIN: "TRN",
  EMPLOYEE: "EMP",
  STUDENT: "STU",
  PARENT: "PAR"
};

/** Fail fast at boot if any catalog role lacks a membership ID prefix. */
export function assertRolePrefixCoverage() {
  const missing = Object.keys(ROLE_DEFAULTS).filter((code) => !ROLE_CODE_TO_ID_PREFIX[code]);
  if (missing.length) {
    throw new Error(`ROLE_CODE_TO_ID_PREFIX missing: ${missing.join(", ")}`);
  }
}

assertRolePrefixCoverage();

const ID_PATTERN = /^([A-Z]{3})-(\d+)$/i;

export function roleCodeToMemberPrefix(roleCode) {
  if (!roleCode) return MEM_PREFIX;
  return ROLE_CODE_TO_ID_PREFIX[String(roleCode).toUpperCase()] || MEM_PREFIX;
}

export function normalizePublicId(raw, expectedPrefix) {
  if (!raw || !String(raw).trim()) return null;
  const s = String(raw).trim().toUpperCase();
  const m = s.match(ID_PATTERN);
  if (!m) return null;
  const prefix = m[1];
  if (expectedPrefix && prefix !== expectedPrefix.toUpperCase()) return null;
  const num = m[2];
  return `${prefix}-${num.padStart(6, "0")}`;
}

function maxSeqFromRows(rows, field, prefix = null) {
  let max = 0;
  const want = prefix ? prefix.toUpperCase() : null;
  for (const row of rows) {
    const val = row[field];
    if (!val) continue;
    const m = String(val).toUpperCase().match(ID_PATTERN);
    if (m) {
      if (want && m[1] !== want) continue;
      max = Math.max(max, parseInt(m[2], 10));
    } else if (!want && /^\d+$/.test(String(val))) {
      max = Math.max(max, parseInt(String(val), 10));
    }
  }
  return max;
}

export async function peekNextInstituteId(Model, instituteId, field, prefix) {
  const rows = await Model.find({ instituteId }).select(field).lean();
  const next = maxSeqFromRows(rows, field, prefix) + 1;
  return `${prefix}-${String(next).padStart(6, "0")}`;
}

export async function allocateInstituteId(Model, instituteId, field, prefix, provided) {
  const normalized = normalizePublicId(provided, prefix);
  if (provided && String(provided).trim() && !normalized) {
    const err = new Error(`Invalid ID format. Use ${prefix}-###### (e.g. ${prefix}-000001)`);
    err.status = 422;
    throw err;
  }
  if (normalized) {
    const taken = await Model.findOne({ instituteId, [field]: normalized });
    if (taken) {
      const err = new Error(`${normalized} is already in use`);
      err.status = 409;
      throw err;
    }
    return normalized;
  }
  const rows = await Model.find({ instituteId }).select(field).lean();
  let seq = maxSeqFromRows(rows, field, prefix) + 1;
  for (let attempt = 0; attempt < 25; attempt++) {
    const candidate = `${prefix}-${String(seq).padStart(6, "0")}`;
    const taken = await Model.findOne({ instituteId, [field]: candidate });
    if (!taken) return candidate;
    seq++;
  }
  const err = new Error("Could not allocate unique ID");
  err.status = 500;
  throw err;
}

export function pickPrimaryRoleCode(roleCodes) {
  if (!roleCodes?.length) return null;
  return roleCodes[0];
}

/** Prefer linked student/employee record IDs over membership memberCode. */
export function pickDisplayInstituteId({ studentAdmissionNo, employeeCode, memberCode }) {
  if (studentAdmissionNo) {
    return { value: normalizePublicId(studentAdmissionNo, STU_PREFIX) || studentAdmissionNo, kind: "student", source: "student" };
  }
  if (employeeCode) {
    return { value: normalizePublicId(employeeCode, EMP_PREFIX) || employeeCode, kind: "employee", source: "employee" };
  }
  if (memberCode) {
    return { value: normalizePublicId(memberCode, null) || memberCode, kind: "membership", source: "membership" };
  }
  return { value: "", kind: "default", source: null };
}

export async function loadLinkedInstituteIds(Student, Employee, userId, instituteId) {
  const iid = instituteId?._id || instituteId;
  const [student, employee] = await Promise.all([
    Student.findOne({ userId, instituteId: iid, isDeleted: { $ne: true } }).select("admissionNo").lean(),
    Employee.findOne({ userId, instituteId: iid, isDeleted: { $ne: true } }).select("employeeCode").lean()
  ]);
  return {
    studentAdmissionNo: student?.admissionNo || "",
    employeeCode: employee?.employeeCode || ""
  };
}

export async function allocateMemberCode(Membership, instituteId, roleCodes) {
  const prefix = roleCodeToMemberPrefix(pickPrimaryRoleCode(roleCodes));
  return allocateInstituteId(Membership, instituteId, "memberCode", prefix);
}

export async function ensureMembershipMemberCode(membership, roleCodes, Membership) {
  if (membership.memberCode) return membership.memberCode;
  const code = await allocateMemberCode(Membership, membership.instituteId, roleCodes);
  membership.memberCode = code;
  await membership.save();
  return code;
}

export function assertImmutableId(current, incoming, label) {
  if (incoming === undefined || incoming === null || incoming === "") return;
  const a = normalizePublicId(current, null) || String(current).toUpperCase();
  const b = normalizePublicId(incoming, null) || String(incoming).toUpperCase();
  if (a !== b) {
    const err = new Error(`${label} cannot be changed after creation`);
    err.status = 422;
    throw err;
  }
}

export function httpFailFromError(res, err) {
  if (err.status) return fail(res, err.status, err.message);
  throw err;
}
