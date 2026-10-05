const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

test('ST-MNM-29A publica tela de integridade somente leitura e autenticada',()=>{
  const html=fs.readFileSync('integridade.html','utf8');
  const js=fs.readFileSync('integridade.js','utf8');
  assert.match(html,/ST-MNM-29A/);
  assert.match(html,/somente leitura/i);
  assert.match(js,/client\.auth\.getUser\(\)/);
  assert.match(js,/from\('auctions'\)/);
  assert.match(js,/from\('user_state_snapshots'\)/);
  assert.match(js,/source_search_runs/);
  assert.match(js,/source_documents/);
  assert.doesNotMatch(js,/\.insert\(|\.update\(|\.upsert\(|\.delete\(/);
  assert.doesNotMatch(js,/service_role|SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SECRET_KEYS/);
});

test('ST-MNM-29A diferencia gate relacional, proveniência e gates humanos',()=>{
  const js=fs.readFileSync('integridade.js','utf8');
  assert.match(js,/Canonização relacional oficial/);
  assert.match(js,/Observabilidade de fonte/);
  assert.match(js,/Participantes \/ convites/);
  assert.match(js,/Modo ao Vivo/);
  assert.match(js,/source_type===\'official\'/);
});

test('build público inclui integridade sem diretórios internos',()=>{
  const build=fs.readFileSync('scripts/build-pages.cjs','utf8');
  assert.match(build,/integridade\.html/);
  assert.match(build,/integridade\.js/);
  assert.match(build,/integridade\.css/);
  assert.match(build,/forbidden=.*supabase/);
});

test('ST-MNM-37C compara snapshot e relacional sem promover dados',()=>{
  const html=fs.readFileSync('integridade.html','utf8');
  const js=fs.readFileSync('integridade.js','utf8');
  assert.match(html,/Snapshot × banco relacional/);
  assert.match(html,/integrityParityRows/);
  assert.match(js,/select\('state,state_version,last_client_change,source_origin'\)/);
  assert.match(js,/source_evidence/);
  assert.match(js,/function renderSnapshotParity/);
  assert.match(js,/Paridade snapshot ↔ relacional/);
  assert.match(js,/Somente snapshot/);
  assert.match(js,/Divergente/);
  assert.match(js,/Alinhado/);
  assert.doesNotMatch(js,/\.insert\(|\.upsert\(|\.delete\(/);
});
