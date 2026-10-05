const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

test('ST-MNM-40B espelha apenas conectores oficiais já comprovados',()=>{
  const sql=fs.readFileSync('supabase/migrations/20261005050929_persist_official_source_connector_capabilities.sql','utf8');
  assert.match(sql,/when 'prf-sc' then 'prf-pdf'/);
  assert.match(sql,/when 'pncp' then 'pncp'/);
  assert.match(sql,/when 'compras-sc' then 'pncp-detran'/);
  assert.match(sql,/where id in \('prf-sc','pncp','compras-sc'\)/);
  assert.match(sql,/coalesce\(extra_data,'\{\}'::jsonb\) \|\| jsonb_build_object/);
  assert.doesNotMatch(sql,/detran-sc'.*then/s);
  assert.doesNotMatch(sql,/receita-federal'.*then/s);
  assert.doesNotMatch(sql,/florianopolis'.*then/s);
});
