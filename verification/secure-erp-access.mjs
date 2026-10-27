import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'vite';
const require = createRequire('C:/Users/admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json');
const { chromium } = require('playwright');

const fixture = `
import React, {useState} from 'react';
import {createRoot} from 'react-dom/client';
import SecureErpAccess from '/components/SecureErpAccess.jsx';
const mock = window.mock = {role:null, userId:'fixture', delay:false, pending:[], calls:[], inCallback:false,
  listeners:new Set(), failure:false, cleanupFailure:false, loginFailure:false, unsubscriptions:0};
const user = () => mock.role ? {id:mock.userId,email:'offline@example.invalid',
  email_confirmed_at:'2026-01-01',app_metadata:mock.role==='spoof'?{}:{erp_role:mock.role},
  user_metadata:{erp_role:'owner'}} : null;
mock.emit = event => {mock.inCallback=true;try {for(const cb of mock.listeners) cb(event, {user:{id:mock.userId,app_metadata:{erp_role:'owner'}}});}finally{mock.inCallback=false;}};
const client = {auth:{
 onAuthStateChange(cb){if(mock.failSubscribe)throw new Error('subscription unavailable');mock.listeners.add(cb);return {data:{subscription:{unsubscribe(){mock.listeners.delete(cb);mock.unsubscriptions++;}}}};},
 async getUser(){if(mock.inCallback) throw new Error('Auth callback deadlock');mock.calls.push('verify');
   const captured=user();if(mock.delay)await new Promise(resolve=>mock.pending.push(resolve));
   if(mock.failure)throw new Error('offline');return {data:{user:captured},error:null};},
 async signInWithPassword(){if(mock.inCallback)throw new Error('Auth callback deadlock');mock.calls.push('login');
   if(mock.hangLogin)await new Promise(resolve=>mock.pending.push(resolve));
   if(mock.loginFailure)return {error:{message:'denied'}};mock.role='staff';mock.emit('SIGNED_IN');return {error:null};},
 async signOut(){if(mock.inCallback)throw new Error('Auth callback deadlock');mock.calls.push('logout');
   if(mock.cleanupFailure)return {error:{message:'failed'}};mock.role=null;mock.emit('SIGNED_OUT');return {error:null};}
}};
function Draft({session}){const [draft,setDraft]=useState('');return <div data-testid="erp-content">Verified {session.role}<input aria-label="Draft" value={draft} onChange={event=>setDraft(event.target.value)}/></div>;}
function Fixture(){const [mounted,setMounted]=useState(true);window.mountGate=setMounted;
 return mounted?<SecureErpAccess client={client}>{session=><Draft session={session}/>}</SecureErpAccess>:<div>Unmounted</div>;}
createRoot(document.getElementById('root')).render(<React.StrictMode><Fixture/></React.StrictMode>);
`;
const server = await createServer({ configFile: false, server: { host: '127.0.0.1', port: 0 },
  plugins: [{ name: 'offline-security-fixture',
    resolveId(id) { if (id === '/secure-auth-fixture.jsx') return join(process.cwd(), 'verification', '__virtual-auth-fixture.jsx'); },
    load(id) { if (id.replaceAll('\\', '/').endsWith('/verification/__virtual-auth-fixture.jsx')) return fixture; },
    configureServer(server) { server.middlewares.use('/__secure-auth', (_req, res) => {
      res.setHeader('Content-Type', 'text/html');
      res.end('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0"><div id="root"></div><script type="module" src="/@vite/client"></script><script type="module" src="/secure-auth-fixture.jsx"></script></body></html>');
    }); }
  }] });
let browser;
let scenarios = 0;
try {
  await server.listen();
  const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
  browser = await chromium.launch({ headless: true, channel: 'msedge' });
  for (const width of [1280, 390, 320]) {
    const page = await browser.newPage({ viewport: { width, height: 850 } });
    const errors = [], external = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.route('**/*', route => {
      if (route.request().url().startsWith(origin)) return route.continue();
      external.push(route.request().url()); return route.abort();
    });
    await page.goto(origin + '/__secure-auth');
    await page.getByRole('button', { name: '登录', exact: true }).waitFor();
    assert.equal(await page.getByTestId('erp-content').count(), 0); scenarios++;
    for (const name of ['管理者入口','员工入口','税理士窗口']) {
      const entryButton=page.getByRole('button',{name,exact:true});
      assert.equal(await entryButton.count(),1);
      assert((await entryButton.locator('b').boundingBox()).height<25,'Role label should fit one line');
    }
    await page.getByRole('button',{name:'员工入口',exact:true}).click();
    assert.equal(await page.getByRole('button',{name:'员工入口',exact:true}).getAttribute('aria-pressed'),'true');
    await page.getByLabel('邮箱',{exact:true}).fill('old-entry@example.invalid');
    await page.getByLabel('密码',{exact:true}).fill('not-for-next-entry');
    await page.getByRole('button',{name:'税理士窗口',exact:true}).click();
    assert.equal(await page.getByLabel('邮箱',{exact:true}).inputValue(),'');
    assert.equal(await page.getByLabel('密码',{exact:true}).inputValue(),'');
    await page.screenshot({path:join(tmpdir(),'erp-three-entries-'+width+'.png')});
    await page.getByRole('button',{name:'管理者入口',exact:true}).click(); scenarios++;
    await page.getByLabel('邮箱', { exact: true }).fill('offline@example.invalid');
    await page.getByLabel('密码', { exact: true }).fill('offline-fixture');
    await page.getByRole('button', { name: '登录', exact: true }).click();
    await page.getByText('Verified staff', { exact: true }).waitFor(); scenarios++;

    await page.getByLabel('Draft', {exact:true}).fill('unsaved product');
    await page.getByLabel('Draft', {exact:true}).focus();
    await page.evaluate(() => { mock.delay = true; window.dispatchEvent(new Event('focus')); });
    await page.waitForFunction(() => mock.pending.length === 1);
    assert.equal(await page.getByTestId('erp-content').isVisible(), true);
    assert.equal(await page.getByRole('status').filter({hasText:'正在验证访问权限'}).count(),0);
    assert.equal(await page.getByLabel('Draft',{exact:true}).evaluate(el=>document.activeElement===el),true);
    await page.evaluate(() => { mock.delay = false; mock.pending.shift()(); });
    await page.getByText('Verified staff', { exact: true }).waitFor();
    assert.equal(await page.getByLabel('Draft', {exact:true}).inputValue(), 'unsaved product'); scenarios++;

    await page.evaluate(() => { mock.delay = true; mock.role = 'tax'; mock.emit('TOKEN_REFRESHED'); });
    await page.waitForFunction(() => mock.pending.length === 1);
    assert.equal(await page.getByRole('status').filter({hasText:'正在验证访问权限'}).count(),0);
    assert.equal(await page.getByTestId('erp-content').isVisible(), true);
    await page.evaluate(() => { mock.delay = false; mock.pending.shift()(); });
    await page.getByText('Verified tax', { exact: true }).waitFor(); scenarios++;
    assert.equal(await page.getByLabel('Draft', {exact:true}).inputValue(), '');

    await page.getByLabel('Draft',{exact:true}).fill('keep typing');
    for(const event of ['focus','visibilitychange','TOKEN_REFRESHED','SIGNED_IN','USER_UPDATED']) {
      await page.evaluate(event=>{
        mock.delay=true;
        if(event==='focus')window.dispatchEvent(new Event(event));
        else if(event==='visibilitychange')document.dispatchEvent(new Event(event));
        else mock.emit(event);
      },event);
      await page.waitForFunction(()=>mock.pending.length===1);
      assert(await page.getByTestId('erp-content').isVisible());
      assert.equal(await page.getByRole('status').filter({hasText:'正在验证访问权限'}).count(),0);
      assert.equal(await page.getByLabel('Draft',{exact:true}).inputValue(),'keep typing');
      await page.evaluate(()=>{mock.delay=false;mock.pending.shift()();});
      await page.waitForFunction(()=>mock.pending.length===0);
      scenarios++;
    }
    await page.evaluate(()=>{mock.delay=true;mock.userId='different-account';mock.emit('SIGNED_IN');});
    await page.waitForFunction(()=>mock.pending.length===1);
    assert.equal(await page.getByTestId('erp-content').count(),0,'Switching accounts must hide the previous account immediately');
    await page.evaluate(()=>{mock.delay=false;mock.pending.shift()();});
    await page.getByText('Verified tax',{exact:true}).waitFor();
    assert.equal(await page.getByLabel('Draft',{exact:true}).inputValue(),'');scenarios++;

    // A response captured before SIGNED_OUT must not reopen the gate.
    await page.evaluate(() => { mock.delay = true; mock.emit('TOKEN_REFRESHED'); });
    await page.waitForFunction(() => mock.pending.length === 1);
    await page.evaluate(() => { mock.role = null; mock.emit('SIGNED_OUT'); mock.delay = false; mock.pending.shift()(); });
    await page.getByRole('button', { name: '登录', exact: true }).waitFor();
    assert.equal(await page.getByTestId('erp-content').count(), 0); scenarios++;

    await page.evaluate(() => { mock.role = 'spoof'; mock.emit('SIGNED_IN'); });
    await page.waitForFunction(() => mock.role === null);
    await page.getByRole('button', { name: '登录', exact: true }).waitFor();
    assert.equal(await page.getByTestId('erp-content').count(), 0); scenarios++;

    await page.evaluate(() => { mock.role = 'owner'; mock.emit('SIGNED_IN'); });
    await page.getByText('Verified owner', { exact: true }).waitFor();
    await page.getByRole('button', { name: '退出登录', exact: true }).click();
    await page.getByRole('button', { name: '登录', exact: true }).waitFor();
    assert(await page.evaluate(() => mock.calls.includes('logout'))); scenarios++;

    await page.evaluate(() => { mock.role = 'staff'; mock.failure = true; mock.cleanupFailure = true; mock.emit('TOKEN_REFRESHED'); });
    await page.getByRole('alert').waitFor();
    assert.equal(await page.getByTestId('erp-content').count(), 0); scenarios++;
    await page.evaluate(() => { mock.failure = false; mock.cleanupFailure = false; mock.role = null; });
    await page.evaluate(() => { mock.loginFailure = true; });
    await page.getByLabel('邮箱', { exact: true }).fill('offline@example.invalid');
    await page.getByLabel('密码', { exact: true }).fill('offline-fixture');
    await page.getByRole('button', { name: '登录', exact: true }).click();
    await page.getByRole('button', { name: '登录', exact: true }).waitFor();
    assert.equal(await page.getByTestId('erp-content').count(), 0); scenarios++;
    await page.evaluate(() => { mock.loginFailure = false; mock.role = 'owner'; mock.emit('SIGNED_IN'); });
    await page.getByText('Verified owner', { exact: true }).waitFor();
    await page.evaluate(() => { mock.cleanupFailure = true; });
    await page.getByRole('button', { name: '退出登录', exact: true }).click();
    await page.getByRole('alert').waitFor();
    assert.equal(await page.getByTestId('erp-content').count(), 0); scenarios++;
    await page.evaluate(() => { mock.cleanupFailure = false; mock.role = null; });
    await page.screenshot({ path: join(tmpdir(), 'secure-erp-access-' + width + '.png') });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)); scenarios++;

    await page.evaluate(() => { mock.role = 'owner'; mock.delay = true; mock.emit('SIGNED_IN'); });
    await page.waitForFunction(() => mock.pending.length === 1);
    await page.evaluate(() => mountGate(false));
    await page.getByText('Unmounted', { exact: true }).waitFor();
    assert.equal(await page.evaluate(() => mock.listeners.size), 0);
    await page.evaluate(() => { mock.delay = false; mock.pending.shift()(); });
    assert.equal(await page.getByTestId('erp-content').count(), 0); scenarios++;
    await page.evaluate(() => { mock.role = null; mountGate(true); });
    await page.getByRole('button', { name: '登录', exact: true }).waitFor();
    assert.equal(await page.evaluate(() => mock.listeners.size), 1); scenarios++;
    await page.evaluate(() => mountGate(false));
    await page.getByText('Unmounted', { exact: true }).waitFor();
    await page.evaluate(() => { mock.failSubscribe = true; mock.role = 'owner'; mountGate(true); });
    await page.getByRole('alert').filter({ hasText: '登录服务暂时不可用' }).waitFor();
    assert(await page.getByRole('button', { name: '登录', exact: true }).isDisabled());
    assert.equal(await page.getByTestId('erp-content').count(), 0);
    assert.equal(await page.evaluate(() => mock.listeners.size), 0); scenarios++;
    await page.evaluate(()=>{mountGate(false);mock.failSubscribe=false;mock.role='owner';mock.delay=true;});
    await page.getByText('Unmounted',{exact:true}).waitFor();
    await page.clock.install();
    await page.evaluate(()=>mountGate(true));
    await page.waitForFunction(()=>mock.pending.length===1);
    await page.clock.runFor(20001);
    await page.getByRole('alert').filter({hasText:'登录连接等待超时'}).waitFor();
    assert.equal(await page.getByTestId('erp-content').count(),0);
    assert(await page.getByRole('button',{name:'重置登录连接',exact:true}).isVisible());
    await page.evaluate(()=>{mock.delay=false;mock.pending.shift()();mock.emit('SIGNED_IN');});
    await page.clock.runFor(10);
    assert.equal(await page.getByTestId('erp-content').count(),0,'Late verification must not reopen a timed-out connection');scenarios++;
    await page.evaluate(()=>mountGate(false));
    await page.getByText('Unmounted',{exact:true}).waitFor();
    await page.evaluate(()=>{mock.role=null;mountGate(true);});
    await page.clock.runFor(10);
    await page.getByRole('button',{name:'登录',exact:true}).waitFor();
    await page.evaluate(()=>{mock.hangLogin=true;});
    await page.getByLabel('邮箱',{exact:true}).fill('offline@example.invalid');
    await page.getByLabel('密码',{exact:true}).fill('offline-fixture');
    await page.getByRole('button',{name:'登录',exact:true}).click();
    await page.waitForFunction(()=>mock.pending.length===1);
    await page.clock.runFor(20001);
    await page.getByRole('alert').filter({hasText:'登录连接等待超时'}).waitFor();
    await page.evaluate(()=>{mock.hangLogin=false;mock.pending.shift()();});
    await page.clock.runFor(10);
    assert.equal(await page.getByTestId('erp-content').count(),0,'Late password login must not reopen a timed-out connection');scenarios++;
    assert.deepEqual(errors, []);
    assert.deepEqual(external, []);
    await page.close();
  }
  console.log('PASS ' + scenarios + ' offline browser scenarios across desktop/mobile; no real auth or database requests.');
  console.log('Screenshots: ' + join(tmpdir(), 'secure-erp-access-{1280,390}.png'));
} finally {
  await browser?.close();
  await server.close();
}
