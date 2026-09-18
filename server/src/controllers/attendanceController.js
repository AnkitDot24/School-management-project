import { body, param } from "express-validator";
import { AttendanceDay, Student } from "../models/index.js";
import { ok, fail } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { writeAudit } from "../utils/audit.js";
import { validate } from "../middleware/validate.js";
import { notDeleted } from "../utils/softDelete.js";
import { resolveLinkedStudent } from "../services/enrollmentValidation.js";
import { hasPermission } from "../utils/permissions.js";

const iid = (req) => req.institute._id;

function todayKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

async function resolvePunchStudent(req, res) {
  const staffPunch = hasPermission(req, "attendance.punch");
  const selfPortal = hasPermission(req, "portal.self");

  if (req.body.studentId) {
    if (!staffPunch && !req.isSuperAdmin) {
      fail(res, 403, "Staff attendance permission required to punch for another student");
      return null;
    }
    const student = await Student.findOne(
      notDeleted({ _id: req.body.studentId, instituteId: iid(req), isActive: true })
    );
    if (!student) fail(res, 422, "Active student not found");
    return student;
  }

  if (!selfPortal && !req.isSuperAdmin) {
    fail(res, 403, "Student portal or staff punch permission required");
    return null;
  }
  const student = await resolveLinkedStudent(req.user, iid(req));
  if (!student) fail(res, 403, "No linked student profile; cannot punch attendance");
  return student;
}

export const punchValidators = [body("studentId").optional().isMongoId(), validate];

export const punchIn = asyncHandler(async (req, res) => {
  const student = await resolvePunchStudent(req, res);
  if (!student) return;
  const date = todayKey();
  let rec = await AttendanceDay.findOne({ studentId: student._id, date });
  if (rec?.punchInAt) return fail(res, 422, "Already punched in today");
  if (rec?.punchOutAt) return fail(res, 422, "Cannot punch in after punch out for today");
  const now = new Date();
  if (!rec) {
    rec = await AttendanceDay.create({
      instituteId: iid(req),
      studentId: student._id,
      date,
      punchInAt: now
    });
  } else {
    rec.punchInAt = now;
    await rec.save();
  }
  await writeAudit(req, { action: "attendance.punchIn", entity: "AttendanceDay", entityId: rec._id, after: rec });
  return ok(res, rec, "Punched in");
});

export const punchOut = asyncHandler(async (req, res) => {
  const student = await resolvePunchStudent(req, res);
  if (!student) return;
  const date = todayKey();
  const rec = await AttendanceDay.findOne({ studentId: student._id, date });
  if (!rec?.punchInAt) return fail(res, 422, "No punch-in found for today");
  if (rec.punchOutAt) return fail(res, 422, "Already punched out today");
  const now = new Date();
  if (now < rec.punchInAt) return fail(res, 422, "Punch-out cannot be before punch-in");
  rec.punchOutAt = now;
  await rec.save();
  await writeAudit(req, { action: "attendance.punchOut", entity: "AttendanceDay", entityId: rec._id, after: rec });
  return ok(res, rec, "Punched out");
});

function superAdminPortalPreview(student) {
  return {
    preview: true,
    message:
      "Super Admin preview — no student profile is linked to your account. Use Attendance or Students for institute-wide data, or log in as a student user to see their portal."
  };
}

export const myAttendance = asyncHandler(async (req, res) => {
  if (!hasPermission(req, "portal.self") && !hasPermission(req, "attendance.read")) {
    return fail(res, 403, "Student portal permission required");
  }
  const student = await resolveLinkedStudent(req.user, iid(req));
  if (!student) {
    if (req.isSuperAdmin) return ok(res, []);
    return fail(res, 403, "No linked student profile");
  }
  const filter = { instituteId: iid(req), studentId: student._id };
  if (req.query.from || req.query.to) {
    filter.date = {};
    if (req.query.from) filter.date.$gte = req.query.from;
    if (req.query.to) filter.date.$lte = req.query.to;
  }
  const items = await AttendanceDay.find(filter).sort({ date: -1 }).limit(Number(req.query.limit) || 120);
  return ok(res, items);
});

export const studentAttendanceDashboard = asyncHandler(async (req, res) => {
  if (!hasPermission(req, "portal.self") && !hasPermission(req, "attendance.read")) {
    return fail(res, 403, "Student portal permission required");
  }
  const student = await resolveLinkedStudent(req.user, iid(req));
  if (!student) {
    if (req.isSuperAdmin) {
      return ok(res, {
        ...superAdminPortalPreview(null),
        student: null,
        today: null,
        recent: [],
        summary: { totalPunchInDays: 0 }
      });
    }
    return fail(res, 403, "No linked student profile");
  }
  const date = todayKey();
  const today = await AttendanceDay.findOne({ studentId: student._id, date });
  const recent = await AttendanceDay.find({ studentId: student._id }).sort({ date: -1 }).limit(30);
  const totalDays = await AttendanceDay.countDocuments({ studentId: student._id, punchInAt: { $ne: null } });
  return ok(res, {
    student: { id: student._id, name: student.name, admissionNo: student.admissionNo },
    today,
    recent,
    summary: { totalPunchInDays: totalDays }
  });
});

export const listAttendance = asyncHandler(async (req, res) => {
  const filter = { instituteId: iid(req) };
  if (req.query.studentId) filter.studentId = req.query.studentId;
  if (req.query.from || req.query.to) {
    filter.date = {};
    if (req.query.from) filter.date.$gte = req.query.from;
    if (req.query.to) filter.date.$lte = req.query.to;
  }
  const items = await AttendanceDay.find(filter).populate({
    path: "studentId",
    match: req.query.classId || req.query.sectionId
      ? {
          ...(req.query.classId ? { classId: req.query.classId } : {}),
          ...(req.query.sectionId ? { sectionId: req.query.sectionId } : {})
        }
      : undefined
  });
  return ok(
    res,
    items.filter((i) => i.studentId)
  );
});

export const listAttendanceForStudent = asyncHandler(async (req, res) => {
  const student = await Student.findOne(notDeleted({ _id: req.params.studentId, instituteId: iid(req) }));
  if (!student) return fail(res, 404, "Student not found");
  const filter = { instituteId: iid(req), studentId: student._id };
  if (req.query.from || req.query.to) {
    filter.date = {};
    if (req.query.from) filter.date.$gte = req.query.from;
    if (req.query.to) filter.date.$lte = req.query.to;
  }
  const items = await AttendanceDay.find(filter).sort({ date: -1 });
  return ok(res, items);
});

export const studentIdParam = [param("studentId").isMongoId(), validate];
