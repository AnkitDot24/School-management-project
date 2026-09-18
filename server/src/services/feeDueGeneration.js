import { StudentFeeDue } from "../models/index.js";

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function addDays(d, days) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return startOfDay(x);
}

function monthKey(y, m) {
  return `${y}-${String(m + 1).padStart(2, "0")}`;
}

/** Calendar months overlapping [yearStart, yearEnd] */
function monthlyPeriods(yearStart, yearEnd) {
  const periods = [];
  let cur = startOfDay(new Date(yearStart.getFullYear(), yearStart.getMonth(), 1));
  const end = endOfDay(yearEnd);
  while (cur <= end) {
    const periodStart = cur < yearStart ? startOfDay(yearStart) : startOfDay(cur);
    const monthEnd = endOfDay(new Date(cur.getFullYear(), cur.getMonth() + 1, 0));
    const periodEnd = monthEnd > end ? end : monthEnd;
    periods.push({
      periodKey: monthKey(cur.getFullYear(), cur.getMonth()),
      periodStart,
      periodEnd,
      dueDate: periodStart
    });
    cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
  }
  return periods;
}

function splitYearIntoChunks(yearStart, yearEnd, chunkCount, keyFn) {
  const totalMs = yearEnd.getTime() - yearStart.getTime() + 1;
  const chunkMs = Math.floor(totalMs / chunkCount);
  const periods = [];
  for (let i = 0; i < chunkCount; i++) {
    const periodStart = i === 0 ? startOfDay(yearStart) : startOfDay(new Date(yearStart.getTime() + i * chunkMs));
    const periodEnd =
      i === chunkCount - 1 ? endOfDay(yearEnd) : endOfDay(new Date(yearStart.getTime() + (i + 1) * chunkMs - 1));
    periods.push({
      periodKey: keyFn(i, periodStart),
      periodStart,
      periodEnd,
      dueDate: periodStart
    });
  }
  return periods;
}

/**
 * @param {import("../models/FeeStructure.js").StudentFeeEnrollment} enrollment - plain or doc
 * @param {{ startDate: Date, endDate: Date }} academicYear
 * @param {{ dueDateOffsetDays?: number }} opts
 */
export function buildDuePeriods(enrollment, academicYear, opts = {}) {
  const offset = Number(opts.dueDateOffsetDays || 0);
  const yearStart = startOfDay(academicYear.startDate);
  const yearEnd = endOfDay(academicYear.endDate);
  const cycle = enrollment.billingCycle;

  let periods = [];
  if (cycle === "one_time") {
    periods = [
      {
        periodKey: "once",
        periodStart: yearStart,
        periodEnd: yearEnd,
        dueDate: addDays(yearStart, offset)
      }
    ];
  } else if (cycle === "monthly") {
    periods = monthlyPeriods(yearStart, yearEnd).map((p) => ({
      ...p,
      dueDate: addDays(p.periodStart, offset)
    }));
  } else if (cycle === "quarterly") {
    periods = splitYearIntoChunks(yearStart, yearEnd, 4, (i, ps) => {
      const q = Math.floor(ps.getMonth() / 3) + 1;
      return `${ps.getFullYear()}-Q${q}-${i}`;
    }).map((p) => ({ ...p, dueDate: addDays(p.periodStart, offset) }));
  } else if (cycle === "half_yearly") {
    periods = splitYearIntoChunks(yearStart, yearEnd, 2, (i, ps) => `${ps.getFullYear()}-H${i + 1}`).map((p) => ({
      ...p,
      dueDate: addDays(p.periodStart, offset)
    }));
  } else if (cycle === "annual") {
    periods = [
      {
        periodKey: String(yearStart.getFullYear()),
        periodStart: yearStart,
        periodEnd: yearEnd,
        dueDate: addDays(yearStart, offset)
      }
    ];
  } else {
    throw new Error(`Unknown billing cycle: ${cycle}`);
  }
  return periods;
}

/**
 * Idempotent: skips existing periodKey for enrollment.
 * @returns {{ created: import("mongoose").Document[], skipped: number }}
 */
export async function generateDuesForEnrollment(enrollmentDoc, academicYear, opts = {}) {
  const periods = buildDuePeriods(enrollmentDoc, academicYear, opts);
  const created = [];
  let skipped = 0;
  for (const p of periods) {
    const exists = await StudentFeeDue.findOne({
      instituteId: enrollmentDoc.instituteId,
      enrollmentId: enrollmentDoc._id,
      periodKey: p.periodKey
    });
    if (exists) {
      skipped++;
      continue;
    }
    const due = await StudentFeeDue.create({
      instituteId: enrollmentDoc.instituteId,
      enrollmentId: enrollmentDoc._id,
      studentId: enrollmentDoc.studentId,
      feeStructureId: enrollmentDoc.feeStructureId,
      periodKey: p.periodKey,
      periodStart: p.periodStart,
      periodEnd: p.periodEnd,
      dueDate: p.dueDate,
      gross: enrollmentDoc.gross,
      discountAmount: enrollmentDoc.discountAmount,
      payable: enrollmentDoc.payable,
      paidAmount: 0,
      status: "pending"
    });
    created.push(due);
  }
  return { created, skipped };
}
