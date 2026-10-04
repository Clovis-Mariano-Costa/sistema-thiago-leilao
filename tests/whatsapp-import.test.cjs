const fs=require('node:fs');
const test=require('node:test');
const assert=require('node:assert/strict');

const html=fs.readFileSync('app.html','utf8');
const js=fs.readFileSync('whatsapp-import.js','utf8');
const build=fs.readFileSync('scripts/build-pages.cjs','utf8');

test('painel expõe importação WhatsApp por pacote ZIP local',()=>{
  assert.match(html,/id="importWhatsappBtn"/);
  assert.match(html,/id="importWhatsappInput"/);
  assert.match(html,/whatsapp-import\.js/);
});

test('importador exige sessão confirmada e usa Storage privado',()=>{
  assert.match(js,/getSession\(\)/);
  assert.match(js,/email_confirmed_at/);
  assert.match(js,/storage\.from\('auction-media'\)/);
  assert.match(js,/Leilão Thiago — Base inicial/);
  assert.doesNotMatch(js,/service_role/i);
  assert.doesNotMatch(js,/getPublicUrl/);
});

test('build publica o importador sem publicar o pacote privado',()=>{
  assert.match(build,/whatsapp-import\.js/);
  assert.doesNotMatch(build,/IMG-20261002-WA0008/);
  assert.doesNotMatch(build,/manifesto_importacao_whatsapp/);
});
