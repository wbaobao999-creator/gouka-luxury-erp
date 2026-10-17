import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
const require=createRequire('C:/Users/admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json');
const {chromium}=require('playwright');
const {PNG}=require('pngjs');
const source=fs.readFileSync('main.jsx','utf8');
const offset=source.lastIndexOf('createRoot(document.getElementById("root")).render(');
assert(offset>0);
const harness=`
function PreviewFixture(){
 const original='https://duaaijqbngltmlgbzrvt.supabase.co/storage/v1/object/public/product-images/fixture/photo_thumbv1.png';
 const [items,setItems]=useState([{...emptyForm,id:'TEST-001',brand:'Fixture',item:'Photo fixture',purchaseDate:'2026-10-17',status:'已售出',soldPriceJpy:99000,soldPlatform:'NBAA',soldDate:'2026-10-17',images:[original]}]);
 window.__setPreviewImages=(src)=>setItems(xs=>xs.map(x=>({...x,images:[src]})));
 const ledger=new URLSearchParams(location.search).get('view')==='ledger';
 return <main style={{margin:0,padding:12,width:'100%',boxSizing:'border-box'}}>{ledger?<Ledger items={items} setItems={setItems} isOwner downloadCSV={()=>{}} exportItemPdf={()=>{}} editItem={()=>{}} />:<SalesReport items={items} downloadCSV={()=>{}} updateListingItem={async()=>{}}/>}<section className="unrelated"><img className="thumb" src={original} alt="unrelated photo" style={{width:72,height:72}}/></section></main>;
}
createRoot(document.getElementById('root')).render(<PreviewFixture/>);`;
fs.writeFileSync('preview-fixture.jsx',source.slice(0,offset)+harness);
fs.writeFileSync('preview-fixture.html','<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="/preview-fixture.jsx"></script><script type="module" src="/lib/tableImagePreview.jsx"></script></body></html>');
fs.mkdirSync('verification/screenshots',{recursive:true});
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','4189'],{stdio:'pipe'});
server.stderr.on('data',b=>process.stderr.write(b));
let browser;
const image=(width,height,color,label)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="${color}"/><text x="30" y="70" fill="white" font-size="40">${label}</text></svg>`;
try{
 for(let n=0;n<50;n++){try{if((await fetch('http://127.0.0.1:4189/preview-fixture.html')).ok)break;}catch{}await new Promise(r=>setTimeout(r,200));}
 browser=await chromium.launch({headless:true,channel:'msedge'});
 for(const width of [1440,390]){
  const page=await browser.newPage({viewport:{width,height:1000}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.dismiss());
  let thumbnailsOnly=false;
  await page.route('**/*.supabase.co/**',r=>{
   if(r.request().resourceType()!=='image')return r.fulfill({status:200,contentType:'application/json',body:'[]'});
   const path=new URL(r.request().url()).pathname;
   if(path.includes('missing'))return r.fulfill({status:404,body:''});
   if(path.endsWith('.thumb.jpg'))return r.fulfill({status:200,contentType:'image/svg+xml',body:image(160,100,'#6f1260','THUMB')});
   if(thumbnailsOnly||path.endsWith('_thumbv1.jpg')||path.endsWith('_thumbv1.webp')||path.endsWith('_thumbv1.gif'))return r.fulfill({status:404,body:''});
   return r.fulfill({status:200,contentType:'image/svg+xml',body:image(1200,800,'#126f45','ORIGINAL 1200 x 800')});
  });
  for(const view of ['sales','ledger']){
   await page.goto('http://127.0.0.1:4189/preview-fixture.html?view='+view);
   const modes=view==='ledger'?['登记列表','原始横表','详细卡片']:['sales'];
   for(const mode of modes){
    if(mode!=='sales')await page.getByRole('button',{name:mode,exact:true}).click();
    const thumb=page.getByRole('button',{name:'查看商品大图',exact:true}).first();
    await thumb.click();
    const dialog=page.getByRole('dialog',{name:'商品大图',exact:true});
    await dialog.waitFor();
    await page.waitForFunction(()=>document.querySelector('.table-photo-preview img')?.naturalWidth===1200);
    assert((await dialog.locator('img').getAttribute('src')).endsWith('photo_thumbv1.png'),'opens original PNG after JPG fallback');
    const pixels=PNG.sync.read(await dialog.locator('img').screenshot());
    const index=((pixels.height-20)*pixels.width+pixels.width-20)*4;
    assert.deepEqual([...pixels.data.subarray(index,index+3)],[18,111,69],'original pixels are rendered');
    await dialog.getByRole('button',{name:'放大',exact:true}).click();
    assert((await dialog.innerText()).includes('125%'));
    await dialog.getByRole('button',{name:'复位',exact:true}).click();
    assert((await dialog.innerText()).includes('100%'));
    await page.screenshot({path:`verification/screenshots/${view}-${mode}-${width}-preview.png`});
    await page.keyboard.press('Escape');
    assert.equal(await dialog.count(),0);
    await thumb.press('Enter');
    await dialog.waitFor();
    await dialog.getByRole('button',{name:'关闭大图',exact:true}).click();
    assert.equal(await dialog.count(),0);
   }
   await page.locator('.unrelated img').click();
   assert.equal(await page.getByRole('dialog',{name:'商品大图',exact:true}).count(),0,'other pages are unaffected');
   thumbnailsOnly=true;
   await page.evaluate(()=>window.__setPreviewImages('https://duaaijqbngltmlgbzrvt.supabase.co/storage/v1/object/public/product-images/fixture/fallback_thumbv1.png'));
   await page.waitForFunction(()=>{const i=document.querySelector('main img.thumb');return i?.currentSrc.includes('fallback')&&i.complete;});
   await page.getByRole('button',{name:'查看商品大图',exact:true}).first().click();
   await page.getByText('原图不可用，当前显示缩略图',{exact:true}).waitFor();
   await page.keyboard.press('Escape');
   thumbnailsOnly=false;
   await page.evaluate(()=>window.__setPreviewImages('https://duaaijqbngltmlgbzrvt.supabase.co/storage/v1/object/public/product-images/fixture/missing.jpg'));
   await page.waitForFunction(()=>document.querySelector('main img.thumb')?.getAttribute('src')?.includes('missing'));
   await page.getByRole('button',{name:'查看商品大图',exact:true}).first().click();
   await page.getByText('图片暂时无法加载',{exact:true}).waitFor();
   await page.keyboard.press('Escape');
   assert.deepEqual(errors,[]);
   console.log(`PASS ${view} ${width}px: original pixels, zoom/reset, keyboard/close, fallback and error state`);
  }
  await page.close();
 }
}finally{
 await browser?.close();server.kill();
 fs.rmSync('preview-fixture.jsx',{force:true});fs.rmSync('preview-fixture.html',{force:true});
}
