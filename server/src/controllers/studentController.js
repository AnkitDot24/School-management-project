import { body, param } from "express-validator";
import { Student, User, ParentStudentLink } from "../models/index.js";
import { ok, created, fail } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { writeAudit } from "../utils/audit.js";
import { validate } from "../middleware/validate.js";
import { notDeleted } from "../utils/softDelete.js";
import { validateStudentEnrollment } from "../services/enrollmentValidation.js";
import { validateStudentUserLink } from "../services/studentPortal.js";
import {
  allocateInstituteId,
  peekNextInstituteId,
  assertImmutableId,
  httpFailFromError,
  STU_PREFIX
} from "../services/instituteIds.js";

const iid = (req) => req.institute._id;

const studentPopulate = "academicYearId classId sectionId userId";

export const studentValidators = [
  body("admissionNo").optional({ values: "falsy" }).trim(),
  body("name").trim().notEmpty(),
  validate
];

export const peekStudentAdmissionNo = asyncHandler(async (req, res) => {
  const admissionNo = await peekNextInstituteId(Student, iid(req), "admissionNo", STU_PREFIX);
  return ok(res, { admissionNo });
});

export const listStudents = asyncHandler(async (req, res) => {
  const filter = notDeleted({ instituteId: iid(req) });
  if (req.query.q) {
    filter.$or = [
      { name: { $regex: req.query.q, $options: "i" } },
      { admissionNo: { $regex: req.query.q, $options: "i" } }
    ];
  }
  if (req.query.classId) filter.classId = req.query.classId;
  if (req.query.sectionId) filter.sectionId = req.query.sectionId;
  if (req.query.active === "true") filter.isActive = true;
  if (req.query.active === "false") filter.isActive = false;
  const items = await Student.find(filter).populate(studentPopulate).sort({ name: 1 });
  return ok(res, items);
});

export const listDeletedStudents = asyncHandler(async (req, res) => {
  const items = await Student.find({ instituteId: iid(req), isDeleted: true }).populate(studentPopulate);
  return ok(res, items);
});

export const getStudent = asyncHandler(async (req, res) => {
  const filter = { _id: req.params.id, instituteId: iid(req) };
  if (req.query.includeDeleted !== "true" || !req.effectivePermissions?.includes("student.restore")) {
    Object.assign(filter, notDeleted());
  }
  const doc = await Student.findOne(filter).populate(studentPopulate);
  if (!doc) return fail(res, 404, "Student not found");
  return ok(res, doc);
});

export const createStudent = asyncHandler(async (req, res) => {
  await validateStudentEnrollment(iid(req), req.body);
  if (req.body.userId) {
    const linkErr = await validateStudentUserLink(iid(req), req.body.userId);
    if (linkErr) return fail(res, 422, linkErr);
  }
  let admissionNo;
  try {
    admissionNo = await allocateInstituteId(Student, iid(req), "admissionNo", STU_PREFIX, req.body.admissionNo);
  } catch (e) {
    return httpFailFromError(res, e);
  }
  const doc = await Student.create({
    instituteId: iid(req),
    admissionNo,
    name: req.body.name,
    email: req.body.email || "",
    phone: req.body.phone || "",
    gender: req.body.gender || "",
    dob: req.body.dob || null,
    guardianName: req.body.guardianName || "",
    guardianPhone: req.body.guardianPhone || "",
    address: req.body.address || "",
    academicYearId: req.body.academicYearId || null,
    classId: req.body.classId || null,
    sectionId: req.body.sectionId || null,
    userId: req.body.userId || null,
    photoUrl: req.file ? `/uploads/${req.file.filename}` : ""
  });
  if (doc.userId) {
    await User.findByIdAndUpdate(doc.userId, { studentId: doc._id });
  }
  await writeAudit(req, { action: "student.create", entity: "Student", entityId: doc._id, after: doc });
  return created(res, doc);
});

export const updateStudent = asyncHandler(async (req, res) => {
  const doc = await Student.findOne(notDeleted({ _id: req.params.id, instituteId: iid(req) }));
  if (!doc) return fail(res, 404, "Student not found");
  const before = doc.toObject();
  try {
    assertImmutableId(doc.admissionNo, req.body.admissionNo, "Student ID");
  } catch (e) {
    return httpFailFromError(res, e);
  }
  const fields = [
    "name",
    "email",
    "phone",
    "gender",
    "dob",
    "guardianName",
    "guardianPhone",
    "address",
    "academicYearId",
    "classId",
    "sectionId",
    "userId",
    "isActive"
  ];
  for (const f of fields) if (req.body[f] !== undefined) doc[f] = req.body[f];
  if (req.body.userId) {
    const linkErr = await validateStudentUserLink(iid(req), req.body.userId);
    if (linkErr) return fail(res, 422, linkErr);
  }
  await validateStudentEnrollment(iid(req), {
    classId: doc.classId,
    sectionId: doc.sectionId,
    academicYearId: doc.academicYearId
  });
  if (req.file) doc.photoUrl = `/uploads/${req.file.filename}`;
  await doc.save();
  if (doc.userId) {
    await User.findByIdAndUpdate(doc.userId, { studentId: doc._id });
  }
  await writeAudit(req, { action: "student.update", entity: "Student", entityId: doc._id, before, after: doc });
  return ok(res, doc);
});

export const softDeleteValidators = [
  param("id").isMongoId(),
  body("reason").trim().isLength({ min: 5 }),
  validate
];

export const softDeleteStudent = asyncHandler(async (req, res) => {
  const doc = await Student.findOne(notDeleted({ _id: req.params.id, instituteId: iid(req) }));
  if (!doc) return fail(res, 404, "Student not found");
  const before = doc.toObject();
  doc.isDeleted = true;
  doc.deletedAt = new Date();
  doc.deletedBy = req.user._id;
  doc.deleteReason = req.body.reason;
  await doc.save();
  await writeAudit(req, {
    action: "student.softDelete",
    entity: "Student",
    entityId: doc._id,
    before,
    after: doc,
    deleteReason: req.body.reason
  });
  return ok(res, doc, "Student soft-deleted");
});

export const restoreStudent = asyncHandler(async (req, res) => {
  const doc = await Student.findOne({ _id: req.params.id, instituteId: iid(req), isDeleted: true });
  if (!doc) return fail(res, 404, "Deleted student not found");
  doc.isDeleted = false;
  doc.deletedAt = null;
  doc.deletedBy = null;
  doc.deleteReason = null;
  await doc.save();
  await writeAudit(req, { action: "student.restore", entity: "Student", entityId: doc._id, after: doc });
  return ok(res, doc, "Student restored");
});

export const parentLinkValidators = [
  body("parentUserId").isMongoId(),
  body("studentId").isMongoId(),
  validate
];

export const createParentLink = asyncHandler(async (req, res) => {
  const student = await Student.findOne(notDeleted({ _id: req.body.studentId, instituteId: iid(req) }));
  if (!student) return fail(res, 422, "Student not found");
  const parent = await User.findById(req.body.parentUserId);
  if (!parent) return fail(res, 422, "Parent user not found");
  const doc = await ParentStudentLink.create({
    instituteId: iid(req),
    parentUserId: parent._id,
    studentId: student._id
  });
  await writeAudit(req, { action: "student.parentLink", entity: "ParentStudentLink", entityId: doc._id, after: doc });
  return created(res, doc);
});

export const listParentLinks = asyncHandler(async (req, res) => {
  const items = await ParentStudentLink.find({ instituteId: iid(req) }).populate("parentUserId studentId");
  return ok(res, items);
});
