import fs from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

if(!process.argv[2])throw new Error('A verified private archive folder is required');
const folder=path.resolve(process.argv[2]);
const manifest=JSON.parse(await fs.readFile(path.join(folder,'verified-manifest.json'),'utf8'));
assert(manifest.rowCount>0&&manifest.verifiedSnapshots>0);
assert.equal(manifest.archive,'erp-audit-complete.ndjson.gz');
assert(manifest.duplicateIds.length>0);
assert(manifest.duplicateIds.every(id=>Number.isSafeInteger(id)&&id>0&&id<=manifest.cutoff));
assert.equal(new Set(manifest.duplicateIds).size,manifest.duplicateIds.length);
assert.equal(manifest.duplicateCount,manifest.duplicateIds.length);
assert(manifest.retainedSnapshotBytes<16*1024*1024,'Retained data too large for bounded disk recovery');
const hash=createHash('sha256');
for await(const chunk of createReadStream(path.join(folder,manifest.archive)))hash.update(chunk);
assert.equal(hash.digest('hex'),manifest.sha256,'Archive has changed since validation');
const ids=manifest.duplicateIds.join(',');
const sql=`begin;
-- Authorized, bounded recovery transaction only; no global disk protection override.
set transaction read write;
set local lock_timeout = '3s';
set local statement_timeout = '90s';
lock table public.erp_audit_log in access exclusive mode;
do $$ begin
  if (select count(*) from public.erp_audit_log where id <= ${manifest.cutoff}) <> ${manifest.rowCount} then
    raise exception 'Audit history changed since backup; abort';
  end if;
  if (select count(*) from public.erp_audit_log where id = any(array[${ids}]::bigint[])
      and product_no='__GOUKA_ERP_GLOBAL_STATE__' and operation='UPDATE') <> ${manifest.duplicateCount} then
    raise exception 'Duplicate IDs do not match verified backup; abort';
  end if;
  if exists(select 1 from pg_constraint where confrelid='public.erp_audit_log'::regclass)
     or exists(select 1 from pg_trigger where tgrelid='public.erp_audit_log'::regclass and not tgisinternal) then
    raise exception 'Unexpected audit dependencies; abort';
  end if;
  if (select coalesce(sum(coalesce(octet_length(before_data::text),0)+coalesce(octet_length(after_data::text),0)),0)
      from public.erp_audit_log where not(id=any(array[${ids}]::bigint[]))) > 16777216 then
    raise exception 'Retained history exceeds bounded recovery size; abort';
  end if;
end $$;
create temporary table erp_audit_keep_recovery on commit drop as
  select * from public.erp_audit_log where not(id=any(array[${ids}]::bigint[]));
create temporary table erp_audit_recovery_checks on commit drop as
  select count(*) item_count,md5(string_agg(product_no||md5(to_jsonb(i)::text),'|' order by product_no)) item_digest
  from public.items i;
-- TRUNCATE avoids a huge DELETE/WAL burst and frees the old TOAST file at commit.
-- All non-duplicate audit rows are restored in this same atomic transaction.
truncate table public.erp_audit_log;
insert into public.erp_audit_log(id,happened_at,actor_id,operation,product_no,before_data,after_data)
  overriding system value select id,happened_at,actor_id,operation,product_no,before_data,after_data from erp_audit_keep_recovery;
do $$ begin
  if exists((select * from erp_audit_keep_recovery except select * from public.erp_audit_log)
      union all (select * from public.erp_audit_log except select * from erp_audit_keep_recovery)) then
    raise exception 'Retained history verification failed; rolling back';
  end if;
  if exists(select 1 from erp_audit_recovery_checks c where (c.item_count,c.item_digest) is distinct from
      (select row(count(*),md5(string_agg(product_no||md5(to_jsonb(i)::text),'|' order by product_no))) from public.items i)) then
    raise exception 'Business items changed; rolling back';
  end if;
end $$;
commit;
select count(*) as retained_audit_rows,pg_total_relation_size('public.erp_audit_log') as audit_bytes,
  pg_database_size(current_database()) as database_bytes from public.erp_audit_log;
`;
await fs.writeFile(path.join(folder,'authorized-maintenance.sql'),sql,{flag:'wx'});
console.log(JSON.stringify({cutoff:manifest.cutoff,backedUpRows:manifest.rowCount,
  duplicateCount:manifest.duplicateCount,retainedRows:manifest.retainedRows,retainedSnapshotBytes:manifest.retainedSnapshotBytes,
  archiveSha256:manifest.sha256,sqlPath:path.join(folder,'authorized-maintenance.sql')}));
