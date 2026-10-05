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


test('ST-MNM-40C prefere capability backend e falha fechado em divergência',()=>{
  const js=fs.readFileSync('integridade.js','utf8');
  assert.match(js,/source\?\.extra_data\?\.lotsConnector/);
  assert.match(js,/backendConnector && catalogConnector && backendConnector!==catalogConnector/);
  assert.match(js,/Divergência de capability/);
  assert.match(js,/Não executar automaticamente/);
  assert.match(js,/connector=backendConnector\|\|catalogConnector/);
  assert.match(js,/capabilityDrift/);
  assert.match(js,/fetchVisibleRows\('official_sources','id,name,status,last_verified,active,extra_data'/);
  assert.doesNotMatch(js,/\.insert\(|\.update\(|\.upsert\(|\.delete\(/);
});


test('ST-MNM-40D exige run success para prova e expõe execução ativa',()=>{
  const js=fs.readFileSync('integridade.js','utf8');
  assert.match(js,/function runLifecycle/);
  assert.match(js,/row\.status==='success'/);
  assert.match(js,/row\.status==='started' && !row\.finished_at/);
  assert.match(js,/historicalProof=lifecycle\.success>0 && sourceDocs\.length>0/);
  assert.match(js,/execução em andamento/);
  assert.match(js,/não iniciar outra para a mesma fonte/);
  assert.match(js,/sourcesWithErrors/);
  assert.match(js,/activeRuns/);
  assert.doesNotMatch(js,/\.insert\(|\.update\(|\.upsert\(|\.delete\(/);
});


test('ST-MNM-40E separa prova histórica do estado da execução mais recente',()=>{
  const js=fs.readFileSync('integridade.js','utf8');
  assert.match(js,/latestStatus:String\(latest\?\.status\|\|''\)/);
  assert.match(js,/latestActive:Boolean/);
  assert.match(js,/function sourceEvidenceState/);
  assert.match(js,/Prova histórica válida • última execução falhou/);
  assert.match(js,/Prova histórica válida • última execução parcial/);
  assert.match(js,/Revisar o erro da última execução antes de repetir/);
  assert.match(js,/historicalProof=lifecycle\.success>0 && sourceDocs\.length>0/);
  assert.doesNotMatch(js,/const state=lifecycle\.active/);
  assert.doesNotMatch(js,/\.insert\(|\.update\(|\.upsert\(|\.delete\(/);
});


test('ST-MNM-40G Integridade oferece suporte real sem mutação automática',()=>{
  const html=fs.readFileSync('integridade.html','utf8');
  const js=fs.readFileSync('integridade.js','utf8');
  assert.match(html,/id="reconciliacao-assistida"/);
  assert.match(html,/suporte@jus9tecnologia\.com\.br/);
  assert.match(html,/wa\.me\/5548991089206/);
  assert.match(html,/não apague nem edite linhas manualmente/);
  assert.doesNotMatch(js,/\.insert\(|\.update\(|\.upsert\(|\.delete\(/);
});


test('ST-MNM-41A reconcilia proveniência por resultId sem somar resultados da mesma fonte',()=>{
  const html=fs.readFileSync('integridade.html','utf8');
  const js=fs.readFileSync('integridade.js','utf8');
  assert.match(html,/Evidência por resultado oficial/);
  assert.match(html,/integrityResultRows/);
  assert.match(js,/function renderResultObservability/);
  assert.match(js,/run\?\.metadata\?\.resultId/);
  assert.match(js,/latestSuccess/);
  assert.match(js,/metadata\?\.documentId/);
  assert.match(js,/source_evidence\?\.officialResultId/);
  assert.match(js,/Success sem documento vinculado/);
  assert.match(js,/Prova sem leilão relacional/);
  assert.match(js,/Divergente: prova/);
  assert.match(js,/Prova alinhada • último run/);
  assert.match(js,/fetchVisibleRows\('source_search_runs','source_id,status,found_count,started_at,finished_at,metadata'/);
  assert.match(js,/fetchVisibleRows\('source_documents','id,source_id,reference,created_at,document_url'/);
  assert.doesNotMatch(js,/\.insert\(|\.update\(|\.upsert\(|\.delete\(/);
});


test('ST-MNM-41D exibe resultado catalogado mesmo sem run backend',()=>{
  const html=fs.readFileSync('integridade.html','utf8');
  const js=fs.readFileSync('integridade.js','utf8');
  assert.match(html,/catálogo define a expectativa/);
  assert.match(js,/SISTEMA_THIAGO_OFFICIAL_RESULTS/);
  assert.match(js,/resultCatalogById/);
  assert.match(js,/for\(const result of catalogResults\)/);
  assert.match(js,/if\(!resultRuns\.length && catalogResult\)/);
  assert.match(js,/Sem run backend • execução governada pendente/);
  assert.match(js,/Relacional sem prova backend/);
  assert.match(js,/Sem run backend • capability divergente/);
  assert.match(js,/catalogMissing/);
  assert.match(js,/runOnly/);
  assert.match(js,/renderResultObservability\(sourceRunRows,sourceDocumentRows,auctions,lots,sourceRows\)/);
  assert.doesNotMatch(js,/\.insert\(|\.update\(|\.upsert\(|\.delete\(/);
});
