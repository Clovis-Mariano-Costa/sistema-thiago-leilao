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
  assert.match(js,/Somente relacional/);
  assert.match(js,/matchedRelationalIds/);
  assert.match(js,/Divergente/);
  assert.match(js,/Alinhado/);
  assert.doesNotMatch(js,/\.insert\(|\.upsert\(|\.delete\(/);
});

test('ST-MNM-38A expõe readiness do P2 sem ampliar permissões',()=>{
  const html=fs.readFileSync('integridade.html','utf8');
  const js=fs.readFileSync('integridade.js','utf8');
  assert.match(html,/38A/);
  assert.match(html,/Auditoria de acesso/);
  assert.match(js,/fetchVisibleRows\('auction_members'/);
  assert.match(js,/fetchVisibleRows\('invitations'/);
  assert.match(js,/fetchVisibleRows\('audit_log'/);
  assert.match(js,/Matriz de papéis do P2/);
  assert.match(js,/Convites \/ auditoria do P2/);
  assert.match(js,/invitation\.created/);
  assert.match(js,/invitation\.accepted/);
  assert.match(js,/invitation\.revoked/);
  assert.match(js,/owner','admin','participant','observer/);
  assert.match(js,/renderSnapshotParity/);
  assert.doesNotMatch(js,/\.insert\(|\.update\(|\.upsert\(|\.delete\(/);
});


test('ST-MNM-39D mede observabilidade por fonte e não apenas por total global',()=>{
  const fs=require('node:fs');
  const html=fs.readFileSync('integridade.html','utf8');
  const js=fs.readFileSync('integridade.js','utf8');
  assert.match(html,/Observabilidade por fonte/);
  assert.match(html,/integritySourceRows/);
  assert.match(js,/function renderSourceObservability/);
  assert.match(js,/fetchVisibleRows\('official_sources'/);
  assert.match(js,/fetchVisibleRows\('source_search_runs'/);
  assert.match(js,/fetchVisibleRows\('source_documents'/);
  assert.match(js,/Com prova backend/);
  assert.match(js,/Sem telemetria/);
  assert.match(js,/sourceCoverage\.covered<sourceCoverage\.active/);
  assert.doesNotMatch(js,/\.insert\(|\.update\(|\.upsert\(|\.delete\(/);
});


test('ST-MNM-40A torna observabilidade por fonte acionável sem escrita automática',()=>{
  const html=fs.readFileSync('integridade.html','utf8');
  const js=fs.readFileSync('integridade.js','utf8');
  assert.match(html,/official-sources\.js/);
  assert.match(html,/Próxima ação/);
  assert.match(html,/Capacidade/);
  assert.match(js,/function sourceCapability/);
  assert.match(js,/Conector comprovado/);
  assert.match(js,/Monitoramento assistido/);
  assert.match(js,/Rota a validar/);
  assert.match(js,/Consulta assistida/);
  assert.match(js,/connectorPending/);
  assert.match(js,/run \+ documento \+ paridade/);
  assert.doesNotMatch(js,/\.insert\(|\.update\(|\.upsert\(|\.delete\(/);
});
