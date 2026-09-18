import mongoose from "mongoose";

const examSchema = new mongoose.Schema(
  {
    instituteId: { type: mongoose.Schema.Types.ObjectId, ref: "Institute", required: true },
    name: { type: String, required: true },
    academicYearId: { type: mongoose.Schema.Types.ObjectId, ref: "AcademicYear", required: true },
    classId: { type: mongoose.Schema.Types.ObjectId, ref: "Class", default: null },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null }
  },
  { timestamps: true }
);

export const Exam = mongoose.model("Exam", examSchema);

const examMarkSchema = new mongoose.Schema(
  {
    instituteId: { type: mongoose.Schema.Types.ObjectId, ref: "Institute", required: true },
    examId: { type: mongoose.Schema.Types.ObjectId, ref: "Exam", required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true },
    marks: { type: Number, required: true },
    maxMarks: { type: Number, required: true, default: 100 },
    grade: { type: String, default: "" }
  },
  { timestamps: true }
);

examMarkSchema.index({ examId: 1, studentId: 1, subjectId: 1 }, { unique: true });

export const ExamMark = mongoose.model("ExamMark", examMarkSchema);
