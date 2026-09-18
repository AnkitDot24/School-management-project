import { body, param } from "express-validator";
import { Employee, Leave, StaffAttendance } from "../models/index.js";
import { ok, created, fail } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { writeAudit } from "../utils/audit.js";
import { validate } from "../middleware/validate.js";
import { notDeleted } from "../utils/softDelete.js";
import {
  validateEmployeeUserLink,
  eligibleTeacherQuery
} from "../services/enrollmentValidation.js";
import {
  allocateInstituteId,
  peekNextInstituteId,
  assertImmutableId,
  httpFailFromError,
  EMP_PREFIX
} from "../services/instituteIds.js";

const iid = (req) => req.institute._id;

export const employeeValidators = [
  body("employeeCode").optional({ values: "falsy" }).trim(),
  body("name").trim().notEmpty(),
  body("type").isIn(["teacher", "staff", "admin_staff"]),
  validate
];

export const peekEmployeeCode = asyncHandler(async (req, res) => {
  const code = await peekNextInstituteId(Employee, iid(req), "employeeCode", EMP_PREFIX);
  return ok(res, { employeeCode: code });
});


export const listEmployees = asyncHandler(async (req, res) => {
  const filter = notDeleted({ instituteId: iid(req) });
  if (req.query.q) {
    filter.$or = [
      { name: { $regex: req.query.q, $options: "i" } },
      { employeeCode: { $regex: req.query.q, $options: "i" } }
    ];
  }
  if (req.query.type) filter.type = req.query.type;
  if (req.query.department) filter.department = { $regex: req.query.department, $options: "i" };
  if (req.query.isActive === "true") filter.isActive = true;
  if (req.query.isActive === "false") filter.isActive = false;
  const items = await Employee.find(filter).populate("userId", "name email").sort({ name: 1 });
  return ok(res, items);
});

export const listEligibleTeachers = asyncHandler(async (req, res) => {
  const items = await Employee.find(eligibleTeacherQuery(iid(req))).sort({ name: 1 });
  return ok(res, items);
});

export const listDeletedEmployees = asyncHandler(async (req, res) => {
  const items = await Employee.find({ instituteId: iid(req), isDeleted: true }).populate("userId", "name email");
  return ok(res, items);
});

export const getEmployee = asyncHandler(async (req, res) => {
  const emp = await Employee.findOne(notDeleted({ _id: req.params.id, instituteId: iid(req) })).populate(
    "userId",
    "name email phone"
  );
  if (!emp) return fail(res, 404, "Employee not found");
  return ok(res, emp);
});

export const createEmployee = asyncHandler(async (req, res) => {
  if (req.body.userId) await validateEmployeeUserLink(iid(req), req.body.userId);
  let employeeCode;
  try {
    employeeCode = await allocateInstituteId(Employee, iid(req), "employeeCode", EMP_PREFIX, req.body.employeeCode);
  } catch (e) {
    return httpFailFromError(res, e);
  }
  const salary = req.body.salary !== undefined && req.body.salary !== "" ? Number(req.body.salary) : null;
  const emp = await Employee.create({
    instituteId: iid(req),
    employeeCode,
    name: req.body.name,
    email: req.body.email || "",
    phone: req.body.phone || "",
    type: req.body.type,
    designation: req.body.designation || "",
    department: req.body.department || "",
    salary,
    userId: req.body.userId || null,
    joiningDate: req.body.joiningDate || null,
    photoUrl: req.file ? `/uploads/${req.file.filename}` : ""
  });
  await writeAudit(req, { action: "employee.create", entity: "Employee", entityId: emp._id, after: emp });
  return created(res, emp);
});

export const updateEmployee = asyncHandler(async (req, res) => {
  const emp = await Employee.findOne(notDeleted({ _id: req.params.id, instituteId: iid(req) }));
  if (!emp) return fail(res, 404, "Employee not found");
  const before = emp.toObject();
  if (req.body.userId !== undefined && req.body.userId) {
    await validateEmployeeUserLink(iid(req), req.body.userId, emp._id);
  }
  try {
    assertImmutableId(emp.employeeCode, req.body.employeeCode, "Employee ID");
  } catch (e) {
    return httpFailFromError(res, e);
  }
  if (req.body.salary !== undefined) {
    emp.salary = req.body.salary === "" || req.body.salary === null ? null : Number(req.body.salary);
  }
  Object.assign(emp, {
    name: req.body.name ?? emp.name,
    email: req.body.email ?? emp.email,
    phone: req.body.phone ?? emp.phone,
    type: req.body.type ?? emp.type,
    designation: req.body.designation ?? emp.designation,
    department: req.body.department ?? emp.department,
    isActive: req.body.isActive ?? emp.isActive,
    userId: req.body.userId !== undefined ? req.body.userId || null : emp.userId,
    joiningDate: req.body.joiningDate ?? emp.joiningDate
  });
  if (req.file) emp.photoUrl = `/uploads/${req.file.filename}`;
  await emp.save();
  await writeAudit(req, { action: "employee.update", entity: "Employee", entityId: emp._id, before, after: emp });
  return ok(res, emp);
});


export const restoreEmployee = asyncHandler(async (req, res) => {
  const emp = await Employee.findOne({ _id: req.params.id, instituteId: iid(req), isDeleted: true });
  if (!emp) return fail(res, 404, "Deleted employee not found");
  emp.isDeleted = false;
  emp.deletedAt = null;
  emp.deletedBy = null;
  emp.deleteReason = null;
  await emp.save();
  await writeAudit(req, { action: "employee.restore", entity: "Employee", entityId: emp._id, after: emp });
  return ok(res, emp, "Employee restored");
});

export const leaveValidators = [
  body("employeeId").isMongoId(),
  body("fromDate").isISO8601(),
  body("toDate").isISO8601(),
  body("reason").trim().notEmpty(),
  validate
];

export const listLeaves = asyncHandler(async (req, res) => {
  const items = await Leave.find({ instituteId: iid(req) }).populate("employeeId").sort({ createdAt: -1 });
  return ok(res, items);
});

export const createLeave = asyncHandler(async (req, res) => {
  const emp = await Employee.findOne(notDeleted({ _id: req.body.employeeId, instituteId: iid(req) }));
  if (!emp) return fail(res, 422, "Employee not found in institute");
  if (new Date(req.body.toDate) < new Date(req.body.fromDate)) return fail(res, 422, "toDate must be on/after fromDate");
  const doc = await Leave.create({ ...req.body, instituteId: iid(req) });
  await writeAudit(req, { action: "hr.leave.create", entity: "Leave", entityId: doc._id, after: doc });
  return created(res, doc);
});

export const updateLeave = asyncHandler(async (req, res) => {
  const doc = await Leave.findOne({ _id: req.params.id, instituteId: iid(req) });
  if (!doc) return fail(res, 404, "Leave not found");
  if (req.body.status) doc.status = req.body.status;
  if (req.body.status && req.body.status !== "pending") {
    doc.decidedBy = req.user._id;
    doc.decidedAt = new Date();
  }
  await doc.save();
  await writeAudit(req, { action: "hr.leave.update", entity: "Leave", entityId: doc._id, after: doc });
  return ok(res, doc);
});

export const staffAttValidators = [
  body("employeeId").isMongoId(),
  body("date").notEmpty(),
  body("status").isIn(["present", "absent", "leave"]),
  validate
];

export const listStaffAttendance = asyncHandler(async (req, res) => {
  const filter = { instituteId: iid(req) };
  if (req.query.date) filter.date = req.query.date;
  const items = await StaffAttendance.find(filter).populate("employeeId");
  return ok(res, items);
});

export const upsertStaffAttendance = asyncHandler(async (req, res) => {
  const emp = await Employee.findOne(notDeleted({ _id: req.body.employeeId, instituteId: iid(req) }));
  if (!emp) return fail(res, 422, "Employee not found");
  const doc = await StaffAttendance.findOneAndUpdate(
    { employeeId: emp._id, date: req.body.date },
    { instituteId: iid(req), status: req.body.status },
    { upsert: true, new: true }
  );
  await writeAudit(req, { action: "hr.staffAttendance", entity: "StaffAttendance", entityId: doc._id, after: doc });
  return ok(res, doc);
});

export const softDeleteEmployeeValidators = [
  param("id").isMongoId(),
  body("reason").trim().isLength({ min: 5 }),
  validate
];

export const softDeleteEmployee = asyncHandler(async (req, res) => {
  const emp = await Employee.findOne(notDeleted({ _id: req.params.id, instituteId: iid(req) }));
  if (!emp) return fail(res, 404, "Employee not found");
  const before = emp.toObject();
  emp.isDeleted = true;
  emp.deletedAt = new Date();
  emp.deletedBy = req.user._id;
  emp.deleteReason = req.body.reason;
  await emp.save();
  await writeAudit(req, { action: "employee.softDelete", entity: "Employee", entityId: emp._id, before, after: emp });
  return ok(res, emp, "Employee soft-deleted");
});
