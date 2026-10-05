const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

test('ST-MNM-36B aplica menor privilégio e preserva convites para auditoria',()=>{
  const sql=fs.readFileSync('supabase/migrations/20261005043157_least_privilege_invitation_members_audit.sql','utf8');

  assert.match(sql,/drop policy if exists invitations_delete_manager/);

  assert.match(sql,/revoke all on table public\.audit_log from anon, authenticated/);
  assert.match(sql,/grant select on table public\.audit_log to authenticated/);
  assert.match(sql,/revoke all on sequence public\.audit_log_id_seq from anon, authenticated/);

  assert.match(sql,/revoke all on table public\.invitations from anon/);
  assert.match(sql,/revoke delete, truncate, references, trigger on table public\.invitations from authenticated/);
  assert.match(sql,/grant select, insert, update on table public\.invitations to authenticated/);
  assert.doesNotMatch(sql,/grant[^;]*delete[^;]*public\.invitations/i);

  assert.match(sql,/revoke all on table public\.auction_members from anon/);
  assert.match(sql,/revoke truncate, references, trigger on table public\.auction_members from authenticated/);
  assert.match(sql,/grant select, insert, update, delete on table public\.auction_members to authenticated/);
});
