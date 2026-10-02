const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('auth habilita cadastro e login por e-mail',()=>{
  const html=fs.readFileSync('auth.html','utf8');
  const js=fs.readFileSync('auth.js','utf8');
  const cfg=fs.readFileSync('auth-config.js','utf8');

  assert.match(html,/id="emailCreateBtn"/);
  assert.match(html,/id="emailLoginBtn"/);
  assert.doesNotMatch(html,/id="emailCreateBtn"[^>]*disabled/);
  assert.doesNotMatch(html,/id="emailLoginBtn"[^>]*disabled/);
  assert.match(js,/signUp\(/);
  assert.match(js,/signInWithPassword\(/);
  assert.match(js,/resetPasswordForEmail\(/);
  assert.match(cfg,/SUPABASE_CONFIG/);
  assert.match(cfg,/sb_publishable_/);
});

test('fontes carrega configuração e conector PNCP',()=>{
  const html=fs.readFileSync('fontes-oficiais.html','utf8');
  const js=fs.readFileSync('fontes.js','utf8');
  assert.match(html,/auth-config\.js/);
  assert.match(js,/functions\/v1\/pncp-lots/);
  assert.match(js,/Buscando lotes no edital oficial/);
  assert.match(js,/pncp_error/);
});
