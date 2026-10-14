import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
const require = createRequire('C:/Users/admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json');
const { chromium } = require('playwright');
const source = fs.readFileSync('main.jsx', 'utf8');
const offset = source.lastIndexOf('createRoot(document.getElementById("root")).render(');
assert(offset > 0);
const harness = `
const fixture = { ...emptyForm, id:'TEST-001', brand:'LV', item:'Phone Case', status:'已入库', purchaseCurrency:'JPY', purchaseCny:50000, purchaseRateToJpy:1, platformFeeJpy:1000, saleJpy:150000 };
window.__sales = { fixture, calcSalesSettlement, getSalesRecordFromProduct, buildSalesRecordPatch, parseSalesRecordMemo, calcTax, calcSalesBreakdown };
function SalesTest() {
 const [items,setItems] = useState([fixture]);
 const [form,setForm] = useState({...fixture,status:'已售出',soldPriceJpy:''});
 window.__items = items; window.__setItems = setItems; window.__form = form;
 const view = new URLSearchParams(location.search).get('view');
 return <main style={{margin:0,width:'100%',boxSizing:'border-box',padding:16}}>{view === 'product' ? <AddForm form={form} setForm={setForm} saveItem={()=>{}} resetForm={()=>{}} editingId={fixture.id} handleImages={()=>{}} removeImage={()=>{}} dictionaries={DEFAULT_DICTIONARIES} suppliers={[]} customsBatches={[]} /> : <SalesReport items={items} updateListingItem={async (id,patch)=>setItems(xs=>xs.map(x=>x.id===id?{...x,...patch}:x))} downloadCSV={(headers,rows)=>{window.__csv={headers,rows};}} />}</main>;
}
createRoot(document.getElementById('root')).render(<SalesTest />);
`;
// Generated test entry keeps production source untouched.
fs.writeFileSync('sales-test.jsx', source.slice(0,offset) + harness);
fs.writeFileSync('sales-test.html','<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="/sales-test.jsx"></script></body></html>');
fs.mkdirSync('verification/screenshots',{recursive:true});
const server = spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','4187'],{stdio:'pipe'});
server.stderr.on('data',b=>process.stderr.write(b));
let browser;
try {
 for(let n=0;n<50;n++){try{if((await fetch('http://127.0.0.1:4187/sales-test.html')).ok)break;}catch{} await new Promise(r=>setTimeout(r,200));}
 browser=await chromium.launch({headless:true,channel:'msedge'});
 for(const width of [1440,390]){
  const page=await browser.newPage({viewport:{width,height:1000}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.dismiss());
  await page.route('**/*.supabase.co/**',r=>r.fulfill({status:200,contentType:'application/json',body:'[]'}));
  await page.goto('http://127.0.0.1:4187/sales-test.html');
  await page.waitForFunction(()=>window.__sales);
  const checks=await page.evaluate(()=>{
   const f=window.__sales, item=f.fixture;
   const patch=f.buildSalesRecordPatch(item,{saleDate:'2026-10-15',platform:'NBAA',salePriceTaxIncludedJpy:99000,platformFeeJpy:3960,finalDepositJpy:0});
   const record=f.getSalesRecordFromProduct({...item,...patch});
   const roundtrip=f.getSalesRecordFromProduct({...item,soldPriceJpy:patch.soldPriceJpy,soldMemo:patch.soldMemo});
   const clear=f.buildSalesRecordPatch({...item,...patch},{...record,platformFeeJpy:0,finalDepositJpy:0});
   return {record,roundtrip,patch,clear,estimated:f.getSalesRecordFromProduct(item),profit:f.calcTax({...item,...patch}).profitExTax};
  });
  assert.equal(checks.estimated.salePriceTaxIncludedJpy,0,'estimated price is not a sale');
  assert.equal(checks.estimated.platformFeeJpy,0,'purchase fee is not selling fee');
  assert.equal(checks.record.expectedDepositJpy,95040);
  assert.equal(checks.record.finalDepositJpy,0);
  assert.equal(checks.record.salesStatus,'已成交');
  assert(Math.abs(checks.record.actualProfitJpy-35400)<0.01);
  assert(Math.abs(checks.profit-35400)<0.01);
  assert.equal(checks.roundtrip.expectedDepositJpy,95040);
  assert.equal(checks.roundtrip.finalDepositJpy,0);
  assert.equal(checks.clear.salesRecord.platformFeeJpy,0,'explicit zero clears fee');
  assert(!Object.hasOwn(checks.patch,'platformFeeJpy'),'purchase cost is not overwritten');
  await page.getByRole('button',{name:'新增销售',exact:true}).click();
  await page.locator('.sales-draft-grid label').filter({hasText:/^平台/}).locator('select').selectOption('NBAA');
  assert.equal(await page.getByRole('button',{name:'含税金额',exact:true}).count(),0,'NBAA has fixed tax-exclusive entry');
  await page.getByLabel('成交价 JPY（税前）',{exact:true}).fill('90000');
  await page.getByLabel('销售手续费 JPY（税前）',{exact:true}).fill('3600');
  assert((await page.locator('.sales-amount-summary').innerText()).includes('95,040'));
  await page.screenshot({path:'verification/screenshots/sales-'+width+'.png',fullPage:true});
  await page.getByRole('button',{name:'保存销售记录',exact:true}).click();
  await page.waitForFunction(()=>window.__items[0].soldPriceJpy===99000);
  assert.equal(await page.evaluate(()=>window.__items[0].salesRecord.finalDepositJpy),0);
  assert((await page.locator('tbody').first().innerText()).includes('未回款'));
  assert((await page.locator('tbody').first().innerText()).includes('95,040'));
  await page.getByRole('button',{name:'编辑',exact:true}).first().click();
  await page.getByLabel('实收金额 JPY（未到账留空）',{exact:true}).fill('95040');
  await page.getByRole('button',{name:'保存销售记录',exact:true}).click();
  await page.waitForFunction(()=>window.__items[0].salesRecord.finalDepositJpy===95040);
  assert((await page.locator('tbody').first().innerText()).includes('已回款'));
  await page.evaluate(()=>window.__setItems([{...window.__sales.fixture,status:'已售出',soldPriceJpy:90000,soldPlatform:'NBAA',salesRecord:{salePriceTaxIncludedJpy:90000,platformFeeJpy:3600,finalDepositJpy:95040,platform:'NBAA'}}]));
  await page.getByRole('button',{name:'编辑',exact:true}).first().click();
  await page.getByRole('button',{name:'按NBAA税前金额修正',exact:true}).click();
  assert.equal(await page.getByLabel('成交价 JPY（税前）',{exact:true}).inputValue(),'90000');
  assert.equal(await page.getByLabel('销售手续费 JPY（税前）',{exact:true}).inputValue(),'3600');
  assert((await page.locator('.sales-amount-summary').innerText()).includes('95,040'));
  await page.getByRole('button',{name:'保存销售记录',exact:true}).click();
  await page.waitForFunction(()=>window.__items[0].salesRecord.salePriceTaxIncludedJpy===99000);
  await page.getByRole('button',{name:'编辑',exact:true}).first().click();
  assert.equal(await page.getByLabel('成交价 JPY（税前）',{exact:true}).inputValue(),'90000','reopen preserves hammer price');
  assert.equal(await page.getByRole('button',{name:'按NBAA税前金额修正',exact:true}).count(),0,'correction cannot be applied twice');
  await page.goto('http://127.0.0.1:4187/sales-test.html?view=product');
  await page.getByRole('button',{name:'税前金额',exact:true}).click();
  await page.getByLabel('成交价 JPY（税前）',{exact:true}).fill('90000');
  await page.getByLabel('销售手续费 JPY（税前）',{exact:true}).fill('3600');
  assert.equal(await page.evaluate(()=>window.__form.soldPriceJpy),99000);
  assert.equal(await page.evaluate(()=>window.__form.salesRecord.platformFeeJpy),3960);
  await page.locator('.sales-amount-fields').scrollIntoViewIfNeeded();
  await page.screenshot({path:'verification/screenshots/product-'+width+'.png'});
  const overflow=await page.locator('.sales-amount-fields').evaluate(el=>el.scrollWidth>el.clientWidth+1);
  assert.equal(overflow,false,'amount controls fit');
  assert.deepEqual(errors,[]);
  await page.close();
  console.log('PASS settlement, cloud memo, purchase-cost isolation, save/reopen, receipt and product editor at '+width+'px');
 }
} finally { await browser?.close();server.kill();fs.rmSync('sales-test.jsx',{force:true});fs.rmSync('sales-test.html',{force:true}); }
