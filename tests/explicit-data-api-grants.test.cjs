const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

test('ST-MNM-37A exige grants explícitos para futuros objetos public',()=>{
  const sql=fs.readFileSync('supabase/migrations/20261005044030_explicit_data_api_grants_for_future_public_objects.sql','utf8');

  assert.match(sql,/alter default privileges for role postgres in schema public/);
  assert.match(sql,/revoke select, insert, update, delete on tables from anon, authenticated, service_role/);
  assert.match(sql,/revoke usage, select on sequences from anon, authenticated, service_role/);
  assert.doesNotMatch(sql,/grant select, insert, update, delete on all tables/i);
});
