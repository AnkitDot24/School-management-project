export function roundMoney(n) {
  return Math.round(Number(n) * 100) / 100;
}

/** @param {{ amount: number }[]} components */
export function sumGross(components) {
  return roundMoney(components.reduce((s, c) => s + Number(c.amount || 0), 0));
}

/**
 * @param {number} gross
 * @param {"fixed"|"percent"} discountType
 * @param {number} discountValue
 * @param {number|null|undefined} maxDiscountCap
 */
export function computeDiscountAndPayable(gross, discountType, discountValue, maxDiscountCap) {
  const g = roundMoney(gross);
  if (g < 0) throw new Error("Gross cannot be negative");
  let rawDiscount = 0;
  if (discountType === "percent") {
    rawDiscount = roundMoney((g * Number(discountValue || 0)) / 100);
  } else {
    rawDiscount = roundMoney(Number(discountValue || 0));
  }
  const cap = maxDiscountCap != null && maxDiscountCap !== "" ? Number(maxDiscountCap) : Infinity;
  const discountAmount = roundMoney(Math.min(rawDiscount, cap, g));
  const payable = roundMoney(g - discountAmount);
  if (payable < 0) throw new Error("Payable cannot be negative");
  return { gross: g, discountAmount, payable };
}
