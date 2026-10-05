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


test('ST-MNM-40H Edge valida capability backend antes de iniciar telemetria',()=>{
  const edge=fs.readFileSync('supabase/functions/pncp-lots/index.ts','utf8');
  assert.match(edge,/async function requireBackendConnectorAuthority/);
  assert.match(edge,/from\("official_sources"\)/);
  assert.match(edge,/select\("id,active,extra_data"\)/);
  assert.match(edge,/data\.active!==true/);
  assert.match(edge,/extra_data\?\.lotsConnector/);
  assert.match(edge,/requestedConnector!==backendConnector/);
  const authorityPos=edge.indexOf('const authority=await requireBackendConnectorAuthority');
  const runPos=edge.indexOf('const run=await startSourceRun');
  assert.ok(authorityPos>=0 && runPos>authorityPos,'authority backend deve anteceder startSourceRun');
  assert.match(edge,/if\(authority\.response\) return authority\.response/);
  assert.match(edge,/authority\.admin/);
});

test('ST-MNM-40H chamada não autorizada falha antes de source_search_run',()=>{
  const edge=fs.readFileSync('supabase/functions/pncp-lots/index.ts','utf8');
  const body=edge.slice(edge.indexOf('Deno.serve'));
  const guard=body.indexOf('if(authority.response) return authority.response');
  const start=body.indexOf('startSourceRun');
  assert.ok(guard>=0 && start>guard,'guard server-side deve ocorrer antes da telemetria');
  assert.match(edge,/Fonte oficial inexistente ou desativada para automação/);
  assert.match(edge,/backend não autoriza conector automático/);
  assert.match(edge,/Conector solicitado não corresponde à capability autorizada/);
});
