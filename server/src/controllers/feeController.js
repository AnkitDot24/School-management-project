import { body, param } from "express-validator";
import { FeeAssignment, Payment } from "../models/Fee.js";
import { StudentFeeDue, StudentFeeEnrollment, FeeStructure, FeeRefund, FeeTransaction } from "../models/FeeStructure.js";
import { Student, Institute } from "../models/index.js";
import { ok, created, fail } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { writeAudit } from "../utils/audit.js";
import { validate } from "../middleware/validate.js";
import { notDeleted } from "../utils/softDelete.js";
import { enrichDue, netPaidForDue, syncDuePaidAmount } from "../services/feeStatus.js";
import { nextReceiptNo, nextRefundReceiptNo } from "../services/feeReceipt.js";
import { roundMoney } from "../services/feeCalculation.js";

const iid = (req) => req.institute._id;

async function legacyPaidSum(assignmentId) {
  const rows = await Payment.aggregate([
    { $match: { feeAssignmentId: assignmentId } },
    { $group: { _id: null, total: { $sum: "$amount" } } }
  ]);
  return rows[0]?.total || 0;
}

function withDue(assignment, paid) {
  const obj = assignment.toObject ? assignment.toObject() : assignment;
  obj.paid = paid;
  obj.due = Math.max(0, Number(obj.payable) - paid);
  return obj;
}

/** @deprecated legacy flat assignments */
export const assignValidators = [
  body("studentId").isMongoId(),
  body("academicYearId").optional().isMongoId(),
  body("head").trim().notEmpty(),
  body("gross").isFloat({ min: 0 }),
  body("discount").optional().isFloat({ min: 0 }),
  validate
];

export const createAssignment = asyncHandler(async (req, res) => {
  const student = await Student.findOne(notDeleted({ _id: req.body.studentId, instituteId: iid(req) }));
  if (!student) return fail(res, 422, "Student not found or deleted");
  const gross = Number(req.body.gross);
  const discount = Number(req.body.discount || 0);
  if (discount > gross) return fail(res, 422, "Discount cannot exceed gross");
  const payable = gross - discount;
  const doc = await FeeAssignment.create({
    instituteId: iid(req),
    studentId: student._id,
    academicYearId: req.body.academicYearId || student.academicYearId || null,
    head: req.body.head,
    gross,
    discount,
    payable
  });
  await writeAudit(req, { action: "fees.assign", entity: "FeeAssignment", entityId: doc._id, after: doc });
  return created(res, withDue(doc, 0));
});

export const listAssignments = asyncHandler(async (req, res) => {
  const filter = { instituteId: iid(req) };
  if (req.query.studentId) filter.studentId = req.query.studentId;
  const items = await FeeAssignment.find(filter).populate("studentId").sort({ createdAt: -1 });
  const out = [];
  for (const a of items) out.push(withDue(a, await legacyPaidSum(a._id)));
  return ok(res, out);
});

export const payValidators = [
  body("amount").isFloat({ min: 0.01 }),
  body("feeDueId").optional().isMongoId(),
  body("feeAssignmentId").optional().isMongoId(),
  body("method").optional().trim(),
  body("notes").optional().trim(),
  validate
];

export const collectPayment = asyncHandler(async (req, res) => {
  const amount = Number(req.body.amount);

  if (req.body.feeDueId) {
    const due = await StudentFeeDue.findOne({ _id: req.body.feeDueId, instituteId: iid(req) });
    if (!due) return fail(res, 404, "Fee due not found");
    if (due.status === "cancelled" || due.status === "waived") {
      return fail(res, 422, "Cannot collect on cancelled or waived due");
    }
    const student = await Student.findOne(notDeleted({ _id: due.studentId, instituteId: iid(req) }));
    if (!student) return fail(res, 422, "Student is deleted; cannot collect");

    const paid = await netPaidForDue(due._id);
    const balance = roundMoney(due.payable - paid);
    if (amount > balance + 0.0001) return fail(res, 422, "Payment cannot exceed balance");

    const receiptNo = await nextReceiptNo(iid(req));
    const payment = await Payment.create({
      instituteId: iid(req),
      feeDueId: due._id,
      studentId: due.studentId,
      amount,
      method: req.body.method || "cash",
      receiptNo,
      notes: req.body.notes || "",
      collectedBy: req.user._id
    });

    const balanceAfter = roundMoney(balance - amount);
    await FeeTransaction.create({
      instituteId: iid(req),
      studentId: due.studentId,
      feeDueId: due._id,
      kind: "payment",
      amount,
      paymentId: payment._id,
      balanceAfterDue: balanceAfter
    });

    await syncDuePaidAmount(due);
    await writeAudit(req, { action: "fees.collect", entity: "Payment", entityId: payment._id, after: payment });
    return created(res, { payment, receipt: { receiptNo, amount }, balance: balanceAfter });
  }

  if (!req.body.feeAssignmentId) return fail(res, 422, "feeDueId or feeAssignmentId required");

  const assignment = await FeeAssignment.findOne({ _id: req.body.feeAssignmentId, instituteId: iid(req) });
  if (!assignment) return fail(res, 404, "Fee assignment not found");
  const student = await Student.findOne(notDeleted({ _id: assignment.studentId, instituteId: iid(req) }));
  if (!student) return fail(res, 422, "Student is deleted; cannot collect");
  const paid = await legacyPaidSum(assignment._id);
  const due = assignment.payable - paid;
  if (amount > due + 0.0001) return fail(res, 422, "Payment cannot exceed due");
  const receiptNo = await nextReceiptNo(iid(req));
  const payment = await Payment.create({
    instituteId: iid(req),
    feeAssignmentId: assignment._id,
    studentId: assignment.studentId,
    amount,
    method: req.body.method || "cash",
    receiptNo,
    collectedBy: req.user._id
  });
  await writeAudit(req, { action: "fees.collect", entity: "Payment", entityId: payment._id, after: payment });
  return created(res, { payment, receipt: { receiptNo, amount }, due: due - amount });
});

export const getPayment = asyncHandler(async (req, res) => {
  const payment = await Payment.findOne({ _id: req.params.id, instituteId: iid(req) })
    .populate("studentId feeDueId feeAssignmentId");
  if (!payment) return fail(res, 404, "Payment not found");
  return ok(res, payment);
});

export const getReceipt = asyncHandler(async (req, res) => {
  const payment = await Payment.findOne({ _id: req.params.paymentId, instituteId: iid(req) })
    .populate("studentId feeDueId");
  if (!payment) return fail(res, 404, "Payment not found");
  const institute = await Institute.findById(iid(req));
  let dueDetail = null;
  if (payment.feeDueId) {
    const dueDoc = payment.feeDueId._id ? payment.feeDueId : await StudentFeeDue.findById(payment.feeDueId);
    dueDetail = await enrichDue(dueDoc);
    const enrollId = dueDoc.enrollmentId || dueDetail.enrollmentId;
    const enrollment = enrollId ? await StudentFeeEnrollment.findById(enrollId) : null;
    if (enrollment) dueDetail.components = enrollment.components;
  }
  return ok(res, {
    receiptNo: payment.receiptNo,
    amount: payment.amount,
    method: payment.method,
    paidAt: payment.createdAt,
    notes: payment.notes,
    institute: { name: institute?.name, code: institute?.code, address: institute?.address, phone: institute?.phone },
    student: payment.studentId,
    due: dueDetail
  });
});

export const refundValidators = [
  body("amount").isFloat({ min: 0.01 }),
  body("reason").optional().trim(),
  validate
];

export const refundPayment = asyncHandler(async (req, res) => {
  const payment = await Payment.findOne({ _id: req.params.id, instituteId: iid(req) });
  if (!payment) return fail(res, 404, "Payment not found");
  if (!payment.feeDueId) return fail(res, 422, "Refunds only supported for due-based payments");

  const amount = Number(req.body.amount);
  const existingRefunds = await FeeRefund.find({ paymentId: payment._id });
  const refunded = existingRefunds.reduce((s, r) => s + r.amount, 0);
  const refundable = roundMoney(payment.amount - refunded);
  if (amount > refundable + 0.0001) return fail(res, 422, "Refund exceeds refundable amount on payment");

  const due = await StudentFeeDue.findById(payment.feeDueId);
  if (!due) return fail(res, 404, "Fee due not found");

  const refundReceiptNo = await nextRefundReceiptNo(iid(req));
  const refund = await FeeRefund.create({
    instituteId: iid(req),
    paymentId: payment._id,
    feeDueId: due._id,
    studentId: payment.studentId,
    amount,
    reason: req.body.reason || "",
    refundReceiptNo,
    createdBy: req.user._id
  });

  const paidAfter = await netPaidForDue(due._id);
  await FeeTransaction.create({
    instituteId: iid(req),
    studentId: due.studentId,
    feeDueId: due._id,
    kind: "refund",
    amount,
    refundId: refund._id,
    balanceAfterDue: roundMoney(due.payable - paidAfter)
  });

  await syncDuePaidAmount(due);
  await writeAudit(req, { action: "fees.refund", entity: "FeeRefund", entityId: refund._id, after: refund });
  return created(res, { refund, refundReceiptNo });
});

export const dashboard = asyncHandler(async (req, res) => {
  const dues = await StudentFeeDue.find({ instituteId: iid(req) });
  let gross = 0;
  let discount = 0;
  let payable = 0;
  let collected = 0;
  let refunded = 0;
  const statusCounts = { pending: 0, partial: 0, paid: 0, overdue: 0, waived: 0, cancelled: 0 };

  for (const d of dues) {
    gross += d.gross;
    discount += d.discountAmount;
    payable += d.payable;
    const row = await enrichDue(d);
    statusCounts[row.status] = (statusCounts[row.status] || 0) + 1;
    collected += row.paid;
  }

  const refundRows = await FeeRefund.find({ instituteId: iid(req) });
  refunded = refundRows.reduce((s, r) => s + r.amount, 0);

  const legacyAssignments = await FeeAssignment.find({ instituteId: iid(req) });
  let legacyPayable = 0;
  let legacyPaid = 0;
  for (const a of legacyAssignments) {
    legacyPayable += a.payable;
    legacyPaid += await legacyPaidSum(a._id);
  }

  const totalPayable = payable + legacyPayable;
  const totalPaid = collected + legacyPaid;
  const outstanding = roundMoney(totalPayable - totalPaid);

  return ok(res, {
    gross: roundMoney(gross),
    discount: roundMoney(discount),
    payable: roundMoney(payable),
    paid: roundMoney(collected),
    refunded: roundMoney(refunded),
    due: outstanding,
    outstanding,
    statusCounts,
    dueCount: dues.length,
    assignmentCount: legacyAssignments.length,
    legacy: { payable: legacyPayable, paid: legacyPaid, due: legacyPayable - legacyPaid }
  });
});

export const reports = asyncHandler(async (req, res) => {
  const filter = { instituteId: iid(req), feeDueId: { $ne: null } };
  if (req.query.from || req.query.to) {
    filter.createdAt = {};
    if (req.query.from) filter.createdAt.$gte = new Date(req.query.from);
    if (req.query.to) filter.createdAt.$lte = new Date(req.query.to);
  }
  const payments = await Payment.find(filter).populate("studentId feeDueId").sort({ createdAt: -1 });
  return ok(res, payments);
});

export const reportsCollections = reports;

export const reportsOutstanding = asyncHandler(async (req, res) => {
  const filter = { instituteId: iid(req) };
  if (req.query.studentId) filter.studentId = req.query.studentId;
  const dues = await StudentFeeDue.find(filter).populate("studentId feeStructureId").sort({ dueDate: 1 });
  const out = [];
  for (const d of dues) {
    const row = await enrichDue(d);
    if (row.balance <= 0) continue;
    if (req.query.overdue === "true" && row.status !== "overdue") continue;
    out.push(row);
  }
  return ok(res, out);
});

export const reportsStructureSummary = asyncHandler(async (req, res) => {
  const structures = await FeeStructure.find({ instituteId: iid(req) });
  const summary = [];
  for (const s of structures) {
    const enrollments = await StudentFeeEnrollment.countDocuments({
      instituteId: iid(req),
      feeStructureId: s._id,
      status: "active"
    });
    const dues = await StudentFeeDue.find({ instituteId: iid(req), feeStructureId: s._id });
    let expected = 0;
    let collected = 0;
    for (const d of dues) {
      expected += d.payable;
      collected += await netPaidForDue(d._id);
    }
    summary.push({
      structure: s,
      enrolledCount: enrollments,
      expected: roundMoney(expected),
      collected: roundMoney(collected),
      outstanding: roundMoney(expected - collected)
    });
  }
  return ok(res, summary);
});

export const paymentIdParam = [param("id").isMongoId(), validate];
export const receiptParam = [param("paymentId").isMongoId(), validate];
