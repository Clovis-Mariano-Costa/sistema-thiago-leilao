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
