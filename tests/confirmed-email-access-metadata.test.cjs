const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

test('ST-MNM-36C exige e-mail confirmado na leitura de metadados de acesso',()=>{
  const sql=fs.readFileSync('supabase/migrations/20261005043803_require_confirmed_email_for_access_metadata_reads.sql','utf8');

  assert.match(sql,/alter policy members_select on public\.auction_members/);
  assert.match(sql,/alter policy invitations_select on public\.invitations/);
  assert.match(sql,/alter policy audit_read on public\.audit_log/);

  const confirmed=(sql.match(/private\.is_email_confirmed\(\)/g)||[]).length;
  assert.equal(confirmed,3);

  assert.match(sql,/lower\(email\) = lower\(coalesce\(\(select auth\.jwt\(\)\)->>'email',''\)\)/);
  assert.match(sql,/user_id = \(select auth\.uid\(\)\)/);
  assert.match(sql,/actor_user_id = \(select auth\.uid\(\)\)/);
});
