import fs from "node:fs";
import assert from "node:assert/strict";
import { spawn, execFileSync } from "node:child_process";
import { chromium } from "playwright";
import { parse } from "@babel/parser";
const base = execFileSync("git", ["show", "c098cd47f5856af6730b808bce429dd8d5d09920:main.jsx"], { encoding: "utf8" });
const candidate = fs.readFileSync("main.jsx", "utf8");
function functions(source) {
  const map = new Map();
  function walk(node) {
    if (!node || typeof node !== "object") return;
    if (node.type === "FunctionDeclaration" && node.id) map.set(node.id.name, source.slice(node.start, node.end));
    for (const value of Object.values(node)) if (Array.isArray(value)) value.forEach(walk); else if (value && typeof value === "object") walk(value);
  }
  walk(parse(source, { sourceType: "module", plugins: ["jsx"] }));
  return map;
}
const oldFns = functions(base), newFns = functions(candidate);
for (const name of ["calcTax", "calcImportBatchAllocation", "calcImportBatchProgress", "applyBatchAllocations", "calcSalesBreakdown", "moveProductsToBatch", "allocateActiveBatch", "saveBatch", "saveItem", "handleImages", "syncToCloud", "loadFromCloud"]) {
  assert(oldFns.has(name), name + " exists");
  assert.equal(newFns.get(name), oldFns.get(name), name + " unchanged");
}
console.log("Financial, persistence, images, batch save and transfer functions unchanged");
assert(candidate.includes("<Ledger items={computedItems}"));
assert(candidate.includes("<Customs items={computedItems}"));
assert(candidate.includes("<Profit items={computedItems}"));
const harness = "\nfunction SimplifyTestHarness() {\n  const fixture = { ...emptyForm, id: \"CN-202609-0001\", brand: \"CHANEL\", item: \"Classic Bag\", purchaseDate: \"2026-09-15\", purchaseCny: 1000, declaredCny: 1000, saleJpy: 50000, source: \"China Supplier\", address: \"China\", images: [\"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=\"], importBatchId: \"EMS-20260803-001\", customsBatchId: \"EMS-20260803-001\" };\n  const [items, setItems] = useState([fixture, { ...fixture, id: \"CN-202609-0002\", item: \"Wallet\" }]);\n  const [form, setForm] = useState({ ...emptyForm });\n  const [batches, setBatches] = useState([{ id: \"EMS-20260930-001\", name: \"九月\", importDate: \"2026-09-30\", goodsCount: 2, goodsValueJpy: 43600, dutyJpy: 1000, internationalShippingJpy: 2000 }, { id: \"EMS-20260803-001\", name: \"八月\", importDate: \"2026-08-03\", goodsCount: 2, dutyJpy: 500 }]);\n  const [query, setQuery] = useState(\"\");\n  const [status, setStatus] = useState(\"全部\");\n  const view = new URLSearchParams(location.search).get(\"view\") || \"ledger\";\n  const csv = (...args) => { window.__exports = args; };\n  const totals = { cost: 43600, sale: 100000, profit: 56400, qty: 2, declared: 2000, inputTax: 0, outputTax: 0 };\n  window.__testItems = items;\n  window.__testBatches = batches;\n  window.__testForm = form;\n  let content;\n  if (view === \"ledger\") content = <Ledger items={items} setItems={setItems} isOwner downloadCSV={csv} exportItemPdf={() => {}} editItem={(x) => { window.__editId = x.id; }} />;\n  if (view === \"inventory\") content = <Inventory items={items.filter(x => [x.id,x.brand,x.item].join(\" \").toLowerCase().includes(query.toLowerCase()) && (status === \"全部\" || x.status === status))} query={query} setQuery={setQuery} statusFilter={status} setStatusFilter={setStatus} downloadCSV={csv} editItem={() => {}} deleteItem={() => {}} isOwner setPreviewImage={() => {}} setPreviewScale={() => {}} exportItemPdf={() => {}} />;\n  if (view === \"batch\") content = <CustomsBatchPanel batches={batches} setBatches={setBatches} items={items} setItems={setItems} downloadCSV={csv} />;\n  if (view === \"add\") content = <AddForm form={form} setForm={setForm} saveItem={() => { window.__savedForm = form; }} resetForm={() => setForm(emptyForm)} editingId={null} handleImages={() => {}} removeImage={() => {}} dictionaries={DEFAULT_DICTIONARIES} suppliers={[]} customsBatches={batches} />;\n  if (view === \"dashboard\") content = <Dashboard items={items} totals={totals} setTab={() => {}} exportBackup={() => {}} customsBatches={batches} />;\n  if (view === \"detail\") content = <NbaaProductRecordDetail item={fixture} onClose={() => {}} exportItemPdf={() => {}} isOwner />;\n  if (view === \"ems\") content = <Customs items={items} customsBatches={batches} downloadCSV={csv} />;\n  if (view === \"profit\") content = <Profit items={items} />;\n  if (view === \"listing\") content = <ListingManagement items={items} updateListingItem={() => {}} editItem={() => {}} setPreviewImage={() => {}} setPreviewScale={() => {}} />;\n  if (view === \"sales\") content = <SalesReport items={items} updateListingItem={() => {}} downloadCSV={csv} />;\n  if (view === "app") return <App />;
  return <main style={{ margin: 0, width: \"100%\", boxSizing: \"border-box\", padding: 12 }}><ErrorBoundary>{content}</ErrorBoundary></main>;\n}\n";
const mount = 'createRoot(document.getElementById("root")).render(';
const offset = candidate.lastIndexOf(mount);
assert(offset > 0);
fs.writeFileSync("main.jsx", candidate.slice(0, offset) + harness + '\ncreateRoot(document.getElementById("root")).render(<SimplifyTestHarness />);');
fs.mkdirSync("verification/screenshots", { recursive: true });
const server = spawn("npm", ["run", "dev", "--", "--host", "127.0.0.1", "--port", "4173"], { stdio: "inherit" });
let browser;
try {
  for (let n = 0; n < 60; n++) { try { const r = await fetch("http://127.0.0.1:4173"); if (r.ok) break; } catch {} await new Promise(r => setTimeout(r, 500)); }
  browser = await chromium.launch({ headless: true });
  for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    await page.route("**/*.supabase.co/**", route => route.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
    const errors = [];
    page.on("pageerror", e => errors.push(String(e)));
    page.on("dialog", d => d.type() === "confirm" ? d.accept() : d.dismiss());
    for (const view of ["ledger", "inventory", "batch", "add", "dashboard", "detail", "ems", "profit", "listing", "sales"]) {
      await page.goto("http://127.0.0.1:4173/?view=" + view);
      await page.locator("main").waitFor();
      await page.waitForTimeout(300);
      assert.equal(await page.getByText("GOUKA ERP 安全模式", { exact: true }).count(), 0, view + " no error boundary");
      assert((await page.locator("main").innerText()).length > 20, view + " nonblank");
      assert.equal(errors.length, 0, view + " browser errors: " + errors.join("; "));
      if (["ledger", "batch", "add", "inventory", "dashboard"].includes(view) && width === 390) {
        const shot = await page.screenshot({ type: "jpeg", quality: 35, fullPage: false });
        console.log("UI_SHOT:" + view + ":" + shot.toString("base64"));
      }
      const initialLayout = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth }));
      assert(initialLayout.scrollWidth <= initialLayout.width + 1, view + " has no page-level horizontal overflow");
      if (view === "ledger") {
        assert(await page.getByRole("button", { name: "登记列表", exact: true }).getAttribute("aria-pressed") === "true");
        assert.equal(await page.locator("table tbody tr").count(), 2);
        await page.getByRole("button", { name: "原始横表", exact: true }).click();
        assert.equal(await page.locator("table th").count(), 22);
        await page.getByRole("button", { name: "详细卡片", exact: true }).click();
        assert.equal(await page.locator(".ledger-card").count(), 2);
        await page.getByRole("button", { name: "登记列表", exact: true }).click();
        await page.getByRole("button", { name: "编辑商品", exact: true }).first().click();
        assert.equal(await page.evaluate(() => window.__editId), "CN-202609-0001");
      }
      if (view === "inventory") {
        const search = page.getByPlaceholder("搜索编号 / 品牌 / 商品 / 来源");
        const input = (await search.count()) ? search : page.locator(".search input").first();
        await input.fill("Wallet");
        await page.getByRole("button", { name: "清除全部筛选", exact: true }).click();
        assert.equal(await input.inputValue(), "");
        assert.equal(await page.locator(".erp-fold[open]").count(), 0);
      }
      if (view === "batch") {
        const batchSelect = page.getByRole("combobox", { name: "当前批次", exact: true });
        assert.equal(await batchSelect.inputValue(), "EMS-20260930-001");
        await page.getByPlaceholder("商品编号 / 品牌 / 商品名", { exact: true }).fill("CN-202609");
        await page.getByRole("button", { name: "批量移入匹配商品", exact: true }).click();
        assert((await page.evaluate(() => window.__testItems)).every(x => x.importBatchId === "EMS-20260930-001"));
        await page.getByRole("button", { name: "开始分摊", exact: true }).click();
        assert((await page.evaluate(() => window.__testItems)).every(x => x.allocatedDutyJpy > 0));
        await batchSelect.selectOption("EMS-20260803-001");
        assert((await page.locator(".import-batch-center").innerText()).includes("EMS-20260803-001"));
        await page.getByRole("button", { name: "新增批次", exact: true }).click();
        assert(await page.getByPlaceholder("空白则自动生成 EMS-年月-001").isVisible());
      }
      if (view === "add") {
        assert(await page.locator('input[type="file"]').isVisible());
        assert(!(await page.getByText("日本拍卖结算（结构化数据 / Enterprise 4.0）", { exact: false }).isVisible()));
        await page.locator("summary").filter({ hasText: "日本拍卖结算" }).click();
        assert(await page.getByText("落札コード", { exact: true }).isVisible());
        await page.getByRole("button", { name: "保存并加入库存", exact: false }).click();
        assert(await page.evaluate(() => !!window.__savedForm));
      }
      if (view === "dashboard") {
        assert.equal(await page.locator(".erp-dashboard-analysis[open]").count(), 0);
        await page.getByText("经营分析与更多工具", { exact: true }).click();
        assert.equal(await page.locator(".erp-dashboard-analysis[open]").count(), 1);
      }
      const metrics = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth, buttons: [...document.querySelectorAll("button")].filter(e => e.getClientRects().length).length }));
      console.log("UI_CHECK", view, width, JSON.stringify(metrics));
      await page.screenshot({ path: "verification/screenshots/" + view + "-" + width + ".png", fullPage: true });

    }

    await page.addInitScript(() => localStorage.setItem("gouka_erp_login", "yes"));
    await page.goto("http://127.0.0.1:4173/?view=app");
    await page.locator("aside").waitFor();
    await page.locator("aside").getByRole("button", { name: "库存管理", exact: true }).click();
    await page.locator(".search input").first().fill("Chain");
    await page.locator("aside").getByRole("button", { name: "古物台账", exact: true }).click();
    assert.equal(await page.locator("table tbody tr").count(), 2, "inventory search does not leak into ledger");
    await page.getByRole("button", { name: "编辑商品", exact: true }).first().click();
    assert(await page.getByRole("button", { name: "保存修改", exact: false }).isVisible(), "ledger opens actual product editor");
    assert.equal(errors.length, 0, "App navigation browser errors");
    console.log("APP_NAVIGATION_PASS", width);
    await page.screenshot({ path: "verification/screenshots/app-" + width + ".png", fullPage: true });
    await page.close();
  }
  console.log("All desktop/mobile workflow checks passed");
} finally {
  if (browser) await browser.close();
  server.kill("SIGTERM");
  fs.writeFileSync("main.jsx", candidate);
}
