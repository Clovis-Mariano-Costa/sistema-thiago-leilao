const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

test('cadastro exige senha forte no frontend e confirmação',()=>{
  const html=fs.readFileSync('auth.html','utf8');
  const js=fs.readFileSync('auth.js','utf8');
  assert.match(html,/minlength="8"/);
  assert.match(html,/data-password-rule="upper"/);
  assert.match(html,/data-password-rule="symbol"/);
  assert.match(html,/confirmPassword/);
  assert.match(js,/password\.length>=8/);
  assert.match(js,/\[A-Z\]/);
  assert.match(js,/\[a-z\]/);
  assert.match(js,/\\d/);
  assert.match(js,/emailRedirectTo/);
  assert.match(js,/auth\.resend/);
});

test('perfil e cabeçalho usam sessão Supabase',()=>{
  const html=fs.readFileSync('app.html','utf8');
  const sessionUi=fs.readFileSync('session-ui.js','utf8');
  const auth=fs.readFileSync('auth.js','utf8');
  assert.match(html,/id="userPill"/);
  assert.match(html,/session-ui\.js/);
  assert.match(sessionUi,/profiles/);
  assert.match(sessionUi,/profile-avatars/);
  assert.match(auth,/profile_completed_at/);
  assert.match(auth,/createSignedUrl/);
});

test('importador oficial exige sessão de usuário',()=>{
  const fontes=fs.readFileSync('fontes.js','utf8');
  const edge=fs.readFileSync('supabase/functions/pncp-lots/index.ts','utf8');
  assert.match(fontes,/session\.access_token/);
  assert.doesNotMatch(fontes,/legacyAnonKey/);
  assert.match(edge,/requireConfirmedUser/);
  assert.match(edge,/email_confirmed_at/);
});

test('alerta exige conferência humana dos dados importados',()=>{
  const html=fs.readFileSync('fontes-oficiais.html','utf8');
  const app=fs.readFileSync('app.js','utf8');
  assert.match(html,/confira os dados importados diretamente no edital/i);
  assert.match(app,/Confira os dados no edital\/documento oficial/i);
});

test('RPC de criação mantém wrapper público invoker e helper privilegiado privado',()=>{
  const sql=fs.readFileSync('supabase/migrations/20261005003737_move_ensure_owned_auction_definer_to_private_schema.sql','utf8');
  assert.match(sql,/function private\.ensure_owned_auction_impl/i);
  assert.match(sql,/security definer/i);
  assert.match(sql,/function public\.ensure_owned_auction/i);
  assert.match(sql,/security invoker/i);
  assert.match(sql,/set search_path = ''/i);
  assert.match(sql,/revoke all on function private\.ensure_owned_auction_impl[\s\S]*from public/i);
  assert.match(sql,/revoke all on function public\.ensure_owned_auction[\s\S]*from anon/i);
  assert.match(sql,/v_uid uuid := auth\.uid\(\)/i);
  assert.match(sql,/private\.is_email_confirmed\(\)/i);
});

test('convites aplicam hierarquia de papel e aceite autenticado',()=>{
  const sql=fs.readFileSync('supabase/migrations/20261005004644_secure_auction_invitation_roles_and_acceptance.sql','utf8');
  assert.match(sql,/function private\.can_invite_role/i);
  assert.match(sql,/when 'owner'::public\.auction_member_role/i);
  assert.match(sql,/when 'admin'::public\.auction_member_role/i);
  assert.match(sql,/OWNER_ROLE_CANNOT_BE_GRANTED_BY_INVITATION/);
  assert.match(sql,/INVITATION_EMAIL_MISMATCH/);
  assert.match(sql,/function public\.accept_auction_invitation/i);
  assert.match(sql,/security invoker/i);
  assert.match(sql,/invitation\.accepted/);
  assert.match(sql,/status in \('pending','revoked','expired'\)/);
});
