import { Payment, FeeRefund } from "../models/index.js";
import { roundMoney } from "./feeCalculation.js";

export function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Net paid on a due from payments minus refunds linked to those payments for this due */
export async function netPaidForDue(feeDueId) {
  const payments = await Payment.find({ feeDueId });
  const paymentIds = payments.map((p) => p._id);
  let paid = payments.reduce((s, p) => s + p.amount, 0);
  if (paymentIds.length) {
    const refunds = await FeeRefund.find({ feeDueId, paymentId: { $in: paymentIds } });
    paid -= refunds.reduce((s, r) => s + r.amount, 0);
  }
  return roundMoney(paid);
}

export function computeDueStatus(payable, paid, dueDate, storedStatus) {
  if (storedStatus === "waived" || storedStatus === "cancelled") return storedStatus;
  const balance = roundMoney(payable - paid);
  if (balance <= 0.001) return "paid";
  if (paid > 0.001) {
    if (dueDate && startOfToday() > new Date(dueDate)) return "overdue";
    return "partial";
  }
  if (dueDate && startOfToday() > new Date(dueDate)) return "overdue";
  return "pending";
}

export async function enrichDue(dueDoc) {
  const paid = await netPaidForDue(dueDoc._id);
  const payable = roundMoney(dueDoc.payable);
  const balance = roundMoney(Math.max(0, payable - paid));
  const status = computeDueStatus(payable, paid, dueDoc.dueDate, dueDoc.status);
  const obj = dueDoc.toObject ? dueDoc.toObject() : { ...dueDoc };
  return { ...obj, paid, balance, status };
}

export async function syncDuePaidAmount(dueDoc) {
  const paid = await netPaidForDue(dueDoc._id);
  const status = computeDueStatus(dueDoc.payable, paid, dueDoc.dueDate, dueDoc.status);
  dueDoc.paidAmount = paid;
  if (dueDoc.status !== "waived" && dueDoc.status !== "cancelled") {
    dueDoc.status = status;
  }
  await dueDoc.save();
  return dueDoc;
}
