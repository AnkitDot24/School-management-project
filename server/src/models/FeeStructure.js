import mongoose from "mongoose";

export const BILLING_CYCLES = ["monthly", "quarterly", "half_yearly", "annual", "one_time"];

const feeStructureSchema = new mongoose.Schema(
  {
    instituteId: { type: mongoose.Schema.Types.ObjectId, ref: "Institute", required: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, default: "", trim: true },
    academicYearId: { type: mongoose.Schema.Types.ObjectId, ref: "AcademicYear", default: null },
    billingCycle: { type: String, enum: BILLING_CYCLES, required: true },
    description: { type: String, default: "" },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

feeStructureSchema.index({ instituteId: 1, name: 1 });

export const FeeStructure = mongoose.model("FeeStructure", feeStructureSchema);

const feeComponentSchema = new mongoose.Schema(
  {
    instituteId: { type: mongoose.Schema.Types.ObjectId, ref: "Institute", required: true },
    feeStructureId: { type: mongoose.Schema.Types.ObjectId, ref: "FeeStructure", required: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, default: "", trim: true },
    amount: { type: Number, required: true, min: 0 },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

feeComponentSchema.index({ feeStructureId: 1, sortOrder: 1 });

export const FeeComponent = mongoose.model("FeeComponent", feeComponentSchema);

const componentSnapshotSchema = new mongoose.Schema(
  {
    componentId: { type: mongoose.Schema.Types.ObjectId, ref: "FeeComponent" },
    name: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 }
  },
  { _id: false }
);

const studentFeeEnrollmentSchema = new mongoose.Schema(
  {
    instituteId: { type: mongoose.Schema.Types.ObjectId, ref: "Institute", required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    feeStructureId: { type: mongoose.Schema.Types.ObjectId, ref: "FeeStructure", required: true },
    academicYearId: { type: mongoose.Schema.Types.ObjectId, ref: "AcademicYear", required: true },
    components: [componentSnapshotSchema],
    discountType: { type: String, enum: ["fixed", "percent"], default: "fixed" },
    discountValue: { type: Number, default: 0, min: 0 },
    maxDiscountCap: { type: Number, default: null, min: 0 },
    gross: { type: Number, required: true, min: 0 },
    discountAmount: { type: Number, required: true, min: 0, default: 0 },
    payable: { type: Number, required: true, min: 0 },
    billingCycle: { type: String, enum: BILLING_CYCLES, required: true },
    status: { type: String, enum: ["active", "cancelled"], default: "active" }
  },
  { timestamps: true }
);

studentFeeEnrollmentSchema.index({ instituteId: 1, studentId: 1, feeStructureId: 1, academicYearId: 1 });

export const StudentFeeEnrollment = mongoose.model("StudentFeeEnrollment", studentFeeEnrollmentSchema);

const DUE_STATUSES = ["pending", "partial", "paid", "overdue", "waived", "cancelled"];

const studentFeeDueSchema = new mongoose.Schema(
  {
    instituteId: { type: mongoose.Schema.Types.ObjectId, ref: "Institute", required: true },
    enrollmentId: { type: mongoose.Schema.Types.ObjectId, ref: "StudentFeeEnrollment", required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    feeStructureId: { type: mongoose.Schema.Types.ObjectId, ref: "FeeStructure", required: true },
    periodKey: { type: String, required: true },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    dueDate: { type: Date, required: true },
    gross: { type: Number, required: true, min: 0 },
    discountAmount: { type: Number, required: true, min: 0, default: 0 },
    payable: { type: Number, required: true, min: 0 },
    paidAmount: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: DUE_STATUSES, default: "pending" }
  },
  { timestamps: true }
);

studentFeeDueSchema.index({ instituteId: 1, enrollmentId: 1, periodKey: 1 }, { unique: true });
studentFeeDueSchema.index({ instituteId: 1, studentId: 1, dueDate: 1 });

export const StudentFeeDue = mongoose.model("StudentFeeDue", studentFeeDueSchema);

const feeRefundSchema = new mongoose.Schema(
  {
    instituteId: { type: mongoose.Schema.Types.ObjectId, ref: "Institute", required: true },
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: "Payment", required: true },
    feeDueId: { type: mongoose.Schema.Types.ObjectId, ref: "StudentFeeDue", required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    amount: { type: Number, required: true, min: 0.01 },
    reason: { type: String, default: "" },
    refundReceiptNo: { type: String, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

export const FeeRefund = mongoose.model("FeeRefund", feeRefundSchema);

const feeTransactionSchema = new mongoose.Schema(
  {
    instituteId: { type: mongoose.Schema.Types.ObjectId, ref: "Institute", required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    feeDueId: { type: mongoose.Schema.Types.ObjectId, ref: "StudentFeeDue", required: true },
    kind: { type: String, enum: ["payment", "refund"], required: true },
    amount: { type: Number, required: true, min: 0.01 },
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: "Payment", default: null },
    refundId: { type: mongoose.Schema.Types.ObjectId, ref: "FeeRefund", default: null },
    balanceAfterDue: { type: Number, default: null }
  },
  { timestamps: true }
);

export const FeeTransaction = mongoose.model("FeeTransaction", feeTransactionSchema);

const receiptCounterSchema = new mongoose.Schema(
  {
    instituteId: { type: mongoose.Schema.Types.ObjectId, ref: "Institute", required: true, unique: true },
    year: { type: Number, required: true },
    seq: { type: Number, default: 0 }
  },
  { timestamps: true }
);

export const FeeReceiptCounter = mongoose.model("FeeReceiptCounter", receiptCounterSchema);
