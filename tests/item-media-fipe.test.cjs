const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

test('ST-MNM-44C private-media funciona no app e na pagina FIPE',()=>{
  const media=fs.readFileSync('private-media.js','utf8');
  assert.doesNotMatch(media,/!window\.SISTEMA_THIAGO_APP/);
  assert.match(media,/SISTEMA_THIAGO_MEDIA_URLS/);
  assert.match(media,/SISTEMA_THIAGO_ITEM_MEDIA_URLS/);
  assert.match(media,/SISTEMA_THIAGO_FIPE_MEDIA_URLS/);
  assert.match(media,/sistema-thiago:media-ready/);
  assert.match(media,/createSignedUrls\(paths,60\*60\)/);
  assert.doesNotMatch(media,/getPublicUrl/);
});

test('ST-MNM-44C pagina FIPE exibe imagem privada assinada quando houver imageName',()=>{
  const html=fs.readFileSync('fipe.html','utf8');
  const js=fs.readFileSync('fipe.js','utf8');
  const css=fs.readFileSync('styles.css','utf8');
  assert.match(html,/private-media\.js\?v=20261005-item-media1/);
  assert.match(js,/SISTEMA_THIAGO_FIPE_MEDIA_URLS/);
  assert.match(js,/class="fipe-reference-media"/);
  assert.match(js,/loading="lazy"/);
  assert.match(js,/sistema-thiago:media-ready/);
  assert.match(css,/\.fipe-reference-media img/);
});

test('ST-MNM-44C migration vincula midia por prova exata e fallback somente com item unico',()=>{
  const sql=fs.readFileSync('supabase/migrations/20261005192500_link_media_to_items.sql','utf8');
  assert.match(sql,/lower\(btrim\(lm\.source_label\)\)=lower\(btrim\(li\.source_media_label\)\)/);
  assert.match(sql,/having count\(\*\)=1/);
  assert.match(sql,/lot_item_id=ue\.item_id/);
  assert.match(sql,/lot_item_id=si\.item_id/);
});
