import fs from "node:fs";
import assert from "node:assert/strict";
import { spawn, execFileSync } from "node:child_process";
import { chromium } from "playwright";
import { parse } from "@babel/parser";
const base = execFileSync("git", ["show", "a3695072c885b765c65591ffb8e95d82ccafa89e:main.jsx"], { encoding: "utf8" });
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
const basePage = execFileSync("git", ["show", "a3695072c885b765c65591ffb8e95d82ccafa89e:pages/JapaneseAuctionPage.jsx"], { encoding: "utf8" });
const candidatePage = fs.readFileSync("pages/JapaneseAuctionPage.jsx", "utf8");
assert.equal(candidatePage, basePage, "auction page extraction remains unchanged");
const oldFns = new Map([...functions(base), ...functions(basePage)]);
const newFns = new Map([...functions(candidate), ...functions(candidatePage)]);
for (const name of ["calcTax", "calcImportBatchAllocation", "calcImportBatchProgress", "applyBatchAllocations", "calcSalesBreakdown", "moveProductsToBatch", "allocateActiveBatch", "saveBatch", "handleImages", "syncToCloud", "loadFromCloud", "moveStatus", "savePlatform", "quickSetPlatform", "saveSalesDraft", "calculateAuctionTotals", "normalizeAuction", "inferredAuctionForItem", "structuredAuction"]) {
  assert(oldFns.has(name), name + " exists");
  assert.equal(newFns.get(name), oldFns.get(name), name + " unchanged");
}
console.log("Financial calculations, batch save/transfer and unaffected workflows unchanged");
assert(candidate.includes("<Ledger items={computedItems}"));
assert(candidate.includes("<Customs items={computedItems}"));
assert(candidate.includes("<Profit items={computedItems}"));
const harness = "\nfunction SimplifyTestHarness() {\n  window.__hydrateImages = hydrateItemsWithImages;\n  window.__openImageDb = openImageDb;\n  const fixture = { ...emptyForm, id: \"CN-202609-0001\", brand: \"CHANEL\", item: \"Classic Bag\", purchaseDate: \"2026-09-15\", purchaseCny: 1000, declaredCny: 1000, saleJpy: 50000, source: \"China Supplier\", address: \"China\", images: [\"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=\"], importBatchId: \"EMS-20260803-001\", customsBatchId: \"EMS-20260803-001\" };\n  const [items, setItems] = useState([fixture, { ...fixture, id: \"CN-202609-0002\", item: \"Wallet\" }]);\n  const [form, setForm] = useState({ ...emptyForm });\n  const [batches, setBatches] = useState([{ id: \"EMS-20260930-001\", name: \"九月\", importDate: \"2026-09-30\", goodsCount: 2, goodsValueJpy: 43600, dutyJpy: 1000, internationalShippingJpy: 2000 }, { id: \"EMS-20260803-001\", name: \"八月\", importDate: \"2026-08-03\", goodsCount: 2, dutyJpy: 500 }]);\n  const [query, setQuery] = useState(\"\");\n  const [status, setStatus] = useState(\"全部\");\n  const view = new URLSearchParams(location.search).get(\"view\") || \"ledger\";\n  const csv = (...args) => { window.__exports = args; };\n  const totals = { cost: 43600, sale: 100000, profit: 56400, qty: 2, declared: 2000, inputTax: 0, outputTax: 0 };\n  window.__testItems = items;\n  window.__testBatches = batches;\n  window.__testForm = form;\n  let content;\n  if (view === \"ledger\") content = <Ledger items={items} setItems={setItems} isOwner downloadCSV={csv} exportItemPdf={() => {}} editItem={(x) => { window.__editId = x.id; }} />;\n  if (view === \"inventory\") content = <Inventory items={items.filter(x => [x.id,x.brand,x.item].join(\" \").toLowerCase().includes(query.toLowerCase()) && (status === \"全部\" || x.status === status))} query={query} setQuery={setQuery} statusFilter={status} setStatusFilter={setStatus} downloadCSV={csv} editItem={() => {}} deleteItem={() => {}} isOwner setPreviewImage={() => {}} setPreviewScale={() => {}} exportItemPdf={() => {}} />;\n  if (view === \"batch\") content = <CustomsBatchPanel batches={batches} setBatches={setBatches} items={items} setItems={setItems} downloadCSV={csv} />;\n  if (view === \"add\") content = <AddForm form={form} setForm={setForm} saveItem={() => { window.__savedForm = form; }} resetForm={() => setForm(emptyForm)} editingId={null} handleImages={() => {}} removeImage={() => {}} dictionaries={DEFAULT_DICTIONARIES} suppliers={[]} customsBatches={batches} />;\n  if (view === \"dashboard\") content = <Dashboard items={items} totals={totals} setTab={() => {}} exportBackup={() => {}} customsBatches={batches} />;\n  if (view === \"detail\") content = <NbaaProductRecordDetail item={fixture} onClose={() => {}} exportItemPdf={() => {}} isOwner />;\n  if (view === \"ems\") content = <Customs items={items} customsBatches={batches} downloadCSV={csv} />;\n  if (view === \"profit\") content = <Profit items={items} />;\n  if (view === \"listing\") content = <ListingManagement items={items} updateListingItem={(id, patch) => { window.__listingPatch = { id, patch }; setItems((old) => old.map(x => x.id === id ? { ...x, ...patch } : x)); }} editItem={() => {}} setPreviewImage={() => {}} setPreviewScale={() => {}} />;\n  if (view === \"sales\") content = <SalesReport items={items.map(x => ({ ...x, saleJpy: 0 }))} updateListingItem={(id, patch) => { window.__salesPatch = { id, patch }; setItems((old) => old.map(x => x.id === id ? { ...x, ...patch } : x)); }} downloadCSV={csv} />;\n\n  if (view === \"auction\") {\n    const auctionFixture = { ...fixture, id: \"JP-NBAA-202609-0001\", platform: \"NBAA\", source: \"NBAA\", auction: { platform: \"NBAA\", auctionDate: \"2026-09-25\", auctionCode: \"SET-0925\", boxNo: \"7\", branchNo: \"8\", hammerPrice: 10000, hammerTax: 1000, buyerFee: 500, buyerFeeTax: 50, domesticShipping: 200 } };\n    const auctionFixtures = [\n      ...Array.from({ length: 23 }, (_, n) => ({ ...auctionFixture, id: \"JP-NBAA-202609-\" + String(n + 1).padStart(4, \"0\") })),\n      { ...auctionFixture, id: \"JP-OBA-202609-0001\", brand: \"Cartier\", auction: { ...auctionFixture.auction, platform: \"OBA\", auctionDate: \"2026-09-10\", boxNo: \"49\", branchNo: \"10\" } },\n      { ...fixture, id: \"JP-NBAA-202608-0999\", platform: \"NBAA\", source: \"NBAA\", auction: null, purchaseDate: \"2026-08-01\" }\n    ];\n    content = <JapaneseAuctionPanel items={auctionFixtures} downloadCSV={csv} setPreviewImage={(src) => { window.__preview = src; }} setPreviewScale={() => {}} exportItemPdf={(item) => { window.__pdfId = item.id; }} />;\n  }\n  if (view === \"app\") return <App />;\n\n\n  if (view === \"photos\") {\n    const many = Array.from({ length: 10000 }, (_, n) => ({ ...fixture,\n      id: \"CN-202609-\" + String(n + 1).padStart(5, \"0\"), imageCount: 3,\n      images: [0, 1, 2].map(i => \"https://duaaijqbngltmlgbzrvt.supabase.co/storage/v1/object/public/product-images/\" + n + \"/\" + i + \"_thumbv1.jpg\")\n    }));\n    content = <Inventory items={many} query={query} setQuery={setQuery} statusFilter={status} setStatusFilter={setStatus}\n      downloadCSV={csv} editItem={() => {}} deleteItem={() => {}} isOwner\n      setPreviewImage={src => { window.__scalePreview = src; }} setPreviewScale={() => {}} exportItemPdf={() => {}} />;\n  }\n  if (view === \"fallback\") content = <ProductImage className=\"fallback-photo\" src=\"https://duaaijqbngltmlgbzrvt.supabase.co/storage/v1/object/public/product-images/fallback/photo_thumbv1.jpg\" alt=\"fallback photo\" />;\n  return <main style={{ margin: 0, width: \"100%\", boxSizing: \"border-box\", padding: 12 }}><ErrorBoundary>{content}</ErrorBoundary></main>;\n}\n";
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
    for (const view of ["ledger", "inventory", "batch", "add", "dashboard", "detail", "ems", "profit", "listing", "sales", "auction"]) {
      await page.goto("http://127.0.0.1:4173/?view=" + view);
      await page.locator("main").waitFor();
      await page.waitForTimeout(300);
      assert.equal(await page.getByText("GOUKA ERP 安全模式", { exact: true }).count(), 0, view + " no error boundary");
      assert((await page.locator("main").innerText()).length > 20, view + " nonblank");
      assert.equal(errors.length, 0, view + " browser errors: " + errors.join("; "));
      if (["auction"].includes(view)) {
        const shot = await page.screenshot({ type: "jpeg", quality: 35, fullPage: false });
        console.log("UI_SHOT:" + view + ":" + shot.toString("base64"));
      }
      const initialLayout = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth }));
      assert(initialLayout.scrollWidth <= initialLayout.width + 1, view + " has no page-level horizontal overflow");
      if (view === "ledger") {
        const image = page.locator("img.thumb").first();
        await image.scrollIntoViewIfNeeded();
        await page.waitForFunction(() => { const image = document.querySelector("img.thumb"); return image && image.complete && image.naturalWidth > 0; });
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
        assert.equal(await page.locator("table th").count(), 9);
        if (width === 1440) {
          await page.getByRole("button", { name: "完整明细", exact: true }).click();
          assert.equal(await page.locator("table th").count(), 16);
          await page.getByRole("button", { name: "日常列表", exact: true }).click();
        }
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
      if (view === "listing") {
        assert.equal(await page.locator(".erp-listing-column:visible").count(), 1);
        await page.getByRole("button", { name: "待出品", exact: true }).first().click();
        assert.equal((await page.evaluate(() => window.__listingPatch)).patch.status, "待出品");
        await page.getByRole("button", { name: /^待出品 1$/ }).click();
        await page.getByRole("button", { name: "平台/价格", exact: true }).click();
        await page.getByPlaceholder("预计出品价 JPY").fill("55000");
        await page.getByRole("button", { name: "保存", exact: true }).click();
        assert.equal((await page.evaluate(() => window.__listingPatch)).patch.saleJpy, 55000);
        await page.getByRole("button", { name: "移到已出品", exact: true }).click();
        await page.getByRole("button", { name: "全部流程", exact: true }).click();
        assert.equal(await page.locator(".erp-listing-column:visible").count(), 5);
      }
      if (view === "sales") {
        assert.equal(await page.locator(".erp-fold[open]").count(), 0);
        await page.getByRole("button", { name: "新增销售", exact: true }).click();
        assert(await page.locator(".sales-draft-grid").isVisible(), "sales form opens");
        await page.getByLabel("售价（含税）", { exact: true }).fill("55000");
        await page.getByRole("button", { name: "保存销售记录", exact: true }).click();
        assert.equal((await page.evaluate(() => window.__salesPatch)).id, "CN-202609-0001");
        assert.equal(await page.locator(".sales-draft-grid").count(), 0);
        await page.getByRole("button", { name: "详情", exact: true }).first().click();
        assert(await page.getByRole("heading", { name: "销售记录详情" }).isVisible());
        await page.getByRole("button", { name: "关闭", exact: true }).click();
        await page.getByText("回款、税额与平台汇总", { exact: true }).click();
        assert(await page.locator(".sales-platform-summary").isVisible());
      }

      if (view === "auction") {
        assert.equal(await page.locator(".erp-auction-record").count(), 20);
        await page.getByRole("button", { name: "下一页", exact: true }).first().click();
        assert.equal(await page.locator(".erp-auction-record").count(), 5);
        await page.getByRole("button", { name: "上一页", exact: true }).first().click();
        await page.getByLabel("拍卖公司", { exact: true }).selectOption("NBAA");
        await page.getByLabel("场次日期", { exact: true }).selectOption("2026-09-25");
        await page.getByLabel("品牌", { exact: true }).selectOption("CHANEL");
        await page.getByPlaceholder("例如 7-8").fill("7-8");
        await page.getByPlaceholder("商品编号 / 商品名 / 落札代码").fill("JP-NBAA-202609-0001");
        assert.equal(await page.locator(".erp-auction-record").count(), 1);
        assert((await page.locator(".erp-auction-money").innerText()).includes("10,000"));
        assert((await page.locator(".erp-auction-money").innerText()).includes("500"));
        assert((await page.locator(".erp-auction-money").innerText()).includes("10,700"));
        await page.locator(".erp-auction-record img").click();
        assert((await page.evaluate(() => window.__preview)).startsWith("data:image/"));
        await page.getByRole("button", { name: "PDF", exact: true }).click();
        assert.equal(await page.evaluate(() => window.__pdfId), "JP-NBAA-202609-0001");
        await page.getByRole("button", { name: "CSV导出", exact: true }).click();
        assert.equal((await page.evaluate(() => window.__exports))[0].length, 2);
        await page.getByText("结算明细", { exact: true }).click();
        assert((await page.locator(".erp-auction-settlement-fields").innerText()).includes("11,750"));
        assert((await page.locator(".erp-auction-settlement-fields").innerText()).includes("1,050"));
        await page.waitForFunction(() => { const image = document.querySelector(".erp-auction-record img"); return image && image.complete && image.naturalWidth > 0; });
        const recordShot = await page.locator(".erp-auction-record").screenshot({ type: "jpeg", quality: 45 });
        console.log("AUCTION_RECORD_SHOT:" + width + ":" + recordShot.toString("base64"));
        await page.getByRole("button", { name: "商品详情", exact: true }).click();
        assert(await page.locator(".image-modal").isVisible());
        await page.locator(".image-modal").click({ position: { x: 2, y: 2 } });
        await page.getByRole("button", { name: "清除筛选", exact: true }).click();
        await page.getByLabel("拍卖公司", { exact: true }).selectOption("OBA");
        await page.getByLabel("场次日期", { exact: true }).selectOption("2026-09-10");
        assert.equal(await page.locator(".erp-auction-record").count(), 1);
        await page.getByLabel("拍卖公司", { exact: true }).selectOption("NBAA");
        assert.equal(await page.getByLabel("场次日期", { exact: true }).inputValue(), "");
        await page.getByLabel("场次日期", { exact: true }).selectOption("2026-08-01");
        assert((await page.locator(".erp-auction-money").innerText()).includes("待补充"));
        await page.getByPlaceholder("商品编号 / 商品名 / 落札代码").fill("not-a-product");
        assert(await page.getByText("暂无符合条件的拍卖商品", { exact: true }).isVisible());
        await page.getByRole("button", { name: "清除筛选", exact: true }).click();
        await page.getByText("完整明细横表", { exact: true }).click();
        assert.equal(await page.locator("table th").count(), 16);
      }
      const metrics = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth, buttons: [...document.querySelectorAll("button")].filter(e => e.getClientRects().length).length }));
      console.log("UI_CHECK", view, width, JSON.stringify(metrics));
      await page.screenshot({ path: "verification/screenshots/" + view + "-" + width + ".png", fullPage: true });

    }


    const imageRequests = [];
    await page.route("**/*.supabase.co/storage/**", route => {
      const url = route.request().url();
      imageRequests.push(url);
      if (url.includes("/fallback/") && url.endsWith(".thumb.jpg")) return route.fulfill({ status: 404, body: "" });
      return route.fulfill({ status: 200, contentType: "image/png", body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=", "base64") });
    });
    await page.goto("http://127.0.0.1:4173/?view=photos");
    await page.locator("main img").first().waitFor();
    await page.waitForFunction(() => [...document.querySelectorAll("main img")].some(i => i.complete && i.naturalWidth > 0));
    assert(await page.locator("main img").count() < 200, "10000 products stay paginated");
    assert(imageRequests.length < 200, "30000 photo URLs do not trigger 30000 downloads");
    assert(imageRequests.every(u => u.endsWith(".thumb.jpg")), "list only downloads thumbnails");
    await page.locator("main img:visible").first().click();
    assert((await page.evaluate(() => window.__scalePreview)).endsWith("_thumbv1.jpg"), "preview receives original URL");
    await page.screenshot({ path: "verification/screenshots/photos-" + width + ".png", fullPage: false });
    await page.goto("http://127.0.0.1:4173/?view=fallback");
    await page.waitForFunction(() => { const i = document.querySelector(".fallback-photo"); return i && i.complete && i.naturalWidth > 0 && i.src.endsWith("_thumbv1.jpg"); });
    const imageCheck = await page.evaluate(async () => {
      const { createProductThumbnail, productThumbnailUrl } = await import("/lib/productImages.js");
      const { uploadProductImages } = await import("/lib/imageUpload.js");
      const canvas = document.createElement("canvas");
      canvas.width = 1200; canvas.height = 900;
      canvas.getContext("2d").fillRect(0, 0, 1200, 900);
      const original = canvas.toDataURL("image/png");
      const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
      const thumb = await createProductThumbnail(blob);
      const bitmap = await createImageBitmap(thumb);
      const dimensions = [bitmap.width, bitmap.height]; bitmap.close();
      const uploads = [];
      const storage = {
        upload: async (path, body) => { uploads.push({ path, size: body.size }); return { error: null }; },
        getPublicUrl: path => ({ data: { publicUrl: "https://duaaijqbngltmlgbzrvt.supabase.co/storage/v1/object/public/product-images/" + path } })
      };
      const urls = await uploadProductImages(storage, "CN-202609-TEST", [original]);
      const thumbnailUrl = productThumbnailUrl(urls[0]);
      return { dimensions, type: thumb.type, uploads, urls, thumbnailUrl };
    });
    assert.deepEqual(imageCheck.dimensions, [360, 270]);
    assert.equal(imageCheck.type, "image/jpeg");
    assert.equal(imageCheck.uploads.length, 2);
    assert(imageCheck.uploads[0].path.endsWith(".thumb.jpg"));
    assert(imageCheck.urls[0].endsWith("_thumbv1.png"));
    assert(imageCheck.thumbnailUrl.endsWith(".thumb.jpg"));

    const hydration = await page.evaluate(async () => {
      const db = await window.__openImageDb();
      const rows = Array.from({ length: 10000 }, (_, n) => ({ id: "CACHE-" + n, images: [], imageCount: 3 }));
      await new Promise((resolve, reject) => {
        const tx = db.transaction("item_images", "readwrite");
        for (const row of rows) tx.objectStore("item_images").put({ itemId: row.id, images: ["https://example.com/1.jpg", "https://example.com/2.jpg", "https://example.com/3.jpg"] });
        tx.oncomplete = resolve; tx.onerror = () => reject(tx.error);
      });
      db.close();
      const nativeOpen = indexedDB.open.bind(indexedDB);
      let opens = 0;
      indexedDB.open = (...args) => { opens++; return nativeOpen(...args); };
      let result;
      try { result = await window.__hydrateImages(rows); } finally { indexedDB.open = nativeOpen; }
      return { opens, count: result.length, complete: result.every(row => row.images.length === 3 && row.imageCount === 3) };
    });
    assert.equal(hydration.opens, 1, "10000 cache records use one database connection");
    assert.equal(hydration.count, 10000); assert(hydration.complete);
    console.log("IMAGE_CACHE_SCALE_PASS", width, JSON.stringify(hydration));

    console.log("PHOTO_SCALE_PASS", width, JSON.stringify({ displayed: imageRequests.length, dimensions: imageCheck.dimensions }));

    await page.addInitScript(() => {
      localStorage.clear();
      localStorage.setItem("gouka_erp_login", "yes");
      const fixture = { id: "CN-202609-0001", brand: "CHANEL", item: "Chain Bag", purchaseDate: "2026-09-15", category: "バッグ類", qty: 1, source: "China Supplier", address: "China", purchaseCurrency: "CNY", purchaseCny: 1000, purchaseRateToJpy: 21.8, declaredCurrency: "CNY", declaredCny: 1000, declaredRateToJpy: 21.8, status: "已入库", platform: "EMS", saleJpy: 50000, images: [], memo: "" };
      localStorage.setItem("gouka_erp_v2_items", JSON.stringify([fixture, { ...fixture, id: "CN-202609-0002", item: "Wallet" }]));
    });
    await page.goto("http://127.0.0.1:4173/?view=app");
    await page.locator("aside").waitFor();
    await page.locator("aside").getByRole("button", { name: "库存管理", exact: true }).click();
    await page.locator(".search input").first().fill("Chain");
    await page.locator("aside").getByRole("button", { name: "古物台账", exact: true }).click();
    await page.getByRole("heading", { name: "古物台账", exact: true }).waitFor();
    assert.equal(await page.locator("table tbody tr").count(), 2, "inventory search does not leak into ledger");
    await page.getByRole("button", { name: "编辑商品", exact: true }).first().click();
    assert(await page.getByRole("button", { name: "保存修改", exact: false }).isVisible(), "ledger opens actual product editor");
    assert.equal(errors.length, 0, "App navigation browser errors");
    await page.locator("aside").getByRole("button", { name: "控制台", exact: true }).click();
    await page.locator(".erp-header-todos summary").click();
    assert(await page.locator(".erp-todo-menu").isVisible());
    await page.getByRole("button", { name: /^待出品 \d+$/ }).click();
    await page.getByRole("heading", { name: "出品管理", exact: true }).waitFor();
    assert.equal(await page.locator(".erp-header-todos[open]").count(), 0);
    assert(await page.locator("aside").getByRole("button", { name: "报关清单导出", exact: true }).isVisible());
    console.log("APP_NAVIGATION_PASS", width);
    await page.screenshot({ path: "verification/screenshots/app-" + width + ".png", fullPage: true });

    await page.locator("aside").getByRole("button", { name: "古物台账", exact: true }).click();
    await page.getByRole("button", { name: "编辑商品", exact: true }).first().click();
    let targetWrites = 0, failPhoto = true;
    await page.route("**/*.supabase.co/rest/v1/items**", route => {
      const request = route.request();
      if (request.method() === "POST") {
        const rows = request.postDataJSON();
        if ((Array.isArray(rows) ? rows : [rows]).some(row => row.product_no === "CN-202609-0001")) targetWrites++;
      }
      return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
    });
    await page.route("**/*.supabase.co/storage/v1/object/**", route => {
      if (route.request().method() === "POST") {
        return route.fulfill({ status: failPhoto ? 503 : 200, contentType: "application/json",
          body: failPhoto ? JSON.stringify({ message: "Test upload failure", error: "ServiceUnavailable" }) : JSON.stringify({ Key: "test-photo" }) });
      }
      return route.fulfill({ status: 200, contentType: "image/png", body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=", "base64") });
    });
    const dialogs = [];
    page.on("dialog", d => dialogs.push(d.message()));
    await page.locator('input[type="file"]').first().setInputFiles({ name: "photo.png", mimeType: "image/png",
      buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=", "base64") });
    await page.getByAltText("商品图片1", { exact: true }).waitFor();
    await page.getByRole("button", { name: "保存修改", exact: false }).click();
    await page.waitForFunction(() => document.body.innerText.includes("照片上传失败"));
    assert.equal(targetWrites, 0, "failed photo never saves an incomplete cloud product");
    assert(await page.getByRole("button", { name: "保存修改", exact: false }).isVisible(), "failed upload keeps product editor");
    assert.equal(await page.getByAltText("商品图片1", { exact: true }).count(), 1, "failed upload keeps photo");
    assert(dialogs.some(message => message.includes("上传失败")), "failure is visible to user");
    failPhoto = false;
    await page.getByRole("button", { name: "保存修改", exact: false }).click();
    await page.getByRole("heading", { name: "库存管理", exact: true }).waitFor();
    assert(targetWrites > 0, "retry saves the same product");
    assert.equal(errors.length, 0, "upload failures do not cause uncaught browser errors");
    console.log("ACTUAL_EDITOR_UPLOAD_RETRY_PASS", width);

    await page.close();
  }
  console.log("All desktop/mobile workflow checks passed");
} finally {
  if (browser) await browser.close();
  server.kill("SIGTERM");
  fs.writeFileSync("main.jsx", candidate);
}
