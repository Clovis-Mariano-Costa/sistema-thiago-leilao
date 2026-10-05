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
  assert.match(html,/private-media\.js\?v=20261004-media1/);
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
