import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { transformWithOxc, parseAst } from "vite";
import { isCancelledSale, salesAmounts, receiptState, inAccountingPeriod } from "../lib/financialMath.js";
import { canonicalSaleStatus, saleStockDisposition, salesEvents, calendarSalesTotals, saleCohortTotals } from "../lib/salesEvents.js";

const feb = { from: "2026-02-01", to: "2026-02-28" };
const mar = { from: "2026-03-01", to: "2026-03-31" };
const apr = { from: "2026-04-01", to: "2026-04-30" };
const sale = Object.freeze({
  saleDate: "2026-02-15", salePriceTaxIncludedJpy: 110000, platformFeeJpy: 11000,
  shippingFeeJpy: 1000, adjustmentJpy: 500, inventoryCostJpy: 60000,
  salesStatus: "已成交", refundJpy: 11000, refundDate: "2026-03-05",
  stockDisposition: "pending_return"
});
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`);
let checks = 0;
function test(name, run) {
  run();
  checks += 1;
  console.log(`ok ${checks} - ${name}`);
}

test("calendar movements differ from sale-cohort cumulative profit", () => {
  near(calendarSalesTotals([sale], feb).totals.profitJpy, 29500);
  near(calendarSalesTotals([sale], mar).totals.profitJpy, -10000);
  near(saleCohortTotals([sale], feb).totals.profitJpy, 19500);
  near(saleCohortTotals([sale], mar).totals.profitJpy, 0);
  near(calendarSalesTotals([sale], mar).totals.outputConsumptionTaxJpy, -1000);
  assert.equal(calendarSalesTotals([sale], feb).basis, "calendar_events");
  assert.equal(saleCohortTotals([sale], feb).basis, "sale_cohort_cumulative");
});

test("original amounts and inputs survive repeated calculations", () => {
  const before = JSON.stringify(sale);
  const ledger = salesEvents(sale);
  assert.deepEqual(ledger.original, sale);
  ledger.original.refundJpy = 0;
  calendarSalesTotals([sale], feb);
  assert.equal(JSON.stringify(sale), before);
});

test("saved status, flat salesStatus and recognized legacy status precedence", () => {
  assert.equal(canonicalSaleStatus({ status: "已取消" }), "已取消");
  assert.equal(canonicalSaleStatus({ status: "已售出" }), "已成交");
  assert.equal(canonicalSaleStatus({ status: "在库" }), "销售准备");
  assert.equal(canonicalSaleStatus({ salesStatus: "已成交", status: "已取消" }), "已成交");
  assert.equal(canonicalSaleStatus({ salesStatus: "已成交" }, { salesStatus: "已取消" }), "已取消");
  assert.equal(canonicalSaleStatus({ refundJpy: 1 }), "已退款");
});

test("dated cancellation reverses prior events without rewriting sale month", () => {
  const record = { ...sale, salesStatus: "已取消", cancellationDate: "2026-04-02" };
  near(calendarSalesTotals([record], feb).totals.profitJpy, 29500);
  near(calendarSalesTotals([record], mar).totals.profitJpy, -10000);
  near(calendarSalesTotals([record], apr).totals.profitJpy, -19500);
  for (const amount of Object.values(saleCohortTotals([record], feb).totals)) near(amount, 0);
  assert.equal(salesEvents(record).stock.available, false);
});

test("undated historical cancellation is excluded and flagged without fabricated date", () => {
  const record = { ...sale, salesStatus: "已取消" };
  const result = salesEvents(record);
  assert.deepEqual(result.events, []);
  assert.ok(result.issues.includes("undated_cancellation"));
  assert.equal(result.original.salePriceTaxIncludedJpy, 110000);
  assert.equal(result.original.cancellationDate, undefined);
  near(saleCohortTotals([record], feb).totals.profitJpy, 0);
});

test("refund alone never restores stock or inventory cost", () => {
  const record = { ...sale, salesStatus: "已退款", stockDisposition: undefined };
  assert.equal(saleStockDisposition(record).available, false);
  assert.ok(salesEvents(record).issues.includes("missing_stock_disposition"));
  near(saleCohortTotals([record], feb).totals.inventoryCostJpy, 60000);
});

test("explicit return restores cost only on its actual date", () => {
  const record = { ...sale, stockDisposition: "returned", returnDate: "2026-04-03" };
  assert.equal(saleStockDisposition(record, { asOf: "2026-03-31" }).available, false);
  assert.equal(saleStockDisposition(record, { asOf: "2026-04-03" }).available, true);
  near(calendarSalesTotals([record], apr).totals.inventoryCostJpy, -60000);
  near(calendarSalesTotals([record], apr).totals.profitJpy, 60000);
  near(saleCohortTotals([record], feb).totals.inventoryCostJpy, 0);
});

test("return after cancellation affects physical stock without duplicate financial reversal", () => {
  const record = { ...sale, salesStatus: "已取消", cancellationDate: "2026-03-10", stockDisposition: "returned", returnDate: "2026-04-03" };
  assert.equal(saleStockDisposition(record).available, true);
  assert.ok(!salesEvents(record).issues.includes("return_after_cancellation"));
  near(calendarSalesTotals([record], apr).totals.profitJpy, 0);
  near(saleCohortTotals([record], feb).totals.profitJpy, 0);
});

test("return before cancellation is reversed exactly once", () => {
  const record = { ...sale, salesStatus: "已取消", cancellationDate: "2026-04-10", stockDisposition: "returned", returnDate: "2026-03-08" };
  for (const amount of Object.values(saleCohortTotals([record], feb).totals)) near(amount, 0);
});

test("not-shipped and pending-return are distinct explicit stock decisions", () => {
  assert.equal(saleStockDisposition({ stockDisposition: "not_shipped" }).available, true);
  assert.equal(saleStockDisposition({ stockDisposition: "pending_return" }).available, false);
  assert.equal(saleStockDisposition({ stockDisposition: "returned" }).available, false);
  assert.equal(saleStockDisposition({ stockDisposition: "bogus" }).state, "unknown");
});

test("undated refunds stay cumulative but never enter a calendar month", () => {
  const record = { ...sale, refundDate: "" };
  near(calendarSalesTotals([record], feb).totals.profitJpy, 29500);
  near(calendarSalesTotals([record]).totals.profitJpy, 29500);
  near(saleCohortTotals([record], feb).totals.profitJpy, 19500);
  assert.ok(salesEvents(record).issues.includes("missing_or_invalid_refund_date"));
});

test("invalid dates, date ordering and unallocatable cancellations require review", () => {
  assert.ok(salesEvents({ ...sale, refundDate: "2026-02-30" }).issues.includes("missing_or_invalid_refund_date"));
  assert.ok(salesEvents({ ...sale, refundDate: "2026-01-01" }).issues.includes("refund_before_sale"));
  assert.ok(salesEvents({ ...sale, salesStatus: "已取消", cancellationDate: "2026-01-01" }).issues.includes("cancellation_before_sale"));
  const ledger = salesEvents({ ...sale, saleDate: "", salesStatus: "已取消", cancellationDate: "2026-04-01" });
  assert.ok(ledger.issues.includes("unallocatable_cancellation"));
  assert.deepEqual(ledger.events, []);
  assert.throws(() => calendarSalesTotals([sale], { from: "2026-02-30" }), RangeError);
  assert.throws(() => calendarSalesTotals([sale], { from: "2026-03-01", to: "2026-02-01" }), RangeError);
});

test("post-cancellation refund is flagged and cannot reopen cancelled financial amounts", () => {
  const record = { ...sale, salesStatus: "已取消", cancellationDate: "2026-02-20" };
  assert.ok(salesEvents(record).issues.includes("refund_after_cancellation"));
  near(saleCohortTotals([record], feb).totals.profitJpy, 0);
});

test("invalid amounts cannot poison totals and signed adjustments remain signed", () => {
  const record = { ...sale, platformFeeJpy: Infinity, shippingFeeJpy: -1, adjustmentJpy: -500 };
  const ledger = salesEvents(record);
  assert.ok(ledger.issues.includes("invalid_amount:platformFeeJpy"));
  assert.ok(ledger.issues.includes("negative_amount:shippingFeeJpy"));
  assert.equal(ledger.original.platformFeeJpy, Infinity);
  assert.equal(ledger.original.shippingFeeJpy, -1);
  for (const amount of Object.values(saleCohortTotals([record]).totals)) assert.ok(Number.isFinite(amount));
  assert.equal(saleCohortTotals([record]).totals.adjustmentJpy, -500);
  assert.throws(() => salesEvents(sale, { taxRate: -1 }), RangeError);
});

test("empty input, string amounts, tax-free mode and inclusive boundaries", () => {
  near(calendarSalesTotals([]).totals.profitJpy, 0);
  const record = { saleDate: "2026-02-28", salePriceTaxIncludedJpy: "100", inventoryCostJpy: "40" };
  near(calendarSalesTotals([record], feb, { taxRate: 0 }).totals.profitJpy, 60);
  near(calendarSalesTotals([record], { from: "2026-03-01" }).totals.profitJpy, 0);
  near(salesEvents({}).events[0].profitJpy, 0);
});

test("inactive cancellation metadata does not suppress an active sale", () => {
  const record = { ...sale, cancellationDate: "2026-01-01" };
  near(saleCohortTotals([record], feb).totals.profitJpy, 19500);
  assert.ok(!salesEvents(record).issues.includes("cancellation_before_sale"));
});

test("calendar totals reconcile to cohorts across multiple records and months", () => {
  const records = [
    sale,
    { ...sale, salesStatus: "已取消", cancellationDate: "2026-04-02" },
    { ...sale, stockDisposition: "returned", returnDate: "2026-04-03" },
    { ...sale, saleDate: "2026-02-28", refundJpy: 0, adjustmentJpy: -500 }
  ];
  const all = saleCohortTotals(records, feb).totals;
  const months = [feb, mar, apr].map((period) => calendarSalesTotals(records, period).totals);
  for (const key of Object.keys(all)) near(months.reduce((sum, month) => sum + month[key], 0), all[key]);
  assert.deepEqual(records[0], sale);
});

// Compile in memory and execute actual main.jsx declarations, never App or imports.
const source = fs.readFileSync(new URL("../main.jsx", import.meta.url), "utf8");
const compiled = await transformWithOxc(source, "main.jsx", { jsx: { runtime: "classic" } });
const ast = parseAst(compiled.code);
const declarations = new Map(ast.body.filter((node) => node.type === "FunctionDeclaration").map((node) => [node.id.name, compiled.code.slice(node.start, node.end)]));
const names = ["isSoldStatus", "savedSalesRecord", "isActualSale", "hasRestoredSalesStock", "calcTax", "makeSalesNo", "parseSalesRecordMemo", "stripSalesRecordMemo", "buildSalesRecordMemo", "calcSalesStatus", "calcSalesProfit", "calcSalesSettlement", "getSalesRecordFromProduct", "buildSalesRecordPatch", "calcSalesBreakdown", "salesMonthPeriod", "salesEventRecords", "calendarProductSales", "salesDraftDateError", "SalesReturnFields", "SalesReport", "buildAiBusinessStats"];
const fixture = { id: "EVENT-1", brand: "Fixture", item: "Bag", status: "已售出", purchaseCny: 50000, purchaseCurrency: "JPY", soldDate: sale.saleDate, soldPriceJpy: sale.salePriceTaxIncludedJpy, soldPlatform: "NBAA", images: [], salesRecord: { ...sale } };
names.push("inventoryStatusForSales");
names.push("stockDispositionLabel");
names.push("salesSettlementDisplayRows");
names.push("isCurrentInventory", "summarizeCurrentInventory");
let hookValues = [], hookIndex = 0, writes = [], alerts = [], stateChanges = [];
const context = vm.createContext({
  canonicalSaleStatus, salesEvents, calendarSalesTotals, saleStockDisposition,
  isCancelledSale, salesAmounts, receiptState, inAccountingPeriod, TAX_RATE: 0.1,
  localDateString: () => "2026-03-05", currentMonth: () => "2026-03",
  smartAmountToJpy: (value) => ({ value: Number(value || 0) }), defaultRateFor: () => 1,
  sumExtraCosts: () => 0, getAuction: () => null,
  React: { createElement: (type, props, ...children) => ({ type, props: props || {}, children }), useEffect: () => {} },
  useState: () => {
    const index = hookIndex++;
    return [hookValues[index], (value) => stateChanges.push({ index, value })];
  }, LISTING_PLATFORMS: ["NBAA"],
  jpy: (value) => Number(value || 0), pct: (value) => value, moneyCell: (value) => value,
  productNameCell: (value) => value, alert: (value) => alerts.push(value),
  ...Object.fromEntries(["ProductThumb", "Toolbar", "Calculator", "Card", "Table", "SalesProductFields", "SalesAmountFields"].map((name) => [name, name]))
});
vm.runInContext(names.map((name) => {
  assert.ok(declarations.has(name), `Missing integration function ${name}`);
  return declarations.get(name);
}).join("\n"), context);

test("actual sales patch preserves history and roundtrips stock and dates through memo", () => {
  for (const disposition of ["", "pending_return", "returned", "not_shipped"]) {
    const draft = { ...sale, salesStatus: "已取消", cancellationDate: "2026-03-10", stockDisposition: disposition, returnDate: disposition === "returned" ? "2026-03-04" : "" };
    const patch = context.buildSalesRecordPatch(fixture, draft);
    assert.equal(patch.status, ["returned", "not_shipped"].includes(disposition) ? "已入库" : "待退回");
    assert.equal(patch.soldDate, fixture.soldDate);
    assert.equal(patch.soldPriceJpy, fixture.soldPriceJpy);
    assert.equal(patch.salesRecord.refundJpy, sale.refundJpy);
    const memo = context.parseSalesRecordMemo(patch.soldMemo);
    assert.equal(memo.cancellationDate, draft.cancellationDate);
    assert.equal(memo.stockDisposition, disposition);
    assert.equal(memo.returnDate, draft.returnDate);
    const restored = context.getSalesRecordFromProduct({ ...fixture, ...patch, salesRecord: undefined });
    assert.equal(restored.cancellationDate, draft.cancellationDate);
    assert.equal(restored.stockDisposition, disposition);
  }
  const future = context.buildSalesRecordPatch(fixture, { ...sale, salesStatus: "已取消", cancellationDate: "2026-03-05", stockDisposition: "returned", returnDate: "2026-04-01" });
  assert.equal(future.status, "待退回");
  assert.equal(context.savedSalesRecord({ status: "已取消" }).salesStatus, "已取消");
});

test("actual calendar adapter and AI stats recognize later-month refunds without changing calcTax", () => {
  near(context.calendarProductSales([fixture], feb).totals.profitJpy, 39500);
  near(context.calendarProductSales([fixture], mar).totals.profitJpy, -10000);
  near(context.calcTax(fixture).profitExTax, 29500);
  const stats = context.buildAiBusinessStats([fixture], []);
  near(stats.monthProfit, -10000);
  near(stats.todayProfit, -10000);
  near(stats.monthSale, -11000);
  assert.equal(stats.monthSold.length, 0);
});

function flatten(node) {
  if (!node || typeof node !== "object") return [];
  return [node, ...(node.children || []).flat(Infinity).flatMap(flatten)];
}
function renderSales(draft, month = "2026-03", update = async (id, patch) => { writes.push({ id, patch }); return true; }) {
  hookValues = ["", month, "全部", "全部", fixture.id, { finalDepositJpy: "", ...draft }, null];
  hookIndex = 0;
  return flatten(context.SalesReport({ items: [fixture], updateListingItem: update, downloadCSV: () => {} }));
}
test("actual SalesReport month summary includes refund from an earlier sale cohort", () => {
  const nodes = renderSales({ ...sale, productId: fixture.id });
  const profit = nodes.find((node) => node.type === "Card" && node.props.title === "期间利润");
  assert.ok(profit);
  near(profit.props.value, -10000);
  const table = nodes.find((node) => node.type === "Table");
  assert.equal(table.props.rows.length, 1);
});

// Exercise the actual async save handler exposed by the rendered button.
for (const disposition of ["pending_return", "returned", "not_shipped"]) {
  writes = []; alerts = [];
  const nodes = renderSales({ ...sale, productId: fixture.id, salesStatus: "已取消", cancellationDate: "2026-03-05", stockDisposition: disposition, returnDate: disposition === "returned" ? "2026-03-05" : "" });
  const save = nodes.find((node) => node.type === "button" && node.children.includes("保存销售记录"));
  await save.props.onClick();
  assert.equal(writes.length, 1);
  assert.equal(writes[0].patch.status, disposition === "pending_return" ? "待退回" : "已入库");
  assert.equal(writes[0].patch.salesRecord.salePriceTaxIncludedJpy, 110000);
}
checks += 1;
console.log(`ok ${checks} - actual SalesReport save handler uses explicit stock decision (in-memory writes only)`);

writes = []; alerts = [];
const invalidNodes = renderSales({ ...sale, productId: fixture.id, salesStatus: "已取消", cancellationDate: "" });
await invalidNodes.find((node) => node.type === "button" && node.children.includes("保存销售记录")).props.onClick();
assert.equal(writes.length, 0);
assert.ok(alerts.includes("请填写取消日期。"));
checks += 1;
console.log(`ok ${checks} - actual save handler blocks an undated new cancellation before callback`);

for (const failure of ["throw", "false"]) {
  stateChanges = []; alerts = [];
  const nodes = renderSales({ ...sale, productId: fixture.id }, "2026-03", async () => {
    if (failure === "throw") throw new Error("synthetic cloud failure; local pending retained");
    return false;
  });
  await nodes.find((node) => node.type === "button" && node.children.includes("保存销售记录")).props.onClick();
  assert.equal(stateChanges.length, 0, "failed saves must not clear editing state or draft");
  assert.equal(alerts.length, 1);
  assert.ok(alerts[0].includes("销售草稿仍保留"));
  assert.ok(!alerts.includes("销售记录已保存。"));
}
stateChanges = []; alerts = [];
const successNodes = renderSales({ ...sale, productId: fixture.id });
await successNodes.find((node) => node.type === "button" && node.children.includes("保存销售记录")).props.onClick();
assert.deepEqual(stateChanges, [{ index: 4, value: null }, { index: 5, value: null }]);
assert.ok(alerts.includes("销售记录已保存。"));
checks += 1;
console.log(`ok ${checks} - actual save catches thrown/false failure, retains draft, closes only on success`);

test("actual date validation rejects new undated cancellation but preserves legacy history", () => {
  assert.ok(context.salesDraftDateError({ ...sale, salesStatus: "已取消" }, sale));
  assert.equal(context.salesDraftDateError({ ...sale, salesStatus: "已取消" }, { salesStatus: "已取消" }), "");
  assert.ok(context.salesDraftDateError({ ...sale, salesStatus: "已取消", cancellationDate: "2026-02-30" }));
  assert.ok(context.salesDraftDateError({ ...sale, stockDisposition: "returned", returnDate: "" }));
});

// Execute Dashboard's actual dated summary block without mounting unrelated UI.
test("actual Dashboard today/month calculations use event dates", () => {
  const dashboard = declarations.get("Dashboard");
  const start = dashboard.indexOf("const todayIn");
  const end = dashboard.indexOf("const recent", start);
  context.items = [fixture]; context.today = "2026-03-05"; context.month = "2026-03";
  const totals = vm.runInContext(`(() => { ${dashboard.slice(start, end)} return { todaySale, todayProfit, monthSale, monthProfit }; })()`, context);
  near(totals.todaySale, -11000); near(totals.todayProfit, -10000);
  near(totals.monthSale, -11000); near(totals.monthProfit, -10000);
});

test("actual return form exposes controlled disposition and date inputs", () => {
  const changes = [];
  const record = { ...sale, salesStatus: "已取消", cancellationDate: "2026-03-05", stockDisposition: "returned", returnDate: "2026-03-05" };
  const nodes = flatten(context.SalesReturnFields({ record, onChange: (next) => changes.push(next) }));
  const select = nodes.find((node) => node.type === "select");
  select.props.onChange({ target: { value: "pending_return" } });
  assert.equal(changes[0].stockDisposition, "pending_return");
  assert.equal(nodes.filter((node) => node.type === "input" && node.props.type === "date").length, 2);
});

test("actual Profit period summary retains the separate cumulative table path", () => {
  const profit = declarations.get("Profit");
  const start = profit.indexOf("const profitItems");
  const end = profit.indexOf("const headers", start);
  context.items = [fixture]; context.profitQuery = ""; context.profitMonth = "2026-03";
  const totals = vm.runInContext(`(() => { ${profit.slice(start, end)} return monthFinancials.totals; })()`, context);
  near(totals.profitJpy, -10000);
  near(context.calcTax(fixture).profitExTax, 29500);
});

test("returned cost release reconciles actual calcTax, settlement, breakdown and event totals", () => {
  for (const disposition of ["returned", "not_shipped"]) {
    const item = { ...fixture, status: "已入库", salesRecord: { ...sale, salesStatus: "已退款", stockDisposition: disposition, returnDate: "2026-03-05" } };
    const tax = context.calcTax(item);
    const settlement = context.getSalesRecordFromProduct(item);
    const breakdown = context.calcSalesBreakdown(item);
    const eventTotal = context.calendarProductSales([item], { to: "2026-03-05" }).totals;
    near(tax.costJpy, 50000);
    near(settlement.inventoryCostJpy, 50000);
    near(tax.profitExTax, eventTotal.profitJpy);
    near(settlement.actualProfitJpy, eventTotal.profitJpy);
    near(breakdown.actualProfitJpy, eventTotal.profitJpy);
  }
  const pending = { ...fixture, salesRecord: { ...sale, salesStatus: "已退款", stockDisposition: "pending_return" } };
  near(context.calcTax(pending).profitExTax, 29500);
  near(context.getSalesRecordFromProduct(pending).actualProfitJpy, 29500);
  const undated = { ...fixture, salesRecord: { ...sale, stockDisposition: "returned", returnDate: "" } };
  near(context.calcTax(undated).profitExTax, 29500);
  const cancelled = { ...fixture, salesRecord: { ...sale, salesStatus: "已取消", cancellationDate: "" } };
  near(context.calcTax(cancelled).profitExTax, 0);
  assert.ok(salesEvents(context.getSalesRecordFromProduct(cancelled)).issues.includes("undated_cancellation"));
});

test("actual partial/full refund patch with no physical choice preserves sold/shipped history", () => {
  for (const status of ["已售出", "已发货"]) for (const refundJpy of [11000, 110000]) {
    const item = { ...fixture, status };
    const draft = { ...sale, salesStatus: "已退款", refundJpy, stockDisposition: "" };
    const patch = context.buildSalesRecordPatch(item, draft);
    assert.equal(patch.status, status);
    assert.equal(patch.soldPriceJpy, 110000);
    assert.equal(patch.salesRecord.refundJpy, refundJpy);
    const updated = { ...item, ...patch };
    near(context.calcTax(updated).profitExTax, context.calendarProductSales([updated]).totals.profitJpy);
  }
});

test("actual legacy inventory projection is nonmutating and preserves cancellation identity", () => {
  const legacy = Object.freeze({ ...fixture, salesRecord: undefined, salesStatus: "已取消", cancellationDate: "", stockDisposition: "" });
  const status = context.inventoryStatusForSales(legacy, "2026-03-05");
  assert.equal(status, "待退回");
  assert.equal(legacy.status, "已售出");
  assert.equal(legacy.cancellationDate, "");
  const projected = { ...legacy, salesStatus: context.savedSalesRecord(legacy).salesStatus, status };
  assert.equal(context.savedSalesRecord(projected).salesStatus, "已取消");
  assert.ok(salesEvents(context.getSalesRecordFromProduct(projected)).issues.includes("undated_cancellation"));
  assert.equal(context.inventoryStatusForSales({ ...legacy, stockDisposition: "not_shipped" }), "已入库");
  assert.equal(context.inventoryStatusForSales({ ...legacy, stockDisposition: "returned", returnDate: "" }), "待退回");
  const refund = { ...fixture, salesRecord: { ...sale, salesStatus: "已退款", stockDisposition: "" } };
  assert.equal(context.inventoryStatusForSales(refund), "已售出");
  assert.equal(context.inventoryStatusForSales({ ...refund, salesRecord: { ...refund.salesRecord, stockDisposition: "returned", returnDate: "2026-03-05" } }), "已入库");
  assert.ok(source.includes('items.filter((x) => !x.deletedAt).map((x) => ({ ...x, salesStatus: savedSalesRecord(x).salesStatus, status: inventoryStatusForSales(x) }))'));
});

test("active sale disposition alone never releases cost or restores inventory", () => {
  for (const stockDisposition of ["not_shipped", "returned"]) {
    const record = { ...sale, refundJpy: 0, salesStatus: "已成交", stockDisposition, returnDate: "2026-03-05" };
    const item = { ...fixture, salesRecord: record };
    assert.equal(context.hasRestoredSalesStock(record), false);
    assert.equal(context.inventoryStatusForSales(item), "已售出");
    near(context.calcTax(item).profitExTax, 39500);
    near(context.calendarProductSales([item]).totals.profitJpy, 39500);
  }
});

test("shipped and delivered dispositions survive serialization without restoring sale stock", () => {
  for (const stockDisposition of ["shipped", "delivered"]) {
    const record = { ...sale, refundJpy: 0, salesStatus: "已成交", stockDisposition };
    const physical = saleStockDisposition(record);
    assert.equal(physical.state, stockDisposition);
    assert.equal(physical.available, false);
    assert.equal(physical.issues.length, 0);
    assert(!salesEvents(record).issues.includes("invalid_stock_disposition"));
    const patch = context.buildSalesRecordPatch(fixture, record);
    assert.equal(patch.status, "已发货");
    assert.equal(patch.stockDisposition, stockDisposition);
    const restored = context.getSalesRecordFromProduct({ ...fixture, ...patch });
    assert.equal(restored.stockDisposition, stockDisposition);
    assert.equal(context.isCurrentInventory({ ...fixture, ...patch }), false);
    near(context.calendarProductSales([{ ...fixture, ...patch }]).totals.profitJpy, 39500);
    const refunded = context.buildSalesRecordPatch(fixture, { ...record, salesStatus: "已退款", refundJpy: 110000 });
    assert.equal(refunded.status, "待退回");
    assert.equal(context.hasRestoredSalesStock(refunded.salesRecord), false);
  }
});

test("all normal delivery and return options are exposed in the shared form", () => {
  const tree = context.SalesReturnFields({ record: {}, onChange: () => {} });
  const options = [];
  function visit(node) {
    if (!node || typeof node !== "object") return;
    if (node.type === "option") options.push(node.props.value);
    for (const child of (node.children || []).flat(Infinity)) visit(child);
  }
  visit(tree);
  assert.deepEqual(options, ["", "not_shipped", "shipped", "delivered", "pending_return", "returned"]);
});

test("auction statement order separates base, taxes and receipts without changing stored amounts", () => {
  const record = {salePriceTaxIncludedJpy:490600,platformFeeJpy:14718,finalDepositJpy:475882,salesStatus:"已成交"};
  const before=JSON.stringify(record);
  const rows=context.salesSettlementDisplayRows(record);
  assert.deepEqual(Array.from(rows, row=>row[0]),["成交价（税前）","商品消费税","手续费（税前）","手续费消费税","应结算金额","实际到账金额"]);
  Array.from(rows,row=>row[1]).forEach((value,i)=>near(value,[446000,44600,13380,1338,475882,475882][i]));
  assert.equal(JSON.stringify(record),before);
  const refund={...record,refundJpy:11000,shippingFeeJpy:1000,adjustmentJpy:-500};
  near(context.salesSettlementDisplayRows(refund)[4][1],context.calcSalesSettlement(refund).expectedDepositJpy);
});

console.log(`Passed ${checks} sales event and integration checks.`);
