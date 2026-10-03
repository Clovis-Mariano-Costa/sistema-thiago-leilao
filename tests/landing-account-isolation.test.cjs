const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

test('landing publica preserva identidade, parceria e canais corretos',()=>{
  const html=fs.readFileSync('index.html','utf8');
  assert.match(html,/Uma parceria entre Jus 9 Tecnologia Jurídica - Jus 9 Verde e Nações Por Herança/);
  assert.match(html,/\(48\) 99108-9206/);
  assert.doesNotMatch(html,/automacao@jus9tecnologia\.com\.br/i);
  assert.match(html,/data-chat-launcher/);
  assert.match(html,/auth\.html#login/);
  assert.match(html,/auth\.html#cadastro/);
});

test('novas contas nao recebem automaticamente a base Thiago',()=>{
  const app=fs.readFileSync('app.js','utf8');
  assert.match(app,/const STORAGE_KEY_BASE = 'sistema-thiago-v4'/);
  assert.match(app,/return `\$\{STORAGE_KEY_BASE\}:\$\{currentSessionIdentity\(\)\}`/);
  assert.match(app,/auctions: \[\]/);
  assert.doesNotMatch(app,/currentUserId: 'thiago'/);
  assert.match(app,/Migração automática entre contas foi desativada por segurança/);
});

test('paginas publicas nao exibem o canal interno de automacao',()=>{
  for(const file of ['index.html','parceria.html','termos.html']){
    const text=fs.readFileSync(file,'utf8');
    assert.doesNotMatch(text,/automacao@jus9tecnologia\.com\.br/i,file);
  }
});
