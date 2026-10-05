const fs=require('node:fs');
const test=require('node:test');
const assert=require('node:assert/strict');

const html=fs.readFileSync('app.html','utf8');
const js=fs.readFileSync('app.js','utf8');
const css=fs.readFileSync('styles.css','utf8');

test('foto do lote pode ser ampliada sem remover miniatura',()=>{
  assert.match(html,/id="photoViewerDialog"/);
  assert.match(html,/id="photoViewerImage"/);
  assert.match(js,/function openLotPhoto/);
  assert.match(js,/lotPhoto\.addEventListener\('click'/);
  assert.match(js,/event\.key==='Enter'/);
  assert.match(css,/cursor:zoom-in/);
});

test('modo ao vivo mostra foto sem remover controles existentes',()=>{
  assert.match(html,/id="livePhotoButton"/);
  assert.match(html,/id="livePhoto"/);
  for(const id of ['liveBackBtn','livePreferenceBtn','liveSkipBtn','liveSoldBtn']){
    assert.match(html,new RegExp('id="'+id+'"'));
  }
  assert.match(js,/const currentPhotoUrl = lotPhotoUrl\(current\)/);
  assert.match(js,/livePhotoButton\.hidden = false/);
});

test('foto continua vindo da URL privada hidratada quando disponível',()=>{
  assert.match(js,/SISTEMA_THIAGO_MEDIA_URLS/);
  assert.match(js,/window\.SISTEMA_THIAGO_MEDIA_URLS\?\.\[String\(lot\.n\)\]/);
});
