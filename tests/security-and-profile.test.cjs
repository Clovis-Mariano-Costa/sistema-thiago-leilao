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
  const html=fs.readFileSync('index.html','utf8');
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
