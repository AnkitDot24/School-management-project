import { Student, AttendanceDay, FeeAssignment, Payment, ExamMark, ParentStudentLink } from "../models/index.js";
import { StudentFeeDue } from "../models/FeeStructure.js";
import { enrichDue } from "../services/feeStatus.js";
import { ok, fail } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { resolveLinkedStudent } from "../services/enrollmentValidation.js";
import { requireStudentPortal, SUPER_ADMIN_PORTAL_PREVIEW_MESSAGE } from "../services/studentPortal.js";
import { hasPermission } from "../utils/permissions.js";
import { SectionClassTeacher, SectionSubjectTeacher, ClassSubjectTeacher } from "../models/Assignment.js";
import { writeAudit } from "../utils/audit.js";

async function paidSum(id) {
  const rows = await Payment.aggregate([
    { $match: { feeAssignmentId: id } },
    { $group: { _id: null, total: { $sum: "$amount" } } }
  ]);
  return rows[0]?.total || 0;
}

async function studentFeeRows(student) {
  const dues = await StudentFeeDue.find({ studentId: student._id }).populate("feeStructureId").sort({ dueDate: -1 });
  if (dues.length) {
    const feeRows = [];
    for (const d of dues) {
      feeRows.push(await enrichDue(d));
    }
    return feeRows;
  }
  const fees = await FeeAssignment.find({ studentId: student._id });
  const feeRows = [];
  for (const a of fees) {
    const paid = await paidSum(a._id);
    feeRows.push({ ...a.toObject(), paid, balance: a.payable - paid, status: paid >= a.payable ? "paid" : "pending" });
  }
  return feeRows;
}

async function studentBundle(student) {
  const attendance = await AttendanceDay.find({ studentId: student._id }).sort({ date: -1 }).limit(60);
  const feeRows = await studentFeeRows(student);
  const results = await ExamMark.find({ studentId: student._id }).populate("examId subjectId");
  return { student, attendance, fees: feeRows, results };
}

async function loadAssignments(student, instituteId) {
  const yearId = student.academicYearId?._id || student.academicYearId;
  const sectionId = student.sectionId?._id || student.sectionId;
  const classId = student.classId?._id || student.classId;
  const out = { classTeacher: null, sectionSubjects: [], classSubjects: [] };
  if (sectionId && yearId) {
    out.classTeacher = await SectionClassTeacher.findOne({ instituteId, sectionId, academicYearId: yearId }).populate(
      "teacherId"
    );
    out.sectionSubjects = await SectionSubjectTeacher.find({ instituteId, sectionId, academicYearId: yearId })
      .populate("subjectId teacherId")
      .sort({ createdAt: 1 });
  }
  if (classId && yearId) {
    out.classSubjects = await ClassSubjectTeacher.find({ instituteId, classId, academicYearId: yearId })
      .populate("subjectId teacherId")
      .sort({ createdAt: 1 });
  }
  return out;
}

function serializeStudent(student) {
  const obj = student.toObject ? student.toObject() : student;
  if (obj.userId) obj.userUuid = String(obj.userId._id || obj.userId);
  return obj;
}

export const studentPortal = asyncHandler(async (req, res) => {
  const ctx = await requireStudentPortal(req, res);
  if (!ctx) return;
  if (!ctx.student) {
    return ok(res, {
      preview: true,
      message: SUPER_ADMIN_PORTAL_PREVIEW_MESSAGE,
      student: null,
      attendance: [],
      fees: [],
      results: [],
      assignments: { classTeacher: null, sectionSubjects: [], classSubjects: [] }
    });
  }
  const bundle = await studentBundle(ctx.student);
  bundle.assignments = await loadAssignments(ctx.student, req.institute._id);
  return ok(res, bundle);
});

export const studentProfile = asyncHandler(async (req, res) => {
  const ctx = await requireStudentPortal(req, res);
  if (!ctx) return;
  if (!ctx.student) {
    return ok(res, { preview: true, message: SUPER_ADMIN_PORTAL_PREVIEW_MESSAGE, student: null });
  }
  return ok(res, serializeStudent(ctx.student));
});

export const studentPortalFees = asyncHandler(async (req, res) => {
  const ctx = await requireStudentPortal(req, res);
  if (!ctx) return;
  if (!ctx.student) return ok(res, []);
  return ok(res, await studentFeeRows(ctx.student));
});

export const studentPortalResults = asyncHandler(async (req, res) => {
  const ctx = await requireStudentPortal(req, res);
  if (!ctx) return;
  if (!ctx.student) return ok(res, []);
  const results = await ExamMark.find({ studentId: ctx.student._id }).populate("examId subjectId");
  return ok(res, results);
});

export const studentPortalAssignments = asyncHandler(async (req, res) => {
  const ctx = await requireStudentPortal(req, res);
  if (!ctx) return;
  if (!ctx.student) {
    return ok(res, {
      preview: true,
      message: SUPER_ADMIN_PORTAL_PREVIEW_MESSAGE,
      classTeacher: null,
      sectionSubjects: [],
      classSubjects: []
    });
  }
  return ok(res, await loadAssignments(ctx.student, req.institute._id));
});

export const updateStudentProfilePhoto = asyncHandler(async (req, res) => {
  const ctx = await requireStudentPortal(req, res);
  if (!ctx) return;
  if (!ctx.student) return fail(res, 403, "Link a student profile to update portal photo");
  const extraKeys = Object.keys(req.body || {}).filter((k) => k !== "photo");
  if (extraKeys.length) return fail(res, 422, "Only profile photo can be updated on this endpoint");
  const student = ctx.student;
  if (!req.file) return fail(res, 400, "Photo file required");
  const before = student.toObject();
  student.photoUrl = `/uploads/${req.file.filename}`;
  await student.save();
  await writeAudit(req, {
    action: "portal.student.photoUpdate",
    entity: "Student",
    entityId: student._id,
    before,
    after: student
  });
  return ok(res, student, "Profile photo updated");
});

export const parentPortal = asyncHandler(async (req, res) => {
  if (!hasPermission(req, "portal.child")) {
    return fail(res, 403, "Parent portal permission required");
  }
  const links = await ParentStudentLink.find({
    instituteId: req.institute._id,
    parentUserId: req.user._id
  }).populate({
    path: "studentId",
    match: { isDeleted: { $ne: true } },
    populate: "classId sectionId"
  });
  const children = [];
  for (const link of links) {
    if (!link.studentId) continue;
    if (req.query.studentId && String(link.studentId._id) !== String(req.query.studentId)) continue;
    children.push(await studentBundle(link.studentId));
  }
  if (req.query.studentId && !children.length) return fail(res, 403, "Not linked to this student");
  if (req.isSuperAdmin && !children.length) {
    return ok(res, {
      preview: true,
      message:
        "Super Admin preview — your account has no parent–child links. Open Students for institute data, or log in as a demo parent user.",
      children: []
    });
  }
  return ok(res, { children });
});
