import assert from "node:assert/strict";
import fs from "node:fs";
import { chromium } from "playwright";
const base = "https://gouka-luxury-erp.vercel.app";
const response = await fetch(base + "/?verify=photo-scale", { cache: "no-store" });
assert(response.ok, "production HTML available");
const html = await response.text();
const script = html.match(/<script[^>]+src="([^"]+)"/)?.[1];
assert(script, "production script found");
const bundleResponse = await fetch(new URL(script, base));
assert(bundleResponse.ok);
const bundle = await bundleResponse.text();
for (const marker of ["照片上传失败，未保存商品", "_thumbv1", "读取期间云端商品发生变化"]) assert(bundle.includes(marker), "new production build contains " + marker);
const browser = await chromium.launch();
fs.mkdirSync("verification/screenshots", { recursive: true });
try {
  for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    const errors = [];
    page.on("pageerror", error => errors.push(String(error)));
    page.on("dialog", dialog => dialog.dismiss());
    await page.route("**/*.supabase.co/**", route => route.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
    await page.addInitScript(() => {
      localStorage.clear(); localStorage.setItem("gouka_erp_login", "yes");
      const item = { id: "CN-202609-VERIFY", brand: "CHANEL", item: "线上隔离测试商品", purchaseDate: "2026-09-15",
        category: "バッグ類", qty: 1, purchaseCurrency: "CNY", purchaseCny: 1000, purchaseRateToJpy: 21.8,
        declaredCurrency: "CNY", declaredCny: 1000, declaredRateToJpy: 21.8, status: "已入库", platform: "EMS",
        saleJpy: 50000, images: ["data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII="] };
      localStorage.setItem("gouka_erp_v2_items", JSON.stringify([item]));
    });
    await page.goto(base);
    await page.locator("aside").waitFor();
    await page.locator("aside").getByRole("button", { name: "库存管理", exact: true }).click();
    await page.getByRole("heading", { name: "库存管理", exact: true }).waitFor();
    assert((await page.locator("main").innerText()).includes("线上隔离测试商品"));
    const image = page.locator("main img:visible").first();
    await image.scrollIntoViewIfNeeded();
    await page.waitForFunction(() => [...document.querySelectorAll("main img")].some(img => img.getClientRects().length && img.complete && img.naturalWidth > 0));
    await image.click();
    await page.locator(".image-modal").waitFor();
    await page.locator(".image-modal").click({ position: { x: 2, y: 2 } });
    const layout = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
    assert(layout.scroll <= layout.width + 1);
    assert.equal(errors.length, 0, "production browser errors");
    await page.screenshot({ path: "verification/screenshots/production-" + width + ".png", fullPage: false });
    const shot = await page.screenshot({ type: "jpeg", quality: 40, fullPage: false });
    console.log("PRODUCTION_SHOT:" + width + ":" + shot.toString("base64"));
    await page.locator("aside").getByRole("button", { name: "古物台账", exact: true }).click();
    await page.getByRole("heading", { name: "古物台账", exact: true }).waitFor();
    await page.getByRole("button", { name: "编辑商品", exact: true }).first().click();
    await page.getByRole("button", { name: "保存修改", exact: false }).waitFor();
    assert.equal(errors.length, 0);
    console.log("PRODUCTION_SMOKE_PASS", width, script);
    await page.close();
  }
} finally { await browser.close(); }
