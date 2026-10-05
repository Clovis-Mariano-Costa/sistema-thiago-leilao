const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

test('ST-MNM-44E analises usam itens como unidade operacional',()=>{
  const js=fs.readFileSync('analises.js','utf8');
  const html=fs.readFileSync('analises.html','utf8');
  assert.match(js,/from\('lot_items'\)/);
  assert.match(js,/function fetchItems/);
  assert.match(js,/item_identifier/);
  assert.match(js,/fipe_value,minimum_bid,max_bid,final_value/);
  assert.match(html,/<span>Itens<\/span>/);
  assert.match(html,/Itens com preferência/);
  assert.match(html,/Item \/ ID/);
});

test('ST-MNM-44E mapa usa localizacao do leilao ou cidade UF dos itens',()=>{
  const js=fs.readFileSync('analises.js','utf8');
  const html=fs.readFileSync('analises.html','utf8');
  assert.match(js,/function normalizeMapLocation/);
  assert.match(js,/item\?\.city/);
  assert.match(js,/google\.com\/maps\?q=/);
  assert.match(js,/google\.com\/maps\/search/);
  assert.match(html,/id="analyticsMapFrame"/);
  assert.match(html,/id="analyticsMapLink"/);
});
