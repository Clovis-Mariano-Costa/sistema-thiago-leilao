const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {execFileSync}=require('node:child_process');

for(const file of ['app.js','fontes.js','charlie-chat.js','cloud-sync.js']){
  test(file+' tem sintaxe JavaScript válida',()=>{
    execFileSync(process.execPath,['--check',file],{stdio:'pipe'});
  });
}

test('importador oficial usa configuração correta e retorna ao painel',()=>{
  const js=fs.readFileSync('fontes.js','utf8');
  assert.match(js,/fetch\(SUPABASE_CFG\.url\+'\/functions\/v1\/pncp-lots'/);
  assert.doesNotMatch(js,/fetch\(cfg\.url/);
  assert.match(js,/location\.href='app\.html\?'/);
  assert.match(js,/STORAGE_KEY_BASE='sistema-thiago-v4'/);
});

test('painel contém sync online, Charlie Echo e aviso de cookies',()=>{
  const app=fs.readFileSync('app.html','utf8');
  const landing=fs.readFileSync('index.html','utf8');
  assert.match(app,/id="cloudSyncStatus"/);
  assert.match(app,/charlie-chat\.js/);
  assert.match(app,/cloud-sync\.js/);
  assert.match(app,/cookie-notice\.js/);
  assert.match(landing,/cookie-notice\.js/);
  assert.doesNotMatch(app,/<main>\\n/);
});

test('persistência online é isolada por usuário com RLS',()=>{
  const sql=fs.readFileSync('supabase/migrations/20261003022000_online_user_state_sync_and_media_policies.sql','utf8');
  assert.match(sql,/create table if not exists public\.user_state_snapshots/i);
  assert.match(sql,/alter table public\.user_state_snapshots enable row level security/i);
  assert.match(sql,/user_id = \(select auth\.uid\(\)\)/);
  assert.match(sql,/bucket_id = 'auction-media'/);
});

test('segredos locais ficam fora do Git',()=>{
  const ignore=fs.readFileSync('.gitignore','utf8');
  assert.match(ignore,/\.dev\.vars\.\*/);
  assert.match(ignore,/\.env\.\*/);
  assert.match(ignore,/!\.env\.example/);
  assert.match(ignore,/\.wrangler\//);
});
