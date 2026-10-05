const fs=require('node:fs');
const test=require('node:test');
const assert=require('node:assert/strict');

const app=fs.readFileSync('app.js','utf8');
const html=fs.readFileSync('app.html','utf8');
const media=fs.readFileSync('private-media.js','utf8');
const build=fs.readFileSync('scripts/build-pages.cjs','utf8');

test('Painel usa URL assinada de foto privada quando disponível',()=>{
  assert.match(app,/SISTEMA_THIAGO_MEDIA_URLS/);
  assert.match(app,/function lotPhotoUrl/);
  assert.match(app,/SISTEMA_THIAGO_MEDIA_URLS/);
  assert.match(app,/lot\.photoDataUrl \|\| ''/);
  assert.match(html,/private-media\.js\?v=20261005-item-media\d+/);
});

test('hidratação consulta apenas leilão do usuário autenticado e assina URLs privadas',()=>{
  assert.match(media,/auth\.getUser\(\)/);
  assert.match(media,/eq\('owner_id',user\.id\)/);
  assert.match(media,/eq\('title',TARGET_AUCTION_TITLE\)/);
  assert.match(media,/createSignedUrls\(paths,60\*60\)/);
  assert.doesNotMatch(media,/getPublicUrl/);
});

test('UI preserva todos os candidatos FIPE sem selecionar silenciosamente um deles',()=>{
  assert.match(app,/lot-fipe-candidates/);
  assert.match(app,/Referências FIPE da captura/);
  assert.match(app,/revisar/);
});

test('build publica hidratação de mídia privada',()=>{
  assert.match(build,/private-media\.js/);
});

test('painel mostra cada código FIPE ligado ao respectivo valor sem selecionar candidato automaticamente',()=>{
  assert.match(app,/function fipeCandidatePairLabel/);
  assert.match(app,/lot-fipe-visible/);
  assert.match(app,/FIPE importada da captura/);
  assert.match(app,/candidate\.code/);
  assert.match(app,/→ R\$/);
  assert.match(app,/Referências FIPE da captura/);
});


test('ST-MNM-25A sincroniza somente campos operacionais alterados no lote canônico',()=>{
  const fs=require('node:fs');
  const cloud=fs.readFileSync('cloud-sync.js','utf8');
  assert.match(cloud,/function operationalPayload/);
  assert.match(cloud,/preference_level:/);
  assert.match(cloud,/fipe_value:/);
  assert.match(cloud,/minimum_bid:/);
  assert.match(cloud,/max_bid:/);
  assert.match(cloud,/final_value:/);
  assert.match(cloud,/sold:/);
  assert.match(cloud,/result:/);
  assert.match(cloud,/note:/);
  assert.match(cloud,/operationalFingerprints/);
  assert.match(cloud,/if\(nextFingerprint===previousFingerprint\) continue/);
  assert.match(cloud,/\.from\('lots'\)[\s\S]*\.update\(payload\)[\s\S]*\.eq\('id',row\.id\)[\s\S]*\.select\('id'\)[\s\S]*\.maybeSingle\(\)/);
  assert.match(cloud,/A política de acesso não confirmou edição deste lote/);
});

test('ST-MNM-25A resolve lote relacional sob RLS sem service role no navegador',()=>{
  const fs=require('node:fs');
  const cloud=fs.readFileSync('cloud-sync.js','utf8');
  assert.match(cloud,/resolveRelationalAuction/);
  assert.match(cloud,/contains\('source_evidence',\{officialResultId:resultId\}\)/);
  assert.match(cloud,/range\(from,from\+pageSize-1\)/);
  assert.doesNotMatch(cloud,/service[_-]?role|SUPABASE_SECRET_KEYS/i);
});

test('ST-MNM-25A snapshot permanece contingência quando write-through falha',()=>{
  const fs=require('node:fs');
  const cloud=fs.readFileSync('cloud-sync.js','utf8');
  const listener=cloud.slice(cloud.indexOf("window.addEventListener('sistema-thiago:state-saved'"));
  assert.match(listener,/const snapshotOk=await upload/);
  assert.match(listener,/if\(!snapshotOk\) return/);
  assert.match(listener,/const relational=await syncOperationalChanges/);
  assert.match(listener,/dados continuam protegidos no snapshot/i);
});
