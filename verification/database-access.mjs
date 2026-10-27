import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { PGlite } from '../../../work/erp-security-harness/node_modules/@electric-sql/pglite/dist/index.js';
import { writeItemAudit } from '../lib/itemMetadata.js';
import { policyTuningSql } from './policy-tuning.mjs';

// Real PostgreSQL in memory, synthetic identities/data, no cloud connection.
const db = new PGlite();
let checks = 0;
const ids = {owner:'00000000-0000-4000-8000-000000000001',staff:'00000000-0000-4000-8000-000000000002',tax:'00000000-0000-4000-8000-000000000003',unconfigured:'00000000-0000-4000-8000-000000000004'};
const normalized = ['item_images','suppliers','customs_batches','sales','dictionaries','operation_logs','employees'];
const history = [{date:'2026-10-21',user:'owner',action:'创建商品并生成古物台账'}];
const memo = item => writeItemAudit('human note', {ledgerHistory:history,...item});
async function as(role, query, parameters=[]) {
  await db.exec('reset role');
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [role === 'anon' ? '' : ids[role]]);
  await db.exec('set role ' + (role === 'anon' ? 'anon' : 'authenticated'));
  try { return await db.query(query, parameters); } finally { await db.exec('reset role'); }
}
async function denied(role, query, parameters=[]) {
  await assert.rejects(as(role, query, parameters), error => error.code === '42501'); checks++;
}
try {
  await db.exec(`create role anon; create role authenticated; create role service_role;
    create schema auth; create schema storage;
    grant usage on schema public,auth,storage to anon,authenticated;
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create table auth.users(id uuid primary key,email text,raw_app_meta_data jsonb,email_confirmed_at timestamptz,deleted_at timestamptz,banned_until timestamptz);
    create table public.items(id uuid primary key default gen_random_uuid(), product_no text unique not null, memo text, brand text,
      ledger_status text,ledger_void_reason text,import_batch_id text,
      allocated_duty_jpy numeric,allocated_agent_fee_jpy numeric,allocated_international_shipping_jpy numeric,allocated_other_import_cost_jpy numeric,import_tax_credit_jpy numeric,
      batch_allocated_duty_jpy numeric,batch_allocated_customs_fee_jpy numeric,batch_allocated_shipping_jpy numeric,batch_allocated_other_cost_jpy numeric,batch_allocated_import_tax_jpy numeric);
    alter table public.items enable row level security;
    grant all on public.items to anon,authenticated;
    create table storage.buckets(id text primary key,name text,public boolean);
    alter table storage.buckets enable row level security;
    grant select,insert,update,delete on storage.buckets to anon,authenticated;
    create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);
    alter table storage.objects enable row level security;
    grant select,insert,update,delete on storage.objects to anon,authenticated;
    insert into storage.buckets values ('product-images','product-images',true),('import-batch-files','import-batch-files',true);
    insert into storage.objects(bucket_id,name) values ('product-images','photo.jpg'),('import-batch-files','invoice.pdf');
  `);
  for (const [role,id] of Object.entries(ids)) await db.query('insert into auth.users values ($1,$2,$3,now(),null,null)',[id,role+'@example.invalid',JSON.stringify(role==='unconfigured'?{}:{erp_role:role})]);
  for (const table of normalized) {
    await db.exec(`create table public.${table}(id uuid default gen_random_uuid()); alter table public.${table} enable row level security; grant all on public.${table} to anon,authenticated;`);
    if (table !== 'employees') for (const [name,command] of [['read','select'],['insert','insert'],['update','update'],['delete','delete']]) {
      await db.exec(`create policy gouka_public_${name} on public.${table} for ${command} to anon,authenticated ${command==='insert'?'with check (true)':command==='update'?'using (true) with check (true)':'using (true)'}`);
    }
  }
  for (const command of ['select','insert','update','delete']) await db.exec(`create policy gouka_items_public_${command} on public.items for ${command} to public ${command==='insert'?'with check (true)':command==='update'?'using (true) with check (true)':'using (true)'}`);
  for (const [prefix,bucket,who] of [['product_images_public','product-images','public'],['gouka_product_images','product-images','anon'],['gouka_import_batch_files','import-batch-files','anon']]) {
    for (const [name,command] of [['read','select'],['insert','insert'],['update','update'],['delete','delete']]) {
      const predicate = `bucket_id='${bucket}'`;
      await db.exec(`create policy ${prefix}_${name} on storage.objects for ${command} to ${who} ${command==='insert'?`with check (${predicate})`:command==='update'?`using (${predicate}) with check (${predicate})`:`using (${predicate})`}`);
    }
  }
  await db.query('insert into public.items(product_no,memo,ledger_status) values ($1,$2,$3)',['A',memo({}),'有效']);
  await db.query('insert into public.items(product_no,memo) values ($1,$2)',['__GOUKA_ERP_GLOBAL_STATE__','global fixture']);
  const migration = await fs.readFile('supabase/migrations/20261021_erp_access.sql','utf8');
  const assetSetup=migration.slice(migration.indexOf('create schema if not exists erp_access;'),migration.indexOf('-- COMPANY ASSETS END')+'-- COMPANY ASSETS END'.length);
  await db.exec(assetSetup); checks++;
  await db.exec('begin');
  await db.query("update auth.users set raw_app_meta_data='{}' where id=$1",[ids.owner]);
  await assert.rejects(db.exec(migration),/configure and verify an active owner/);
  await db.exec('rollback'); checks++;
  await db.exec('create policy unexpected_fixture_policy on public.items for select to anon using(true)');
  await assert.rejects(db.exec(migration),/unexpected permissive policies/);
  await db.exec('rollback');
  assert.equal((await db.query("select count(*)::int n from pg_policies where tablename='items' and policyname like 'gouka_items_public_%'")).rows[0].n,4); checks++;
  await db.exec('drop policy unexpected_fixture_policy on public.items');
  await db.exec(migration); checks++;
  await db.exec(policyTuningSql); checks++;
  await db.exec(await fs.readFile(new URL('../supabase/audit-log-growth-fix.sql', import.meta.url),'utf8')); checks++;
  await as('owner',"insert into public.erp_company_assets(key,value) values ('seal','{}')"); checks++;
  assert.equal((await as('tax',"select count(*)::int n from public.erp_company_assets")).rows[0].n,1); checks++;
  assert.equal((await as('staff',"select count(*)::int n from public.erp_company_assets")).rows[0].n,0); checks++;
  await denied('anon','select * from public.erp_company_assets');
  await denied('staff',"insert into public.erp_company_assets(key,value) values ('other','{}')");
  assert.equal((await db.query('select count(*)::int n from public.items')).rows[0].n,2); checks++;
  for (const role of ['owner','staff','tax']) {
    assert.equal((await as(role,'select count(*)::int n from public.items')).rows[0].n,2); checks++;
  }
  await denied('anon','select * from public.items');
  assert.equal((await as('unconfigured','select count(*)::int n from public.items')).rows[0].n,0); checks++;
  await as('staff',"update public.items set brand='ordinary edit' where product_no='A'"); checks++;
  const appended = memo({ledgerHistory:[...history,{date:'2026-10-22',user:'staff',action:'编辑商品信息'}]});
  await as('staff',"update public.items set memo=$1 where product_no='A'",[appended]); checks++;
  await denied('staff',"update public.items set ledger_status='作废' where product_no='A'");
  await denied('staff',"update public.items set ledger_void_reason='void' where product_no='A'");
  await denied('staff',"update public.items set import_batch_id='batch' where product_no='A'");
  for (const column of ['allocated_duty_jpy','allocated_agent_fee_jpy','allocated_international_shipping_jpy','allocated_other_import_cost_jpy','import_tax_credit_jpy','batch_allocated_duty_jpy','batch_allocated_customs_fee_jpy','batch_allocated_shipping_jpy','batch_allocated_other_cost_jpy','batch_allocated_import_tax_jpy']) await denied('staff',`update public.items set ${column}=1 where product_no='A'`);
  for (const extra of [{deletedAt:'2026-10-21'},{deletedReason:'hide'},{ledgerStatus:'作废'},{ledgerVoidReason:'invalid'}]) await denied('staff',"update public.items set memo=$1 where product_no='A'",[memo(extra)]);
  await denied('staff',"update public.items set memo=$1 where product_no='A'",[memo({ledgerHistory:[]})]);
  await denied('staff',"update public.items set memo=$1 where product_no='A'",[memo({ledgerHistory:[{...history[0],action:'rewritten'}]})]);
  await denied('staff',"update public.items set memo=$1 where product_no='A'",[appended.replace('"version":1','"version":2')]);
  await denied('staff',"update public.items set memo=$1 where product_no='A'",['\n__GOUKA_ITEM_AUDIT_V1__bad']);
  await denied('staff',"update public.items set product_no='renamed' where product_no='A'");
  assert.equal((await as('staff',"update public.items set memo='hacked' where product_no='__GOUKA_ERP_GLOBAL_STATE__' returning product_no")).rows.length,0); checks++;
  assert.equal((await as('staff',"delete from public.items where product_no='A' returning product_no")).rows.length,0); checks++;
  await denied('staff',"insert into public.items(product_no,ledger_status) values ('BAD','作废')");
  await denied('staff',"insert into public.items(product_no,memo) values ('BAD',$1)",[memo({deletedAt:'2026-10-21'})]);
  await denied('staff',"insert into public.items(product_no,import_tax_credit_jpy) values ('BAD',1) on conflict(product_no) do update set import_tax_credit_jpy=excluded.import_tax_credit_jpy");
  await as('staff',"insert into public.items(product_no,memo,ledger_status) values ('NEW',$1,'VALID')",[memo({})]); checks++;
  await as('owner',"insert into public.items(product_no,memo,ledger_status,import_batch_id,allocated_duty_jpy) values ('IMPORTED',$1,'VALID','BATCH',123)",[memo({})]);
  await as('staff',"insert into public.items(product_no,memo,ledger_status,import_batch_id,allocated_duty_jpy,brand) values ('IMPORTED',$1,'VALID','BATCH',123,'staff edit') on conflict(product_no) do update set memo=excluded.memo,brand=excluded.brand",[appended]); checks++;
  await denied('staff',"insert into public.items(product_no,memo,ledger_status,import_batch_id,allocated_duty_jpy) values ('IMPORTED',$1,'VALID','BATCH',124) on conflict(product_no) do update set allocated_duty_jpy=excluded.allocated_duty_jpy",[appended]);
  await denied('tax',"insert into public.items(product_no) values ('BAD')");
  assert.equal((await as('tax',"update public.items set brand='hacked' where product_no='A' returning product_no")).rows.length,0); checks++;
  await as('owner',"update public.items set ledger_status='作废' where product_no='A'"); checks++;
  await as('owner',"delete from public.items where product_no='NEW'"); checks++;
  for (const role of ['anon','staff','tax']) await denied(role,'truncate public.items');
  assert((await as('owner','select * from public.erp_audit_log')).rows.length>=5); checks++;
  assert((await as('tax','select * from public.erp_audit_log')).rows.length>=5); checks++;
  assert.equal((await as('staff','select count(*)::int n from public.erp_audit_log')).rows[0].n,0); checks++;
  await denied('owner','delete from public.erp_audit_log');
  await denied('owner',"insert into public.erp_audit_log(operation,product_no) values ('FAKE','A')");
  await denied('anon',"insert into storage.buckets(id,name,public) values ('rogue','rogue',true)");
  assert.equal((await as('staff',"update storage.buckets set public=true returning id")).rows.length,0); checks++;
  assert.equal((await as('anon','select count(*)::int n from storage.objects')).rows[0].n,1); checks++;
  assert.equal((await as('tax','select count(*)::int n from storage.objects')).rows[0].n,2); checks++;
  await denied('anon',"insert into storage.objects(bucket_id,name) values ('product-images','hacked')");
  await denied('tax',"insert into storage.objects(bucket_id,name) values ('product-images','hacked')");
  await as('staff',"insert into storage.objects(bucket_id,name) values ('product-images','staff.jpg')"); checks++;
  await denied('staff',"update storage.objects set bucket_id='import-batch-files' where name='staff.jpg'");
  await denied('staff',"insert into storage.objects(bucket_id,name) values ('import-batch-files','hacked')");
  assert.equal((await as('staff',"delete from storage.objects where name='staff.jpg' returning name")).rows.length,0); checks++;
  for (const table of normalized) await denied('anon',`select * from public.${table}`);
  for (const table of normalized) {
    await as('owner',`insert into public.${table} default values`); checks++;
    const expected=table==='employees'?0:1;
    assert.equal((await as('staff',`select count(*)::int n from public.${table}`)).rows[0].n,expected); checks++;
    assert.equal((await as('tax',`select count(*)::int n from public.${table}`)).rows[0].n,expected); checks++;
    await denied('staff',`insert into public.${table} default values`);
    assert.equal((await as('tax',`delete from public.${table} returning id`)).rows.length,0); checks++;
  }
  await db.query("update auth.users set raw_app_meta_data='{}' where id=$1",[ids.staff]);
  assert.equal((await as('staff','select count(*)::int n from public.items')).rows[0].n,0); checks++;
  await db.query('update auth.users set banned_until=$1 where id=$2',['2999-01-01',ids.tax]);
  assert.equal((await as('tax','select count(*)::int n from public.items')).rows[0].n,0); checks++;
  await assert.rejects(db.exec(migration)); await db.exec('rollback'); checks++;
  console.log(`PASS ${checks} isolated PostgreSQL checks: real RLS/trigger execution, roles, protected fields, audit log, storage, revocation and safe rerun refusal. No production connection.`);
} finally { await db.close(); }
