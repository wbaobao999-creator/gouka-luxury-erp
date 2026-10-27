import fs from 'node:fs/promises';
import { createReadStream, createWriteStream } from 'node:fs';
import path from 'node:path';
import { once } from 'node:events';
import { createHash } from 'node:crypto';
import { createGzip, createGunzip } from 'node:zlib';
import { createInterface } from 'node:readline';
import assert from 'node:assert/strict';
import { isDeepStrictEqual } from 'node:util';
import { PGlite } from '../../../work/erp-security-harness/node_modules/@electric-sql/pglite/dist/index.js';

const folder = path.resolve(process.argv[2] || '');
if (!process.argv[2]) throw new Error('A private backup folder is required');
const files = await fs.readdir(folder);
const chunks = await Promise.all(files.filter(name=>/^index-\d+-\d+\.json$/.test(name)).sort().map(async name=>JSON.parse(await fs.readFile(path.join(folder,name),'utf8'))));
const rows=chunks.flatMap(chunk=>chunk.rows||[]).sort((a,b)=>a.id-b.id);
const snapshots=chunks.flatMap(chunk=>chunk.snapshots||[]);
assert.equal(new Set(rows.map(row=>row.id)).size,rows.length,'Duplicate index rows');
assert.equal(snapshots.length,rows.length*2,'Missing snapshots');
assert(!snapshots.some(snapshot=>snapshot.marker_collision),'Archive marker collision');
const marker=chunks[0].marker;
assert(chunks.every(chunk=>chunk.marker===marker));
const bySide=new Map(snapshots.map(snapshot=>[snapshot.id+':'+snapshot.side,snapshot]));
const db=new PGlite();
const archivePath=path.join(folder,'erp-audit-complete.ndjson.gz');
const gzip=createGzip({level:6});
const destination=createWriteStream(archivePath,{flags:'wx'});
gzip.pipe(destination);
let verifiedSnapshots=0;
const duplicateIds=[];
let retainedSnapshotBytes=0;
function businessDocument(text) {
  const value=JSON.parse(text);
  if(!value)return value;
  delete value.updated_at;
  if(value.product_no==='__GOUKA_ERP_GLOBAL_STATE__'&&typeof value.memo==='string'&&value.memo.startsWith('__GOUKA_ERP_GLOBAL_STATE_JSON__')) {
    value.memo=JSON.parse(value.memo.slice('__GOUKA_ERP_GLOBAL_STATE_JSON__'.length));
    delete value.memo.savedAt;
  }
  return value;
}
try {
  await db.exec('create table templates(hash text primary key,body jsonb)');
  for (const hash of new Set(snapshots.map(snapshot=>snapshot.template_hash).filter(Boolean))) {
    const template=JSON.parse(await fs.readFile(path.join(folder,'template-'+hash+'.json'),'utf8'));
    assert.equal(template.hash,hash);
    assert.equal(createHash('md5').update(template.template_text).digest('hex'),hash,'Template hash mismatch');
    await db.query('insert into templates values($1,$2::jsonb)',[hash,template.template_text]);
  }
  async function restore(snapshot) {
    if(!snapshot.template_hash) {assert.equal(snapshot.hash,null);return 'null';}
    const result=await db.query(`with restored_memo as (
      select case when $2::text is not null and $2::text <> 'null' then
        jsonb_set(body,'{memo}',to_jsonb(replace(body->>'memo',$3::text,$2::text))) else body end body
      from templates where hash=$1
    ) select (case when $4::boolean then jsonb_set(body,'{updated_at}',$5::jsonb) else body end)::text restored
      from restored_memo`,[snapshot.template_hash,snapshot.saved_token,marker,snapshot.has_updated_at,JSON.stringify(snapshot.updated_at)]);
    const text=result.rows[0].restored;
    assert.equal(createHash('md5').update(text).digest('hex'),snapshot.hash,'Snapshot mismatch '+snapshot.id+':'+snapshot.side);
    verifiedSnapshots++;
    return text;
  }
  for (const row of rows) {
    const before=await restore(bySide.get(row.id+':before'));
    const after=await restore(bySide.get(row.id+':after'));
    if(row.operation==='UPDATE'&&row.product_no==='__GOUKA_ERP_GLOBAL_STATE__'&&
        isDeepStrictEqual(businessDocument(before),businessDocument(after))) duplicateIds.push(row.id);
    else retainedSnapshotBytes+=Buffer.byteLength(before)+Buffer.byteLength(after);
    const line=JSON.stringify(row).slice(0,-1)+',"before_data":'+before+',"after_data":'+after+'}\n';
    if(!gzip.write(line))await once(gzip,'drain');
    if(row.id%100===0)console.log('Verified and archived through audit ID '+row.id);
  }
  gzip.end();await once(destination,'finish');
} catch(error) {
  gzip.destroy();destination.destroy();throw error;
} finally {await db.close();}
const hash=createHash('sha256');
for await(const chunk of createReadStream(archivePath))hash.update(chunk);
const archiveSha256=hash.digest('hex');
const ids=[];
for await (const line of createInterface({input:createReadStream(archivePath).pipe(createGunzip()),crlfDelay:Infinity})) {
  const row=JSON.parse(line);ids.push(row.id);
  assert(bySide.has(row.id+':before')&&bySide.has(row.id+':after'));
}
assert.deepEqual(ids,rows.map(row=>row.id),'Compressed archive read-back mismatch');
const manifest={verifiedAt:new Date().toISOString(),cutoff:Math.max(...chunks.map(chunk=>chunk.cutoff)),
  rowCount:rows.length,verifiedSnapshots,templateCount:new Set(snapshots.map(snapshot=>snapshot.template_hash).filter(Boolean)).size,
  archive:'erp-audit-complete.ndjson.gz',archiveBytes:(await fs.stat(archivePath)).size,sha256:archiveSha256,
  duplicateIds,duplicateCount:duplicateIds.length,retainedRows:rows.length-duplicateIds.length,retainedSnapshotBytes,
  validation:'Every non-null before/after snapshot reconstructed and matched the server MD5; gzip read-back IDs/count match. No source records changed.'};
await fs.writeFile(path.join(folder,'verified-manifest.json'),JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(manifest));
