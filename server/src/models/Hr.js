import mongoose from "mongoose";

const leaveSchema = new mongoose.Schema(
  {
    instituteId: { type: mongoose.Schema.Types.ObjectId, ref: "Institute", required: true },
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
    fromDate: { type: Date, required: true },
    toDate: { type: Date, required: true },
    reason: { type: String, required: true },
    type: { type: String, default: "" },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    decidedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

export const Leave = mongoose.model("Leave", leaveSchema);

const staffAttendanceSchema = new mongoose.Schema(
  {
    instituteId: { type: mongoose.Schema.Types.ObjectId, ref: "Institute", required: true },
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
    date: { type: String, required: true },
    status: { type: String, enum: ["present", "absent", "leave"], required: true },
    checkInAt: { type: Date, default: null },
    checkOutAt: { type: Date, default: null }
  },
  { timestamps: true }
);

staffAttendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });

export const StaffAttendance = mongoose.model("StaffAttendance", staffAttendanceSchema);
