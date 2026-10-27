import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const require=createRequire('C:/Users/admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json');
const {chromium}=require('playwright');
const release=process.argv.includes('--release');
const scrollCheck=process.argv.includes('--scroll-check');
const recoveryCheck=process.argv.includes('--recovery-check');
const serverErrorCheck=process.argv.includes('--server-error-check');
const syncCheck=process.argv.includes('--sync-check');
const snapshotIndex=process.argv.indexOf('--snapshot');
const auditSnapshot=snapshotIndex>=0?JSON.parse(fs.readFileSync(process.argv[snapshotIndex+1],'utf8')):null;
const target=fileURLToPath(new URL(release?'../../../work/erp-secure-release-20261021/':'../../../work/erp-secure-preview-20261021/',import.meta.url));
const heading=release?'豪嘉ERP｜中古奢侈品管理系统':'豪嘉ERP｜只读验收';
const source=fs.readFileSync(target+'main.jsx','utf8');
assert(!source.includes('const USERS =')&&!source.includes('function LoginPage('));
const service=fs.readFileSync(target+'itemService.js','utf8');
assert.equal((service.match(/throw new Error\("这是只读验收环境/g)||[]).length,release?0:6);
const server=spawn(process.execPath,[target+'node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','4197','--strictPort'],{cwd:target,stdio:'ignore'});
const id='11111111-2222-4333-8444-555555555555';
const baseUser={id,aud:'authenticated',role:'authenticated',email:'fixture@example.invalid',email_confirmed_at:'2026-01-01T00:00:00Z',app_metadata:{erp_role:'owner',provider:'email',providers:['email']},user_metadata:{},identities:[],created_at:'2026-01-01T00:00:00Z'};
const accessToken=[{alg:'HS256',typ:'JWT'},{sub:id,role:'authenticated',aud:'authenticated',exp:Math.floor(Date.now()/1000)+(syncCheck?7*86400:3600)},'fixture-signature'].map((part,i)=>i===2?part:Buffer.from(JSON.stringify(part)).toString('base64url')).join('.');
let browser;
try {
 for(let i=0;i<60;i++){try{if((await fetch('http://127.0.0.1:4197/')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch({headless:true,channel:'msedge'});
 for(const width of [1440,390]) for(const role of auditSnapshot||scrollCheck||recoveryCheck||serverErrorCheck||syncCheck?['owner']:(release?['owner','staff','tax']:['owner'])) {
  const user={...baseUser,app_metadata:{...baseUser.app_metadata,erp_role:role}};
  const context=await browser.newContext({viewport:{width,height:950}});
  await context.addInitScript(()=>localStorage.setItem('gouka_erp_login','yes'));
  if(recoveryCheck)await context.addInitScript(({token,user})=>{
   if(localStorage.getItem('recovery-fixture-seeded'))return;
   localStorage.setItem('recovery-fixture-seeded','yes');
   localStorage.setItem('gouka_recovery_business_sentinel','KEEP');
   localStorage.setItem('sb-duaaijqbngltmlgbzrvt-auth-token',JSON.stringify({access_token:token,refresh_token:'stale-fixture-refresh',expires_at:1,expires_in:1,token_type:'bearer',user}));
  },{token:accessToken,user});
  const mutations=[],errors=[];
  let sealReads=0, userReads=0, itemReads=0, recovered=false;
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  if(scrollCheck||recoveryCheck||syncCheck)await page.clock.install();
  page.on('dialog',dialog=>dialog.accept());
  await page.route('**/*.supabase.co/**',async route=>{
   const request=route.request(),url=new URL(request.url());
   const json=data=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
   if(url.pathname==='/auth/v1/token') {
    if(serverErrorCheck)return route.fulfill({status:500,contentType:'application/json',body:JSON.stringify({code:'unexpected_failure',msg:'Fixture server failure'})});
    if(recoveryCheck&&!recovered)return;
    return json({access_token:accessToken,refresh_token:'fixture-refresh',expires_in:syncCheck?7*86400:3600,token_type:'bearer',user});
   }
   if(url.pathname==='/auth/v1/user') { userReads++; return json(user); }
   if(url.pathname==='/auth/v1/logout')return route.fulfill({status:204});
   if(url.pathname==='/rest/v1/erp_company_assets') { sealReads++; return json({value:{dataUrl:'data:image/png;base64,aW1hZ2U='}}); }
   if(url.pathname.startsWith('/rest/v1/')&&request.method()!=='GET') {
    mutations.push({method:request.method(),path:url.pathname,body:request.postDataJSON()});
    if(release&&url.pathname==='/rest/v1/items')return json(request.postDataJSON()[0]);
   }
   if(url.pathname==='/rest/v1/items'&&request.method()==='GET'){
    itemReads++;
    const rows=url.searchParams.has('product_no')?[]:(auditSnapshot?.items||[{product_no:'PREVIEW-ONLY',purchase_date:'2026-10-01',purchase_currency:'JPY',purchase_amount:100,purchase_rate:1,brand:'Fixture',item:'Read only',status:'已入库',qty:1,cloud_images:[]}]);
    if(syncCheck&&!url.searchParams.has('product_no'))rows.push({product_no:'__GOUKA_ERP_GLOBAL_STATE__',memo:'__GOUKA_ERP_GLOBAL_STATE_JSON__'+JSON.stringify({version:1,savedAt:'2026-10-21T00:00:00Z',dictionaries:{},suppliers:[],deleteLogs:[],customsBatches:[],cashflow:{}})});
    return route.fulfill({status:200,contentType:'application/json',headers:{'content-range':rows.length?'0-'+(rows.length-1)+'/'+rows.length:'*/0'},body:JSON.stringify(rows)});
   }
   return route.fulfill({status:403,contentType:'application/json',body:JSON.stringify({message:'Blocked by isolated test'})});
  });
  await page.goto('http://127.0.0.1:4197/');
  if(recoveryCheck) {
   await page.getByRole('status').filter({hasText:'正在验证访问权限'}).waitFor();
   await page.clock.runFor(21000);
   await page.getByRole('alert').filter({hasText:'登录连接等待超时'}).waitFor();
   assert.equal(await page.getByRole('heading',{name:heading,exact:true}).count(),0);
   recovered=true;
   await page.getByRole('button',{name:'重置登录连接',exact:true}).click();
   await page.getByLabel('邮箱',{exact:true}).waitFor();
   assert.equal(await page.evaluate(()=>localStorage.getItem('gouka_recovery_business_sentinel')),'KEEP');
   assert.equal(await page.evaluate(()=>localStorage.getItem('sb-duaaijqbngltmlgbzrvt-auth-token')),null);
  }
  await page.getByLabel('邮箱',{exact:true}).waitFor();
  assert.equal(await page.getByRole('heading',{name:heading,exact:true}).count(),0);
  await page.getByLabel('邮箱',{exact:true}).fill(user.email);
  await page.getByLabel('密码',{exact:true}).fill('offline-fixture-only');
  await page.getByRole('button',{name:'登录',exact:true}).click();
  if(serverErrorCheck) {
   const alert=page.getByRole('alert');
   await alert.filter({hasText:'登录服务发生服务器错误'}).waitFor();
   await page.waitForTimeout(1000);
   assert(await alert.isVisible(),'Cleanup SIGNED_OUT must not swallow the login error');
   assert.equal(await page.getByRole('heading',{name:heading,exact:true}).count(),0);
   assert.equal(await page.getByLabel('密码',{exact:true}).inputValue(),'');
   assert.deepEqual(mutations,[]);assert.deepEqual(errors,[]);
   console.log('PASS real SDK server-500 login '+width+'px: persistent safe error, no access or business writes; all APIs mocked');
   await context.close();continue;
  }
  await page.getByRole('heading',{name:heading,exact:true}).waitFor();
  const expectedProducts=auditSnapshot?auditSnapshot.items.filter(x=>x.product_no!=='__GOUKA_ERP_GLOBAL_STATE__').length:1;
  await page.waitForFunction(count=>document.body.innerText.includes('已读取云端 '+count+' 件'),expectedProducts);
  if(syncCheck) {
   const initialReads=itemReads;
   for(let cycle=0;cycle<4;cycle++) {
    await page.clock.runFor(31000);
    await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
    await page.clock.runFor(20);
    await page.waitForTimeout(50);
   }
   assert.equal(itemReads,initialReads,'Short intervals and focus events must not poll cloud data');
   await page.clock.fastForward(12*60*60*1000);
   await page.waitForFunction(()=>document.body.innerText.includes('自动读取云端'));
   assert.equal(itemReads,initialReads+2,'One background read (data page plus end cursor) is due after twelve hours');
   const scheduledReads=itemReads;
   await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
   await page.clock.runFor(100);
   assert.equal(itemReads,scheduledReads,'Returning to the page must not immediately read again');
   assert.deepEqual(mutations,[],'Reading global state must never echo a write');
   await page.getByRole('button',{name:'从云端读取',exact:true}).click();
   await page.waitForFunction(()=>document.body.innerText.includes('已读取云端 1 件'));
   assert.equal(itemReads,scheduledReads+2,'Manual cloud read remains available');
   await page.getByRole('button',{name:'保存到云端',exact:true}).click();
   await page.waitForFunction(()=>document.body.innerText.includes('已同步 1 件'));
   assert(mutations.some(m=>m.body?.some(row=>row.product_no==='__GOUKA_ERP_GLOBAL_STATE__')),'Explicit save must still persist global state');
   assert.deepEqual(errors,[]);
   console.log('PASS twelve-hour sync '+width+'px: no short/focus polling, one read after twelve hours, zero echo writes, manual read/save preserved; all APIs mocked');
   await context.close();continue;
  }
  if(recoveryCheck) {
   assert.deepEqual(errors,[]);
   console.log('PASS login recovery '+width+'px: stalled expired session times out, login-only reset preserves business storage, fresh verified login succeeds; all APIs mocked');
   await context.close();continue;
  }
  if(scrollCheck) {
   await page.getByRole('button',{name:'商品录入',exact:true}).click();
   const draft=page.locator('main textarea').last();
   await draft.fill('UNSAVED SCROLL REGRESSION');
   await draft.focus();
   await page.waitForTimeout(100);
   const position=()=>draft.evaluate(el=>({window:scrollY,main:document.querySelector('main').scrollTop,focused:document.activeElement===el,value:el.value}));
   const before=await position();
   assert(before.window>200||before.main>200,'Form must be scrolled down');
   const originalItemReads=itemReads;
   for(let cycle=0;cycle<4;cycle++) {
    const priorUserReads=userReads;
    await page.clock.runFor(30000);
    await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
    await page.clock.runFor(20);
    await page.waitForFunction(()=>!document.querySelector('[aria-label="ERP 登录"]'));
    assert(userReads>priorUserReads,'Background auth was actually checked');
    const after=await position();
    assert(Math.abs(after.window-before.window)<=2&&Math.abs(after.main-before.main)<=2,'Scroll position changed '+JSON.stringify({before,after}));
    assert.equal(after.focused,true);assert.equal(after.value,before.value);
    assert.equal(itemReads,originalItemReads,'Cloud inventory must not refresh while recording a product');
   }
   await page.screenshot({path:'verification/screenshots/add-form-stable-scroll-'+width+'.png'});
   assert.deepEqual(errors,[]);
   console.log('PASS product entry '+width+'px: 120 simulated seconds, four auth/focus cycles, stable scroll/focus/draft, no background inventory replacement');
   await context.close();continue;
  }
  if(auditSnapshot) {
   const home=await page.locator('.gouka-simple-home-total').innerText();
   await page.getByRole('button',{name:'PDF导出',exact:true}).click();
   const cards=await page.locator('.grid4').innerText();
   const cost=home.match(/¥[\d,]+/)?.[0];
   assert(cost&&cards.includes(cost),'Actual dataset: dashboard and PDF inventory cost must match');
   assert(cards.includes('未定'),'Actual dataset: unpriced forecast is undetermined');
   console.log('PASS actual dataset '+width+'px: '+expectedProducts+' product records; same dashboard/PDF cost '+cost+'; unpriced forecast undetermined; all APIs mocked');
   assert.deepEqual(errors,[]);await context.close();continue;
  }
  const save=page.getByRole('button',{name:'保存到云端',exact:true});
  if(release&&role!=='tax'){
   assert(await save.isEnabled()); await save.click();
   await page.waitForFunction(()=>document.body.innerText.includes('已同步 1 件'));
   assert(mutations.some(m=>m.body?.some(row=>row.product_no==='PREVIEW-ONLY')));
   if(role==='staff')assert(!mutations.some(m=>m.body?.some(row=>row.product_no==='__GOUKA_ERP_GLOBAL_STATE__')));
  } else { assert(await save.isDisabled()); assert.deepEqual(mutations,[]); }
  if(role==='staff')assert.equal(sealReads,0); else { await page.waitForFunction(()=>true); assert(sealReads>0); }
  await page.screenshot({path:`verification/screenshots/secure-${release?'release':'preview'}-${role}-${width}.png`,fullPage:true});
  assert.deepEqual(errors,[]);
  await page.getByRole('button',{name:'退出登录',exact:true}).first().click();
  await page.getByRole('button',{name:'登录',exact:true}).waitFor();
  await context.close();
  console.log(`PASS secure ${release?'release candidate':'read-only preview'} ${role} ${width}px: verified login; role-appropriate save and seal access; logout closes access; all external APIs mocked.`);
 }
}finally{await browser?.close();server.kill();}
