const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

test('ST-MNM-44D backfill PRF usa apenas payload oficial preservado',()=>{
  const sql=fs.readFileSync('supabase/migrations/20261005194000_recover_prf_minimum_bid.sql','utf8');
  assert.match(sql,/officialResultId'='prf-sc-02-2026'/);
  assert.match(sql,/official_payload->>'rawOfficialRow'/);
  assert.match(sql,/minimum_bid is null/);
  assert.match(sql,/minimum_bid_parser_revision/);
  assert.match(sql,/ST-MNM-44D/);
  assert.match(sql,/count\(\*\) from public\.lot_items x where x\.lot_id=l\.id\)\s*=1/);
});
