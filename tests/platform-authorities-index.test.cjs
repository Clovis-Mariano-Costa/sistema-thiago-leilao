const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

test('ST-MNM-39A indexa FK granted_by sem alterar autoridade',()=>{
  const sql=fs.readFileSync('supabase/migrations/20261005045730_index_platform_authorities_granted_by.sql','utf8');
  assert.match(sql,/create index if not exists platform_authorities_granted_by_idx/i);
  assert.match(sql,/private\.platform_authorities\s*\(granted_by\)/i);
  assert.doesNotMatch(sql,/drop\s+|delete\s+|update\s+|alter\s+table|grant\s+|revoke\s+/i);
});
