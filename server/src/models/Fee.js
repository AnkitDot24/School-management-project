import mongoose from "mongoose";

const feeAssignmentSchema = new mongoose.Schema(
  {
    instituteId: { type: mongoose.Schema.Types.ObjectId, ref: "Institute", required: true },
    academicYearId: { type: mongoose.Schema.Types.ObjectId, ref: "AcademicYear", default: null },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    head: { type: String, required: true },
    gross: { type: Number, required: true, min: 0 },
    discount: { type: Number, required: true, min: 0, default: 0 },
    payable: { type: Number, required: true, min: 0 }
  },
  { timestamps: true }
);

export const FeeAssignment = mongoose.model("FeeAssignment", feeAssignmentSchema);

const paymentSchema = new mongoose.Schema(
  {
    instituteId: { type: mongoose.Schema.Types.ObjectId, ref: "Institute", required: true },
    feeAssignmentId: { type: mongoose.Schema.Types.ObjectId, ref: "FeeAssignment", default: null },
    feeDueId: { type: mongoose.Schema.Types.ObjectId, ref: "StudentFeeDue", default: null },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    amount: { type: Number, required: true, min: 0.01 },
    method: { type: String, default: "cash" },
    receiptNo: { type: String, required: true },
    collectedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    status: { type: String, enum: ["success", "failed"], default: "success" },
    transactionType: { type: String, enum: ["payment"], default: "payment" },
    notes: { type: String, default: "" }
  },
  { timestamps: true }
);

export const Payment = mongoose.model("Payment", paymentSchema);
