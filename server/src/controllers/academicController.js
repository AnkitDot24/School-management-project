import { body } from "express-validator";
import {
  AcademicYear,
  ClassModel,
  Section,
  Subject,
  SubjectTeacher,
  Employee,
  ClassSubject,
  ClassSubjectTeacher,
  SectionClassTeacher,
  SectionSubjectTeacher
} from "../models/index.js";
import { ok, created, fail } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { writeAudit } from "../utils/audit.js";
import { validate } from "../middleware/validate.js";
import { notDeleted } from "../utils/softDelete.js";
import { getEligibleTeacherById } from "../services/enrollmentValidation.js";

const iid = (req) => req.institute._id;

export const yearValidators = [
  body("name").trim().notEmpty(),
  body("startDate").isISO8601(),
  body("endDate").isISO8601(),
  validate
];

export const listYears = asyncHandler(async (req, res) => ok(res, await AcademicYear.find({ instituteId: iid(req) }).sort({ startDate: -1 })));

export const createYear = asyncHandler(async (req, res) => {
  if (new Date(req.body.endDate) <= new Date(req.body.startDate)) return fail(res, 422, "endDate must be after startDate");
  if (req.body.isCurrent) await AcademicYear.updateMany({ instituteId: iid(req) }, { isCurrent: false });
  const doc = await AcademicYear.create({ ...req.body, instituteId: iid(req) });
  await writeAudit(req, { action: "academic.year.create", entity: "AcademicYear", entityId: doc._id, after: doc });
  return created(res, doc);
});

export const classValidators = [body("name").trim().notEmpty(), body("academicYearId").isMongoId(), validate];

export const listClasses = asyncHandler(async (req, res) =>
  ok(res, await ClassModel.find({ instituteId: iid(req) }).populate("academicYearId"))
);

export const createClass = asyncHandler(async (req, res) => {
  const year = await AcademicYear.findOne({ _id: req.body.academicYearId, instituteId: iid(req) });
  if (!year) return fail(res, 422, "Academic year not in this institute");
  const doc = await ClassModel.create({ instituteId: iid(req), academicYearId: year._id, name: req.body.name });
  await writeAudit(req, { action: "academic.class.create", entity: "Class", entityId: doc._id, after: doc });
  return created(res, doc);
});

export const sectionValidators = [
  body("name").trim().notEmpty(),
  body("classId").isMongoId(),
  body("academicYearId").isMongoId(),
  validate
];

export const listSections = asyncHandler(async (req, res) =>
  ok(res, await Section.find({ instituteId: iid(req) }).populate("classId academicYearId"))
);

export const createSection = asyncHandler(async (req, res) => {
  const cls = await ClassModel.findOne({ _id: req.body.classId, instituteId: iid(req) });
  if (!cls) return fail(res, 422, "Class not in this institute");
  if (String(cls.academicYearId) !== String(req.body.academicYearId)) {
    return fail(res, 422, "Section year must match class year");
  }
  const doc = await Section.create({
    instituteId: iid(req),
    classId: cls._id,
    academicYearId: req.body.academicYearId,
    name: req.body.name
  });
  await writeAudit(req, { action: "academic.section.create", entity: "Section", entityId: doc._id, after: doc });
  return created(res, doc);
});

export const subjectValidators = [body("name").trim().notEmpty(), body("code").trim().notEmpty(), validate];

export const listSubjects = asyncHandler(async (req, res) => ok(res, await Subject.find({ instituteId: iid(req) })));

export const createSubject = asyncHandler(async (req, res) => {
  const doc = await Subject.create({ instituteId: iid(req), name: req.body.name, code: req.body.code.toUpperCase() });
  await writeAudit(req, { action: "academic.subject.create", entity: "Subject", entityId: doc._id, after: doc });
  return created(res, doc);
});

async function teacherInInstitute(req, teacherId) {
  return getEligibleTeacherById(iid(req), teacherId);
}

// ---- Step 1: subject -> teacher eligibility ----------------------------

export const subjectTeacherValidators = [body("subjectId").isMongoId(), body("teacherId").isMongoId(), validate];

export const listSubjectTeachers = asyncHandler(async (req, res) =>
  ok(res, await SubjectTeacher.find({ instituteId: iid(req) }).populate("subjectId teacherId"))
);

export const createSubjectTeacher = asyncHandler(async (req, res) => {
  const subject = await Subject.findOne({ _id: req.body.subjectId, instituteId: iid(req) });
  const teacher = await teacherInInstitute(req, req.body.teacherId);
  if (!subject || !teacher) return fail(res, 422, "Subject and an active teacher from this institute are required");
  const existing = await SubjectTeacher.findOne({ subjectId: subject._id, teacherId: teacher._id });
  if (existing) return fail(res, 409, "Teacher is already assigned to this subject");
  const doc = await SubjectTeacher.create({ instituteId: iid(req), subjectId: subject._id, teacherId: teacher._id });
  await writeAudit(req, { action: "assignment.subjectTeacher", entity: "SubjectTeacher", entityId: doc._id, after: doc });
  return created(res, doc);
});

// ---- Step 2a: subject -> class (must exist before a teacher can be assigned) ----

export const classSubjectValidators = [body("classId").isMongoId(), body("subjectId").isMongoId(), validate];

export const listClassSubjects = asyncHandler(async (req, res) =>
  ok(res, await ClassSubject.find({ instituteId: iid(req) }).populate("classId subjectId"))
);

export const createClassSubject = asyncHandler(async (req, res) => {
  const cls = await ClassModel.findOne({ _id: req.body.classId, instituteId: iid(req) });
  const sub = await Subject.findOne({ _id: req.body.subjectId, instituteId: iid(req) });
  if (!cls || !sub) return fail(res, 422, "Class and subject must belong to this institute");
  const existing = await ClassSubject.findOne({ classId: cls._id, subjectId: sub._id });
  if (existing) return fail(res, 409, "Subject is already assigned to this class");
  const doc = await ClassSubject.create({ instituteId: iid(req), classId: cls._id, subjectId: sub._id });
  await writeAudit(req, { action: "academic.classSubject.create", entity: "ClassSubject", entityId: doc._id, after: doc });
  return created(res, doc);
});

export const cstValidators = [
  body("classId").isMongoId(),
  body("subjectId").isMongoId(),
  body("teacherId").isMongoId(),
  body("academicYearId").optional().isMongoId(),
  validate
];

export const listCST = asyncHandler(async (req, res) => {
  const filter = { instituteId: iid(req) };
  if (req.query.academicYearId) filter.academicYearId = req.query.academicYearId;
  return ok(res, await ClassSubjectTeacher.find(filter).populate("academicYearId classId subjectId teacherId"));
});

export const createCST = asyncHandler(async (req, res) => {
  const cls = await ClassModel.findOne({ _id: req.body.classId, instituteId: iid(req) });
  const sub = await Subject.findOne({ _id: req.body.subjectId, instituteId: iid(req) });
  const teacher = await teacherInInstitute(req, req.body.teacherId);
  if (!cls || !sub || !teacher) return fail(res, 422, "Class, subject, and active teacher must belong to institute");

  const academicYearId = req.body.academicYearId || cls.academicYearId;
  if (!academicYearId) return fail(res, 422, "Academic year is required");

  const classSubject = await ClassSubject.findOne({ classId: cls._id, subjectId: sub._id });
  if (!classSubject) return fail(res, 422, "Assign this subject to the class before assigning its teacher");

  const eligible = await SubjectTeacher.findOne({ subjectId: sub._id, teacherId: teacher._id });
  if (!eligible) return fail(res, 422, "Teacher is not assigned to teach this subject yet (step 1)");

  const existing = await ClassSubjectTeacher.findOne({ classId: cls._id, subjectId: sub._id, academicYearId });
  if (existing) return fail(res, 409, "This class subject already has a teacher assigned for this academic year");

  const doc = await ClassSubjectTeacher.create({
    instituteId: iid(req),
    academicYearId,
    classId: cls._id,
    subjectId: sub._id,
    teacherId: teacher._id
  });
  await writeAudit(req, { action: "assignment.classSubjectTeacher", entity: "ClassSubjectTeacher", entityId: doc._id, after: doc });
  return created(res, doc);
});

export const sctValidators = [
  body("sectionId").isMongoId(),
  body("teacherId").isMongoId(),
  body("academicYearId").optional().isMongoId(),
  validate
];

export const listSCT = asyncHandler(async (req, res) => {
  const filter = { instituteId: iid(req) };
  if (req.query.academicYearId) filter.academicYearId = req.query.academicYearId;
  return ok(res, await SectionClassTeacher.find(filter).populate("academicYearId sectionId teacherId"));
});

export const createSCT = asyncHandler(async (req, res) => {
  const section = await Section.findOne({ _id: req.body.sectionId, instituteId: iid(req) });
  const teacher = await teacherInInstitute(req, req.body.teacherId);
  if (!section || !teacher) return fail(res, 422, "Section and active teacher required");

  const academicYearId = req.body.academicYearId || section.academicYearId;
  if (!academicYearId) return fail(res, 422, "Academic year is required");

  const existing = await SectionClassTeacher.findOne({ sectionId: section._id, academicYearId });
  if (existing) return fail(res, 409, "Section already has a class teacher for this academic year");

  const doc = await SectionClassTeacher.create({
    instituteId: iid(req),
    academicYearId,
    sectionId: section._id,
    teacherId: teacher._id
  });
  await writeAudit(req, { action: "assignment.sectionClassTeacher", entity: "SectionClassTeacher", entityId: doc._id, after: doc });
  return created(res, doc);
});

export const sstValidators = [
  body("sectionId").isMongoId(),
  body("subjectId").isMongoId(),
  body("teacherId").isMongoId(),
  body("academicYearId").optional().isMongoId(),
  validate
];

export const listSST = asyncHandler(async (req, res) => {
  const filter = { instituteId: iid(req) };
  if (req.query.academicYearId) filter.academicYearId = req.query.academicYearId;
  return ok(res, await SectionSubjectTeacher.find(filter).populate("academicYearId sectionId subjectId teacherId"));
});

export const createSST = asyncHandler(async (req, res) => {
  const section = await Section.findOne({ _id: req.body.sectionId, instituteId: iid(req) }).populate("classId");
  const teacher = await teacherInInstitute(req, req.body.teacherId);
  const subject = await Subject.findOne({ _id: req.body.subjectId, instituteId: iid(req) });
  if (!section || !teacher || !subject) return fail(res, 422, "Section, subject, and teacher required");

  const academicYearId = req.body.academicYearId || section.academicYearId || section.classId?.academicYearId;
  if (!academicYearId) return fail(res, 422, "Academic year is required");

  const classId = section.classId?._id || section.classId;
  const mapping = await ClassSubjectTeacher.findOne({ classId, subjectId: subject._id });
  if (!mapping) return fail(res, 422, "Assign this subject and its teacher to the class before assigning it at section level");

  if (String(mapping.teacherId) !== String(teacher._id)) {
    return fail(res, 422, "Teacher is not eligible: only the teacher assigned to this class subject can be assigned to its sections");
  }

  const existing = await SectionSubjectTeacher.findOne({ sectionId: section._id, subjectId: subject._id, academicYearId });
  if (existing) return fail(res, 409, "This section subject already has a teacher assigned for this academic year");

  const doc = await SectionSubjectTeacher.create({
    instituteId: iid(req),
    academicYearId,
    sectionId: section._id,
    subjectId: subject._id,
    teacherId: teacher._id
  });
  await writeAudit(req, { action: "assignment.sectionSubjectTeacher", entity: "SectionSubjectTeacher", entityId: doc._id, after: doc });
  return created(res, doc);
});
