import assert from 'node:assert/strict';
import { supabase } from '../supabase.js';
import { upsertCloudItem } from '../itemService.js';

const original = supabase.from;
const calls = [];
let write = {data:{product_no:'TEST'},error:null}, read = {data:{product_no:'TEST'},error:null};
supabase.from = table => {
  assert.equal(table,'items');
  return {
    upsert(rows,options) {
      calls.push(['write',rows,options]);
      return {select:()=>({maybeSingle:async()=>write})};
    },
    select() {
      return {eq:(column,value)=>{
        calls.push(['read',column,value]);
        return {single:async()=>read};
      }};
    }
  };
};
try {
  assert.deepEqual(await upsertCloudItem({product_no:'TEST',sale_jpy:90000}),{product_no:'TEST'});
  assert.equal(calls.filter(x=>x[0]==='read').length,0);
  write={data:null,error:null};
  assert.deepEqual(await upsertCloudItem({product_no:'TEST',sale_jpy:90000}),{product_no:'TEST'});
  assert.deepEqual(calls.at(-1),['read','product_no','TEST']);
  read={data:null,error:{message:'denied'}};
  await assert.rejects(upsertCloudItem({product_no:'TEST'}));
  read={data:null,error:null};
  await assert.rejects(upsertCloudItem({product_no:'TEST'}),/not saved/);
  write={data:null,error:{message:'write failed'}};
  const reads=calls.filter(x=>x[0]==='read').length;
  await assert.rejects(upsertCloudItem({product_no:'TEST'}));
  assert.equal(calls.filter(x=>x[0]==='read').length,reads,'Real write errors must not be disguised as no-ops');
  console.log('PASS cloud write/no-op compatibility: normal save, skipped duplicate, denied read, missing row, real write failure; no external requests.');
} finally { supabase.from=original; await supabase.auth.stopAutoRefresh(); }
