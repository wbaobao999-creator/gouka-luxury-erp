import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { PGlite } from '../../../work/erp-security-harness/node_modules/@electric-sql/pglite/dist/index.js';
import { auditIndexQuery, auditTemplateQuery } from './audit-backup-query.mjs';

const folder=await fs.mkdtemp(path.join(os.tmpdir(),'gouka-audit-backup-test-'));
const db=new PGlite();
try {
  await db.exec(`create table public.erp_audit_log(id bigint primary key,happened_at timestamptz,
    actor_id uuid,operation text,product_no text,before_data jsonb,after_data jsonb)`);
  const document=(savedAt,amount)=>JSON.stringify({product_no:'__GOUKA_ERP_GLOBAL_STATE__',
    updated_at:savedAt,memo:'__GOUKA_ERP_GLOBAL_STATE_JSON__'+JSON.stringify({savedAt,cashflow:{amount},files:['data:application/pdf;base64,TEST']})});
  await db.query(`insert into public.erp_audit_log values
    (1,now(),null,'UPDATE','__GOUKA_ERP_GLOBAL_STATE__',$1::jsonb,$2::jsonb),
    (2,now(),null,'UPDATE','__GOUKA_ERP_GLOBAL_STATE__',$2::jsonb,$3::jsonb)`,
    [document('2026-10-01',90000),document('2026-10-02',90000),document('2026-10-03',99000)]);
  const index=(await db.query(auditIndexQuery(2).replace("set statement_timeout = '60s'; ",''))).rows[0].archive_index;
  await fs.writeFile(path.join(folder,'index-0001-0002.json'),JSON.stringify(index));
  const done=new Set();
  for(const snapshot of index.snapshots) {
    if(!snapshot.template_hash||done.has(snapshot.template_hash))continue;
    const template=(await db.query(auditTemplateQuery(2,snapshot.id,snapshot.side))).rows[0];
    await fs.writeFile(path.join(folder,'template-'+template.hash+'.json'),JSON.stringify(template));done.add(template.hash);
  }
} finally {await db.close();}
const run=spawnSync(process.execPath,['verification/verify-audit-archive.mjs',folder],{encoding:'utf8',timeout:60000});
assert.equal(run.status,0,run.stdout+run.stderr);
const manifest=JSON.parse(await fs.readFile(path.join(folder,'verified-manifest.json'),'utf8'));
assert.equal(manifest.rowCount,2);assert.equal(manifest.verifiedSnapshots,4);
assert.deepEqual(manifest.duplicateIds,[1]);assert.equal(manifest.retainedRows,1);
console.log('PASS audit backup/restore drill: every snapshot hash verified, gzip read-back complete, timestamp-only duplicate distinguished from real financial change.');
const build=spawnSync(process.execPath,['verification/build-audit-maintenance.mjs',folder],{encoding:'utf8',timeout:60000});
assert.equal(build.status,0,build.stdout+build.stderr);
const recovery=new PGlite();
try {
  await recovery.exec(`create table public.items(product_no text primary key,memo text);
    insert into public.items values('KEEP','untouched');
    create table public.erp_audit_log(id bigint generated always as identity primary key,happened_at timestamptz,
      actor_id uuid,operation text,product_no text,before_data jsonb,after_data jsonb);
    insert into public.erp_audit_log(id,operation,product_no,before_data,after_data) overriding system value values
      (1,'UPDATE','__GOUKA_ERP_GLOBAL_STATE__','{}','{}'),
      (2,'UPDATE','__GOUKA_ERP_GLOBAL_STATE__','{"amount":90000}','{"amount":99000}');`);
  const maintenance=await fs.readFile(path.join(folder,'authorized-maintenance.sql'),'utf8');
  try { await recovery.exec(maintenance); }
  catch(error) { throw new Error('Recovery SQL: '+error.message); }
  assert.deepEqual((await recovery.query('select id::int id from public.erp_audit_log')).rows,[{id:2}]);
  assert.deepEqual((await recovery.query('select * from public.items')).rows,[{product_no:'KEEP',memo:'untouched'}]);
  assert.deepEqual((await recovery.query('select after_data from public.erp_audit_log')).rows[0].after_data,{amount:99000});
  console.log('PASS bounded recovery transaction: only authorized duplicate removed, real financial audit and business item preserved.');
} finally {await recovery.close();}
