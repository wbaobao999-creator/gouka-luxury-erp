import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const checks = [
 ['auth-connection.mjs'],
 ['global-snapshot.mjs'],
 ['audit-log-growth.mjs'],
 ['item-service-noop.mjs'],
 ['audit-archive-selftest.mjs'],
 ['secure-preview.mjs','--release','--server-error-check'],
 ['secure-preview.mjs','--release','--sync-check'],
 ['erp-auth.mjs'], ['secure-erp-access.mjs'], ['database-access.mjs'],
 ['private-files.mjs'], ['data-integrity.mjs'], ['sales-events.mjs'],
 ['sales-settlement.mjs'], ['financial-corrections.mjs'], ['inventory-statistics.mjs'],
 ['secure-preview.mjs','--release'], ['table-image-preview.mjs'],
 ['secure-preview.mjs','--release','--scroll-check'],
 ['secure-preview.mjs','--release','--recovery-check'],
 ['photo-scale.mjs'], ['backup-ui.mjs'], ['workflow-smoke.mjs'],
 ['recovery-drill.mjs'], ['live-snapshot-audit.mjs'],
 ['live-snapshot-audit.mjs','--snapshot','../../outputs/ERP-readonly-audit-snapshot-20261022.json'],
 ['secure-preview.mjs','--release','--snapshot','../../outputs/ERP-readonly-audit-snapshot-20261022.json'],
 ['live-api-preflight.mjs','--after-cutover'], ['production-login.mjs']
];
const results = [];
for (const [file, ...args] of checks) {
 const started = Date.now();
 const run = spawnSync(process.execPath, ['verification/'+file,...args], {
  encoding:'utf8',timeout:120000,maxBuffer:4*1024*1024,windowsHide:true
 });
 const result = {file,args,passed:run.status===0,milliseconds:Date.now()-started,
  output:(run.stdout||'')+(run.stderr||''),error:run.error?.message||null};
 results.push(result);
 console.log((result.passed?'PASS ':'FAIL ')+file+' '+result.milliseconds+'ms');
 if(!result.passed)console.log(result.output.slice(-4000));
}
fs.writeFileSync('verification/full-regression-results-20261022.json',JSON.stringify({
 checkedAt:new Date().toISOString(),results
},null,2));
console.log('RESULT '+results.filter(x=>x.passed).length+'/'+results.length+' suites passed');
if(results.some(x=>!x.passed))process.exitCode=1;
