const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

test('painel expõe acesso a participantes e convites',()=>{
  const html=fs.readFileSync('app.html','utf8');
  assert.match(html,/href="convites\.html"/);
});

test('página de convites usa configuração pública e fluxo autenticado',()=>{
  const html=fs.readFileSync('convites.html','utf8');
  const js=fs.readFileSync('convites.js','utf8');
  assert.match(html,/id="inviteForm"/);
  assert.match(html,/id="incomingInvites"/);
  assert.match(js,/window\.SUPABASE_CONFIG/);
  assert.match(js,/client\.auth\.getUser\(\)/);
  assert.match(js,/client\.from\('invitations'\)\.insert/);
  assert.match(js,/client\.rpc\('accept_auction_invitation'/);
  assert.doesNotMatch(js,/service[_-]?role/i);
});

test('interface não oferece owner como papel convidável',()=>{
  const js=fs.readFileSync('convites.js','utf8');
  assert.match(js,/owner:\['admin','participant','observer'\]/);
  assert.match(js,/admin:\['participant','observer'\]/);
  assert.doesNotMatch(js,/owner:\[[^\]]*'owner'/);
  assert.doesNotMatch(js,/admin:\[[^\]]*'admin'/);
});


test('convites expirados não oferecem aceite e pendentes podem ser revogados',()=>{
  const js=fs.readFileSync('convites.js','utf8');
  assert.match(js,/function invitationExpired/);
  assert.match(js,/invitationDisplayStatus/);
  assert.match(js,/Convite expirado/);
  assert.match(js,/Revogar convite/);
  assert.match(js,/async function revokeInvitation/);
  assert.match(js,/update\(\{status:'revoked'\}\)/);
});

test('migration audita criação e revogação sem duplicar auditoria de aceite',()=>{
  const sql=fs.readFileSync('supabase/migrations/20261005025827_audit_invitation_lifecycle.sql','utf8');
  assert.match(sql,/invitation\.created/);
  assert.match(sql,/invitation\.revoked/);
  assert.match(sql,/invitation\.expired/);
  assert.match(sql,/new\.status in \('revoked','expired'\)/);
  assert.doesNotMatch(sql,/new\.status in \([^\)]*accepted/);
  assert.match(sql,/trg_audit_invitation_lifecycle/);
});

test('ST-MNM-36A bloqueia owner em auction_members e preserva hierarquia de convite',()=>{
  const sql=fs.readFileSync('supabase/migrations/20261005042723_harden_auction_member_role_hierarchy.sql','utf8');
  assert.match(sql,/membership\.owner_legacy_removed/);
  assert.match(sql,/insert into public\.audit_log/);
  assert.ok(sql.includes("delete from public.auction_members\\nwhere role='owner'::public.auction_member_role;"));
  assert.match(sql,/auction_members_no_owner_role/);
  assert.match(sql,/role <> 'owner'::public\.auction_member_role/);
  assert.ok(sql.indexOf('membership.owner_legacy_removed') < sql.indexOf('add constraint auction_members_no_owner_role'));
  assert.ok(sql.indexOf('delete from public.auction_members') < sql.indexOf('add constraint auction_members_no_owner_role'));
  assert.match(sql,/members_insert_manager/);
  assert.match(sql,/members_update_manager/);
  assert.match(sql,/members_delete_manager/);
  assert.match(sql,/private\.is_email_confirmed\(\)/);
  assert.match(sql,/private\.can_invite_role\(auction_id, role\)/);
  assert.doesNotMatch(sql,/with check \(private\.can_manage_auction\(auction_id\)\)/);
});
