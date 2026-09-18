import { body, param } from "express-validator";
import {
  FeeStructure,
  FeeComponent,
  StudentFeeEnrollment,
  StudentFeeDue
} from "../models/FeeStructure.js";
import { AcademicYear, Student } from "../models/index.js";
import { ok, created, fail } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { writeAudit } from "../utils/audit.js";
import { validate } from "../middleware/validate.js";
import { notDeleted } from "../utils/softDelete.js";
import { computeDiscountAndPayable } from "../services/feeCalculation.js";
import { generateDuesForEnrollment } from "../services/feeDueGeneration.js";
import { enrichDue, startOfToday } from "../services/feeStatus.js";
import { Payment } from "../models/Fee.js";
import { FeeRefund } from "../models/FeeStructure.js";

const iid = (req) => req.institute._id;

async function loadStructureWithComponents(structureId, instituteId) {
  const structure = await FeeStructure.findOne({ _id: structureId, instituteId, isActive: true });
  if (!structure) return null;
  const components = await FeeComponent.find({ feeStructureId: structure._id, instituteId, isActive: true }).sort({
    sortOrder: 1
  });
  if (!components.length) return { structure, components: null };
  return { structure, components };
}

async function createEnrollmentForStudent(req, student, structure, components, body) {
  const snapshot = components.map((c) => ({ componentId: c._id, name: c.name, amount: c.amount }));
  const discountType = body.discountType === "percent" ? "percent" : "fixed";
  const discountValue = Number(body.discountValue || 0);
  const maxDiscountCap = body.maxDiscountCap != null && body.maxDiscountCap !== "" ? Number(body.maxDiscountCap) : null;
  const { gross, discountAmount, payable } = computeDiscountAndPayable(
    snapshot.reduce((s, c) => s + c.amount, 0),
    discountType,
    discountValue,
    maxDiscountCap
  );

  const existing = await StudentFeeEnrollment.findOne({
    instituteId: iid(req),
    studentId: student._id,
    feeStructureId: structure._id,
    academicYearId: body.academicYearId,
    status: "active"
  });
  if (existing) throw new Error(`Student ${student.name} already enrolled in this structure for the year`);

  const enrollment = await StudentFeeEnrollment.create({
    instituteId: iid(req),
    studentId: student._id,
    feeStructureId: structure._id,
    academicYearId: body.academicYearId,
    components: snapshot,
    discountType,
    discountValue,
    maxDiscountCap,
    gross,
    discountAmount,
    payable,
    billingCycle: structure.billingCycle,
    status: "active"
  });

  await writeAudit(req, { action: "fees.enroll", entity: "StudentFeeEnrollment", entityId: enrollment._id, after: enrollment });

  if (body.generateDues) {
    const year = await AcademicYear.findOne({ _id: body.academicYearId, instituteId: iid(req) });
    if (year) {
      await generateDuesForEnrollment(enrollment, year, {
        dueDateOffsetDays: body.dueDateOffsetDays
      });
    }
  }
  return enrollment;
}

export const enrollValidators = [
  body("studentId").isMongoId(),
  body("feeStructureId").isMongoId(),
  body("academicYearId").isMongoId(),
  body("discountType").optional().isIn(["fixed", "percent"]),
  body("discountValue").optional().isFloat({ min: 0 }),
  body("maxDiscountCap").optional({ nullable: true }).isFloat({ min: 0 }),
  body("generateDues").optional().isBoolean(),
  body("dueDateOffsetDays").optional().isInt({ min: 0 }),
  validate
];

export const bulkEnrollValidators = [
  body("feeStructureId").isMongoId(),
  body("academicYearId").isMongoId(),
  body("classId").optional().isMongoId(),
  body("sectionId").optional().isMongoId(),
  body("discountType").optional().isIn(["fixed", "percent"]),
  body("discountValue").optional().isFloat({ min: 0 }),
  body("maxDiscountCap").optional({ nullable: true }).isFloat({ min: 0 }),
  body("generateDues").optional().isBoolean(),
  body("dueDateOffsetDays").optional().isInt({ min: 0 }),
  validate
];

export const createEnrollment = asyncHandler(async (req, res) => {
  const loaded = await loadStructureWithComponents(req.body.feeStructureId, iid(req));
  if (!loaded) return fail(res, 422, "Fee structure not found or inactive");
  if (!loaded.components?.length) return fail(res, 422, "Fee structure has no active components");

  const student = await Student.findOne(notDeleted({ _id: req.body.studentId, instituteId: iid(req) }));
  if (!student) return fail(res, 422, "Student not found");

  const year = await AcademicYear.findOne({ _id: req.body.academicYearId, instituteId: iid(req) });
  if (!year) return fail(res, 422, "Academic year not found");

  try {
    const enrollment = await createEnrollmentForStudent(req, student, loaded.structure, loaded.components, req.body);
    const populated = await StudentFeeEnrollment.findById(enrollment._id)
      .populate("studentId feeStructureId academicYearId");
    return created(res, populated);
  } catch (e) {
    return fail(res, 422, e.message);
  }
});

export const bulkEnroll = asyncHandler(async (req, res) => {
  if (!req.body.classId && !req.body.sectionId) {
    return fail(res, 422, "classId or sectionId required");
  }
  const loaded = await loadStructureWithComponents(req.body.feeStructureId, iid(req));
  if (!loaded) return fail(res, 422, "Fee structure not found or inactive");
  if (!loaded.components?.length) return fail(res, 422, "Fee structure has no active components");

  const year = await AcademicYear.findOne({ _id: req.body.academicYearId, instituteId: iid(req) });
  if (!year) return fail(res, 422, "Academic year not found");

  const filter = notDeleted({ instituteId: iid(req), isActive: true });
  if (req.body.sectionId) filter.sectionId = req.body.sectionId;
  else if (req.body.classId) filter.classId = req.body.classId;

  const students = await Student.find(filter);
  const createdEnrollments = [];
  const errors = [];

  for (const student of students) {
    try {
      const en = await createEnrollmentForStudent(req, student, loaded.structure, loaded.components, req.body);
      createdEnrollments.push(en._id);
    } catch (e) {
      errors.push({ studentId: student._id, name: student.name, message: e.message });
    }
  }

  return ok(res, { created: createdEnrollments.length, errors, enrollmentIds: createdEnrollments });
});

export const listEnrollments = asyncHandler(async (req, res) => {
  const filter = { instituteId: iid(req) };
  if (req.query.studentId) filter.studentId = req.query.studentId;
  if (req.query.structureId) filter.feeStructureId = req.query.structureId;
  if (req.query.academicYearId) filter.academicYearId = req.query.academicYearId;
  if (req.query.status) filter.status = req.query.status;
  const items = await StudentFeeEnrollment.find(filter)
    .populate("studentId feeStructureId academicYearId")
    .sort({ createdAt: -1 });
  return ok(res, items);
});

export const generateDues = asyncHandler(async (req, res) => {
  const enrollment = await StudentFeeEnrollment.findOne({ _id: req.params.id, instituteId: iid(req), status: "active" });
  if (!enrollment) return fail(res, 404, "Enrollment not found");
  const year = await AcademicYear.findOne({ _id: enrollment.academicYearId, instituteId: iid(req) });
  if (!year) return fail(res, 422, "Academic year not found");
  const result = await generateDuesForEnrollment(enrollment, year, {
    dueDateOffsetDays: req.body?.dueDateOffsetDays
  });
  await writeAudit(req, {
    action: "fees.generateDues",
    entity: "StudentFeeEnrollment",
    entityId: enrollment._id,
    after: { created: result.created.length, skipped: result.skipped }
  });
  return ok(res, { created: result.created.length, skipped: result.skipped, dues: result.created });
});

export const listDues = asyncHandler(async (req, res) => {
  const filter = { instituteId: iid(req) };
  if (req.query.studentId) filter.studentId = req.query.studentId;
  if (req.query.enrollmentId) filter.enrollmentId = req.query.enrollmentId;
  if (req.query.from || req.query.to) {
    filter.dueDate = {};
    if (req.query.from) filter.dueDate.$gte = new Date(req.query.from);
    if (req.query.to) filter.dueDate.$lte = new Date(req.query.to);
  }
  const items = await StudentFeeDue.find(filter)
    .populate("studentId feeStructureId enrollmentId")
    .sort({ dueDate: -1 });
  const out = [];
  for (const d of items) {
    const row = await enrichDue(d);
    if (req.query.status && row.status !== req.query.status) continue;
    if (req.query.overdue === "true" && row.status !== "overdue") continue;
    out.push(row);
  }
  return ok(res, out);
});

export const getDue = asyncHandler(async (req, res) => {
  const due = await StudentFeeDue.findOne({ _id: req.params.id, instituteId: iid(req) })
    .populate("studentId feeStructureId enrollmentId");
  if (!due) return fail(res, 404, "Fee due not found");
  const enriched = await enrichDue(due);
  const payments = await Payment.find({ feeDueId: due._id }).sort({ createdAt: -1 });
  const refunds = await FeeRefund.find({ feeDueId: due._id }).sort({ createdAt: -1 });
  return ok(res, { ...enriched, payments, refunds });
});

export const enrollmentIdParam = [param("id").isMongoId(), validate];
export const dueIdParam = [param("id").isMongoId(), validate];
