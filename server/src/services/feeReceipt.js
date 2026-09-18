import { FeeReceiptCounter, Institute } from "../models/index.js";

export async function nextReceiptNo(instituteId) {
  const institute = await Institute.findById(instituteId);
  const code = institute?.code || "INST";
  const year = new Date().getFullYear();
  let counter = await FeeReceiptCounter.findOne({ instituteId });
  if (!counter) {
    counter = await FeeReceiptCounter.create({ instituteId, year, seq: 0 });
  }
  if (counter.year !== year) {
    counter.year = year;
    counter.seq = 0;
  }
  counter.seq += 1;
  await counter.save();
  return `${code}-${year}-${String(counter.seq).padStart(5, "0")}`;
}

export async function nextRefundReceiptNo(instituteId) {
  const base = await nextReceiptNo(instituteId);
  return `RF-${base}`;
}
