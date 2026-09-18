import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema(
  {
    instituteId: { type: mongoose.Schema.Types.ObjectId, ref: "Institute", required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    date: { type: String, required: true },
    punchInAt: { type: Date, default: null },
    punchOutAt: { type: Date, default: null }
  },
  { timestamps: true }
);

attendanceSchema.index({ studentId: 1, date: 1 }, { unique: true });

export const AttendanceDay = mongoose.model("AttendanceDay", attendanceSchema);
