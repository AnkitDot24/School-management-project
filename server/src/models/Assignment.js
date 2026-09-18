import mongoose from "mongoose";

// Step 2a: a subject is attached to a class before any teacher can be
// assigned to teach it there. One subject can only be added to a class once.
const classSubjectSchema = new mongoose.Schema(
  {
    instituteId: { type: mongoose.Schema.Types.ObjectId, ref: "Institute", required: true },
    classId: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true },
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true }
  },
  { timestamps: true }
);

classSubjectSchema.index({ classId: 1, subjectId: 1 }, { unique: true });

export const ClassSubject = mongoose.model("ClassSubject", classSubjectSchema);

// Step 2b: a teacher is assigned to a class-subject that already exists
// (see ClassSubject above). Only one teacher per class-subject is allowed,
// and that teacher must already be eligible for the subject (SubjectTeacher).
const classSubjectTeacherSchema = new mongoose.Schema(
  {
    instituteId: { type: mongoose.Schema.Types.ObjectId, ref: "Institute", required: true },
    academicYearId: { type: mongoose.Schema.Types.ObjectId, ref: "AcademicYear", required: true },
    classId: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true },
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true }
  },
  { timestamps: true }
);

classSubjectTeacherSchema.index({ classId: 1, subjectId: 1, academicYearId: 1 }, { unique: true });

export const ClassSubjectTeacher = mongoose.model("ClassSubjectTeacher", classSubjectTeacherSchema);

const sectionClassTeacherSchema = new mongoose.Schema(
  {
    instituteId: { type: mongoose.Schema.Types.ObjectId, ref: "Institute", required: true },
    academicYearId: { type: mongoose.Schema.Types.ObjectId, ref: "AcademicYear", required: true },
    sectionId: { type: mongoose.Schema.Types.ObjectId, ref: "Section", required: true },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true }
  },
  { timestamps: true }
);

sectionClassTeacherSchema.index({ sectionId: 1, academicYearId: 1 }, { unique: true });

export const SectionClassTeacher = mongoose.model("SectionClassTeacher", sectionClassTeacherSchema);

const sectionSubjectTeacherSchema = new mongoose.Schema(
  {
    instituteId: { type: mongoose.Schema.Types.ObjectId, ref: "Institute", required: true },
    academicYearId: { type: mongoose.Schema.Types.ObjectId, ref: "AcademicYear", required: true },
    sectionId: { type: mongoose.Schema.Types.ObjectId, ref: "Section", required: true },
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true }
  },
  { timestamps: true }
);

sectionSubjectTeacherSchema.index({ sectionId: 1, subjectId: 1 }, { unique: true });

export const SectionSubjectTeacher = mongoose.model("SectionSubjectTeacher", sectionSubjectTeacherSchema);
