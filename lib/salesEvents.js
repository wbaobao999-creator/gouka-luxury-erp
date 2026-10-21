import { inAccountingPeriod } from "./financialMath.js";

const SALE_STATUSES = new Set([
  "销售准备", "已成交", "已发货", "已签收", "已回款", "已完成", "已取消", "已退款"
]);
const AMOUNT_KEYS = [
  "grossTaxIncludedJpy", "refundJpy", "netSaleTaxIncludedJpy", "revenueExTaxJpy",
  "outputConsumptionTaxJpy", "platformFeeJpy", "platformFeeExTaxJpy",
  "shippingFeeJpy", "adjustmentJpy", "inventoryCostJpy", "profitJpy"
];

// Saved sales status wins, then flat salesStatus, then recognized flat status.
// Never interpret arbitrary inventory statuses as sales statuses.
export function canonicalSaleStatus(item = {}, saved = {}) {
  for (const value of [saved.salesStatus, item.salesStatus, item.status]) {
    const status = typeof value === "string" ? value.trim() : "";
    if (status === "已售出") return "已成交";
    if (SALE_STATUSES.has(status)) return status;
  }
  const record = { ...item, ...saved };
  if (Number(record.refundJpy) > 0) return "已退款";
  if (Number(record.finalDepositJpy) > 0) return "已回款";
  if (Number(record.shippingFeeJpy) > 0) return "已发货";
  if (Number(record.salePriceTaxIncludedJpy) > 0) return "已成交";
  return "销售准备";
}

function dateOnly(value) {
  // Date-input values only: no timezone conversion or invented historical dates.
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? value : null;
}

function emptyTotals() {
  return Object.fromEntries(AMOUNT_KEYS.map((key) => [key, 0]));
}

function addTotals(target, source, scale = 1) {
  for (const key of AMOUNT_KEYS) target[key] += source[key] * scale;
  return target;
}

/** Physical stock only; financial cancellation is never evidence of receipt.
 * asOf is an optional YYYY-MM-DD. A returned item without a valid returnDate
 * remains unavailable for historical reporting and needs review.
 */
export function saleStockDisposition(record = {}, { asOf } = {}) {
  if (asOf !== undefined && !dateOnly(asOf)) throw new RangeError("Invalid asOf date");
  const disposition = record.stockDisposition;
  const returnDate = dateOnly(record.returnDate);
  const issues = [];
  let state = "unknown";
  let available = false;
  if (disposition === "not_shipped") {
    state = disposition;
    available = true;
  } else if (disposition === "pending_return") {
    state = disposition;
  } else if (disposition === "returned") {
    if (!returnDate) issues.push("missing_or_invalid_return_date");
    state = returnDate && (!asOf || returnDate <= asOf) ? "returned" : "pending_return";
    available = state === "returned";
  } else {
    issues.push(disposition ? "invalid_stock_disposition" : "missing_stock_disposition");
  }
  return { state, available, returnDate, issues };
}

/** Pure event ledger. Original input is retained verbatim in `original`.
 * Fees/shipping/adjustment belong to saleDate (no separate dates in this schema).
 * Refunds belong to refundDate; confirmed returns restore cost on returnDate.
 * Cancellation reverses recognized financial amounts on cancellationDate to
 * preserve the existing zero-cumulative cancellation policy, independently of
 * physical stock. Undated cancellations produce no dated financial events.
 * Null-dated events are included only in cumulative totals, never a calendar.
 * No rounding is applied; round only at the UI/export boundary.
 */
export function salesEvents(record = {}, { taxRate = 0.1 } = {}) {
  if (!Number.isFinite(taxRate) || taxRate < 0) throw new RangeError("Invalid taxRate");
  const issues = [];
  const original = { ...record };
  const status = canonicalSaleStatus(record);
  const stock = saleStockDisposition(record);
  const cancelled = status === "已取消";
  const returnCase = cancelled || status === "已退款" || Number(record.refundJpy) > 0;
  const number = (key) => {
    const raw = record[key];
    if (raw === undefined || raw === null || raw === "") return 0;
    const value = typeof raw === "number" || typeof raw === "string" ? Number(raw) : NaN;
    if (!Number.isFinite(value)) {
      issues.push(`invalid_amount:${key}`);
      return 0;
    }
    if (value < 0 && key !== "adjustmentJpy") {
      issues.push(`negative_amount:${key}`);
      return 0;
    }
    return value;
  };
  const gross = number("salePriceTaxIncludedJpy");
  const fee = number("platformFeeJpy");
  const shipping = number("shippingFeeJpy");
  const adjustment = number("adjustmentJpy");
  const cost = number("inventoryCostJpy");
  const saleCost = returnCase && record.stockDisposition === "not_shipped" ? 0 : cost;
  const refund = number("refundJpy");
  const saleDate = dateOnly(record.saleDate);
  const refundDate = dateOnly(record.refundDate);
  const cancellationDate = dateOnly(record.cancellationDate);
  const events = [];
  const push = (type, date, amounts) => events.push({ type, date, ...emptyTotals(), ...amounts });
  if (cancelled || refund || record.stockDisposition) issues.push(...stock.issues);
  if (cancelled && !cancellationDate) {
    issues.push("undated_cancellation");
    return { original, status, cancelled, events, issues, stock };
  }
  if (!saleDate) issues.push("missing_or_invalid_sale_date");
  if (cancelled && cancellationDate && saleDate && cancellationDate < saleDate) {
    issues.push("cancellation_before_sale");
    return { original, status, cancelled, events, issues, stock };
  }
  const divisor = 1 + taxRate;
  push("sale", saleDate, {
    grossTaxIncludedJpy: gross, netSaleTaxIncludedJpy: gross,
    revenueExTaxJpy: gross / divisor, outputConsumptionTaxJpy: gross - gross / divisor,
    platformFeeJpy: fee, platformFeeExTaxJpy: fee / divisor,
    shippingFeeJpy: shipping, adjustmentJpy: adjustment, inventoryCostJpy: saleCost,
    profitJpy: gross / divisor - fee / divisor - shipping + adjustment - saleCost
  });
  const allowed = (date, kind) => {
    if (!date) {
      issues.push(`missing_or_invalid_${kind}_date`);
      return !cancelled;
    }
    if (saleDate && date < saleDate) {
      issues.push(`${kind}_before_sale`);
      return false;
    }
    if (cancelled && date > cancellationDate) {
      issues.push(`${kind}_after_cancellation`);
      return false;
    }
    return true;
  };
  if (refund && allowed(refundDate, "refund")) {
    push("refund", refundDate, {
      refundJpy: refund, netSaleTaxIncludedJpy: -refund,
      revenueExTaxJpy: -refund / divisor,
      outputConsumptionTaxJpy: -(refund - refund / divisor), profitJpy: -refund / divisor
    });
  }
  // A missing return date never restores cost, even in cumulative reporting.
  if (returnCase && record.stockDisposition === "returned" && stock.returnDate
    && (!cancelled || stock.returnDate <= cancellationDate) && allowed(stock.returnDate, "return")) {
    push("return", stock.returnDate, { inventoryCostJpy: -cost, profitJpy: cost });
  }
  if (cancelled) {
    if (!saleDate) {
      // Without a sale date, do not allocate the reversal to a known month.
      events.length = 0;
      issues.push("unallocatable_cancellation");
    } else {
      const reversal = emptyTotals();
      for (const event of events) addTotals(reversal, event, -1);
      push("cancellation", cancellationDate, reversal);
    }
  }
  events.sort((a, b) => (a.date || "9999").localeCompare(b.date || "9999"));
  return { original, status, cancelled, events, issues, stock };
}

function validatePeriod(period) {
  for (const key of ["from", "to"]) {
    if (period[key] && !dateOnly(period[key])) throw new RangeError(`Invalid period ${key}`);
  }
  if (period.from && period.to && period.from > period.to) throw new RangeError("Reversed period");
}

function summarize(records, period, options, cohort) {
  validatePeriod(period);
  const totals = emptyTotals();
  const issues = [];
  records.forEach((record, index) => {
    if (cohort && !inAccountingPeriod(dateOnly(record.saleDate) || "", period)) return;
    const ledger = salesEvents(record, options);
    for (const code of ledger.issues) issues.push({ index, code });
    for (const event of ledger.events) {
      if (cohort || (event.date && inAccountingPeriod(event.date, period))) addTotals(totals, event);
    }
  });
  return { basis: cohort ? "sale_cohort_cumulative" : "calendar_events", totals, issues };
}

/** Example: calendarSalesTotals(records, { from: "2026-03-01", to: "2026-03-31" }). */
export function calendarSalesTotals(records, period = {}, options = {}) {
  return summarize(records, period, options, false);
}

/** Select by saleDate, then include ALL subsequent known events, not just that
 * month. Example: saleCohortTotals(records, { from: "2026-02-01", to: "2026-02-28" }).
 * No cutoff is implied; use calendarSalesTotals for dated period movements.
 */
export function saleCohortTotals(records, salePeriod = {}, options = {}) {
  return summarize(records, salePeriod, options, true);
}
