export function allocateWholeYen(total, weights) {
  if (!weights.length) return [];
  const amount = Math.round(Number(total) || 0);
  const values = weights.map((x) => Math.max(0, Number(x) || 0));
  const sum = values.reduce((a, b) => a + b, 0);
  const normalized = sum > 0 ? values : values.map(() => 1);
  const denominator = sum || values.length;
  const exact = normalized.map((x) => Math.abs(amount) * x / denominator);
  const result = exact.map(Math.floor);
  const remainder = Math.abs(amount) - result.reduce((a, b) => a + b, 0);
  const order = exact.map((x, i) => ({ i, fraction: x - result[i] }))
    .sort((a, b) => b.fraction - a.fraction || a.i - b.i);
  for (let i = 0; i < remainder; i += 1) result[order[i].i] += 1;
  return result.map((x) => amount < 0 ? -x : x);
}

export function isCancelledSale(record = {}) {
  return record.salesStatus === "已取消";
}

export function salesAmounts(record = {}, rate = 0.1) {
  const cancelled = isCancelledSale(record);
  const gross = cancelled ? 0 : Number(record.salePriceTaxIncludedJpy || 0);
  const fee = cancelled ? 0 : Number(record.platformFeeJpy || 0);
  const refund = cancelled ? 0 : Number(record.refundJpy || 0);
  const netSale = gross - refund;
  const revenueExTax = netSale / (1 + rate);
  const feeExTax = fee / (1 + rate);
  return {
    grossTaxIncludedJpy: gross,
    netSaleTaxIncludedJpy: netSale,
    grossOutputTaxJpy: gross - gross / (1 + rate),
    refundTaxJpy: refund - refund / (1 + rate),
    revenueExTax,
    outputConsumptionTaxJpy: netSale - revenueExTax,
    feeTaxIncluded: fee,
    feeExTax,
    feeTaxJpy: fee - feeExTax,
    cancelled
  };
}

export function receiptState(record = {}) {
  if (isCancelledSale(record)) return Number(record.finalDepositJpy || 0) > 0 ? "已取消 / 待核退款" : "已取消";
  const expected = Number(record.expectedDepositJpy || 0);
  const actual = Number(record.finalDepositJpy || 0);
  if (actual < expected - 0.5) return actual > 0 ? "部分回款" : "未回款";
  if (actual > expected + 0.5) return "到账差额待核";
  return expected > 0 ? "已回款" : "无需回款";
}

export function inAccountingPeriod(date, period = {}) {
  if (!period.from && !period.to) return true;
  const value = String(date || "").slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
    && (!period.from || value >= period.from)
    && (!period.to || value <= period.to);
}
