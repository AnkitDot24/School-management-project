import mongoose from "mongoose";

const academicYearSchema = new mongoose.Schema(
  {
    instituteId: { type: mongoose.Schema.Types.ObjectId, ref: "Institute", required: true },
    name: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    isCurrent: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export const AcademicYear = mongoose.model("AcademicYear", academicYearSchema);

const classSchema = new mongoose.Schema(
  {
    instituteId: { type: mongoose.Schema.Types.ObjectId, ref: "Institute", required: true },
    academicYearId: { type: mongoose.Schema.Types.ObjectId, ref: "AcademicYear", required: true },
    name: { type: String, required: true },
    order: { type: Number, default: 0 }
  },
  { timestamps: true }
);

export const ClassModel = mongoose.model("Class", classSchema);

const sectionSchema = new mongoose.Schema(
  {
    instituteId: { type: mongoose.Schema.Types.ObjectId, ref: "Institute", required: true },
    classId: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true },
    academicYearId: { type: mongoose.Schema.Types.ObjectId, ref: "AcademicYear", required: true },
    name: { type: String, required: true },
    capacity: { type: Number, default: 40 }
  },
  { timestamps: true }
);

export const Section = mongoose.model("Section", sectionSchema);

const subjectSchema = new mongoose.Schema(
  {
    instituteId: { type: mongoose.Schema.Types.ObjectId, ref: "Institute", required: true },
    name: { type: String, required: true },
    code: { type: String, required: true }
  },
  { timestamps: true }
);

export const Subject = mongoose.model("Subject", subjectSchema);

// Step 1 of academic setup: an active teacher (belonging to this institute)
// is made eligible to teach a subject. A teacher may teach many subjects,
// but the same subject-teacher pair cannot be added twice.
const subjectTeacherSchema = new mongoose.Schema(
  {
    instituteId: { type: mongoose.Schema.Types.ObjectId, ref: "Institute", required: true },
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true }
  },
  { timestamps: true }
);

subjectTeacherSchema.index({ subjectId: 1, teacherId: 1 }, { unique: true });

export const SubjectTeacher = mongoose.model("SubjectTeacher", subjectTeacherSchema);
