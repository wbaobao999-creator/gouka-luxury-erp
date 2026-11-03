import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const require = createRequire('C:/Users/admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json');
const { chromium } = require('playwright');
const target = fileURLToPath(new URL('../../../work/erp-secure-release-20261021/', import.meta.url));
const source = fs.readFileSync(target + 'main.jsx', 'utf8');
const offset = source.lastIndexOf('createRoot(document.getElementById("root")).render(');
assert(offset > 0);
const pdfStart = source.indexOf('  function exportInventoryPdf(');
const pdfEnd = source.indexOf('  function exportLedgerPdf(', pdfStart);
assert(pdfStart >= 0 && pdfEnd > pdfStart);
const itemPdfStart = source.indexOf('  function exportItemPdf(');
const summaryStart = source.indexOf('  const inventorySummary =');
const summaryEnd = source.indexOf('  const headers =', summaryStart);
const stockDaysStart = source.indexOf('  function stockDays(');
const stockDaysEnd = source.indexOf('  function storageLocation(', stockDaysStart);
const harness = `
const fixtureBase = {...emptyForm, purchaseCurrency:'JPY',purchaseRateToJpy:1,qty:1,images:[],brand:'Fixture',purchaseDate:'2026-10-01'};
const fixtureItems = [
 {...fixtureBase,id:'STOCK-PRICED',item:'Priced',status:'已入库',purchaseCny:200,saleJpy:110},
 {...fixtureBase,id:'STOCK-UNPRICED',item:'Unpriced',status:'待出品',purchaseCny:100,saleJpy:0},
 ...['已售出','已发货','退货','待退回'].map((status,i)=>({...fixtureBase,id:'EXCLUDED-'+i,item:'Excluded',status,purchaseCny:10000,saleJpy:22000}))
];
function InventoryFixture() {
 const [items,setItems] = useState(fixtureItems);
 const inventoryItems=items;
 ${source.slice(stockDaysStart,stockDaysEnd)}
 ${source.slice(summaryStart,summaryEnd)}
 window.__inventory = {summary:summarizeCurrentInventory(items),tableSummary:inventorySummary,setItems,fixtureItems};
 window.__businessHelpers={buildAiBusinessStats,answerAiQuestion,calendarProductSales,productProfitReference,exportItemPdf};
 const companyPdfHeader=()=>'',pdfImageHtml=()=>'',htmlEscape=value=>String(value||''),openPdfWindow=(title,body)=>{window.__inventoryPdf=body;};
 ${source.slice(itemPdfStart,pdfStart)}
 ${source.slice(pdfStart,pdfEnd)}
 return <main style={{margin:0,padding:12,width:'100%',boxSizing:'border-box'}}>{location.search.includes('pdf')
 ? <PdfExportPanel items={items} totals={{cost:999999,profit:-999999}} exportInventoryPdf={exportInventoryPdf}/>
 : <Dashboard items={items} totals={{cost:999999,profit:-999999,sale:999999}} setTab={()=>{}}/>}</main>;
}
createRoot(document.getElementById('root')).render(<InventoryFixture/>);`;
const fixturePath = target + 'inventory-fixture.jsx';
const htmlPath = target + 'inventory-fixture.html';
fs.writeFileSync(fixturePath, source.slice(0, offset) + harness);
fs.writeFileSync(htmlPath, '<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="/inventory-fixture.jsx"></script></body></html>');
const server = spawn(process.execPath, [target+'node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','4198','--strictPort'], {cwd:target,stdio:'ignore'});
let browser;
try {
 for(let i=0;i<60;i++) {try {if((await fetch('http://127.0.0.1:4198/')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch({headless:true,channel:'msedge'});
 for(const width of [1440,390]) {
  const page=await browser.newPage({viewport:{width,height:1000}}), errors=[];
  page.on('pageerror',e=>{errors.push(e.message);console.error(e.message);});
  await page.route('**/*.supabase.co/**',r=>r.abort());
  await page.goto('http://127.0.0.1:4198/inventory-fixture.html');
  await page.waitForFunction(()=>window.__inventory);
  const summary=await page.evaluate(()=>window.__inventory.summary);
  assert.equal(summary.count,2);assert.equal(summary.cost,300);
  assert.equal(summary.pricedCount,1);assert.equal(summary.missingPrice,1);
  assert.equal(summary.expectedSale,110);assert(Math.abs(summary.expectedProfit+100)<0.001);
  const tableSummary=await page.evaluate(()=>window.__inventory.tableSummary);
  assert.equal(tableSummary.count,2);assert.equal(tableSummary.cost,300);
  assert(Math.abs(tableSummary.profit+100)<0.001);
  const business=await page.evaluate(()=>{
   const helpers=window.__businessHelpers;
   const oldDate=new Date(Date.now()-100*86400000).toISOString().slice(0,10);
   const unpriced={...window.__inventory.fixtureItems[1],brand:'Unsold',source:'Unsold supplier',purchaseCny:1000000,purchaseDate:oldDate};
   const sold={...window.__inventory.fixtureItems[0],id:'ACTUAL-SALE',brand:'Realized',source:'Realized supplier',status:'已售出',soldPriceJpy:110000,soldDate:'2026-10-01',salesRecord:{salePriceTaxIncludedJpy:110000,saleDate:'2026-10-01',platformFeeJpy:0,settlementVersion:2,salesStatus:'已成交'}};
   const items=[unpriced,sold],stats=helpers.buildAiBusinessStats(items,[]);
   return {stats,inventoryAnswer:helpers.answerAiQuestion('库存总成本多少',items,[],{}),ageAnswer:helpers.answerAiQuestion('哪些库存超过90天',items,[],{}),supplierAnswer:helpers.answerAiQuestion('哪个供应商最赚钱',items,[],{}),actualProfit:helpers.calendarProductSales([sold]).totals.profitJpy};
  });
  assert.equal(business.stats.totalCost,1000000);assert.equal(business.stats.longTerm.length,1);
  assert.equal(business.stats.brandProfit.length,1);assert.equal(business.stats.brandProfit[0][0],'Realized');
  assert.equal(business.stats.brandProfit[0][1].profit,business.actualProfit);
  assert.match(business.inventoryAnswer,/未定/);assert.match(business.ageAnswer,/库存预警/);
  assert.match(business.supplierAnswer,/供应商利润排行/);assert(!business.supplierAnswer.includes('Unsold supplier'));
  await page.evaluate(()=>{
   const h=window.__businessHelpers,unpriced=window.__inventory.fixtureItems[1];
   if(h.productProfitReference(unpriced)!==null)throw new Error('Unpriced product profit must be undetermined');
   h.exportItemPdf(unpriced);
  });
  const itemPdf=await page.evaluate(()=>window.__inventoryPdf);
  assert.match(itemPdf,/不含税利润参考<\/small><b>未定/);
  assert.match(itemPdf,/利润率<\/small><b>未定/);
  assert.match(await page.locator('.gouka-simple-home-total').innerText(),/300/);
  await page.goto('http://127.0.0.1:4198/inventory-fixture.html?pdf');
  await page.waitForFunction(()=>window.__inventory);
  assert.match(await page.locator('.grid4').innerText(),/库存总成本（2件）\s*¥300/);
  assert.match(await page.locator('.grid4').innerText(),/已定价1件/);
  assert.equal(await page.getByRole('cell',{name:'未定',exact:true}).count(),3);
  await page.getByRole('button',{name:'库存PDF',exact:true}).click();
  assert.deepEqual(errors,[]);
  const pdf=await page.evaluate(()=>window.__inventoryPdf);
  assert(pdf.includes('STOCK-PRICED')&&pdf.includes('STOCK-UNPRICED'));
  assert(!pdf.includes('EXCLUDED-'));assert(pdf.includes('未设预计售价'));
  await page.evaluate(()=>window.__inventory.setItems(window.__inventory.fixtureItems.map(x=>({...x,saleJpy:0}))));
  await page.waitForFunction(()=>window.__inventory.summary.pricedCount===0);
  assert.match(await page.locator('.grid4').innerText(),/已定价0件）\s*未定/);
  await page.getByRole('button',{name:'库存PDF',exact:true}).click();
  assert.match(await page.evaluate(()=>window.__inventoryPdf),/已定价库存预估差额<\/small><b>未定/);
  fs.mkdirSync('verification/screenshots',{recursive:true});
  await page.screenshot({path:'verification/screenshots/inventory-statistics-'+width+'.png',fullPage:true});
  assert.deepEqual(errors,[]);
  console.log('PASS inventory scope, cost, unpriced and negative-profit rules, PDF export: '+width+'px');
  await page.close();
 }
} finally {
 await browser?.close();server.kill();
 fs.rmSync(fixturePath,{force:true});fs.rmSync(htmlPath,{force:true});
}
