const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

test('ST-MNM-44D.1 aceita inteiro apenas junto ao marcador DEL 8/6',()=>{
  const sql=fs.readFileSync('supabase/migrations/20261005194500_recover_prf_integer_minimum_bid.sql','utf8');
  assert.match(sql,/\(\[0-9\]\{2,6\}\)\[\[:space:\]\]\+DEL\[\[:space:\]\]\+8\/6/);
  assert.match(sql,/officialResultId'='prf-sc-02-2026'/);
  assert.match(sql,/minimum_bid is null/);
  assert.match(sql,/ST-MNM-44D\.1/);
});
