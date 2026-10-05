const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

test('ST-MNM-44E consolida exportacao sem perder formatos',()=>{
  const html=fs.readFileSync('app.html','utf8');
  assert.match(html,/class="export-menu"/);
  assert.match(html,/>Exportar dados</);
  assert.match(html,/id="printBtn"/);
  assert.match(html,/id="exportCsvBtn"/);
  assert.match(html,/id="backupJsonBtn"/);
});

test('ST-MNM-44E analises usam lot_items e nao lots financeiros',()=>{
  const js=fs.readFileSync('analises.js','utf8');
  assert.match(js,/async function fetchItems\(auctionId\)/);
  assert.match(js,/from\('lot_items'\)/);
  assert.match(js,/item_identifier/);
  assert.match(js,/FIPE para revisar/);
  assert.doesNotMatch(js,/async function fetchLots\(auctionId\)/);
  assert.match(js,/value!==null && value!==undefined/);
});

test('ST-MNM-44E painel renderiza lotes progressivamente',()=>{
  const js=fs.readFileSync('app.js','utf8');
  const html=fs.readFileSync('app.html','utf8');
  assert.match(js,/const LOT_RENDER_STEP = 120/);
  assert.match(js,/filtered\.slice\(0,lotRenderLimit\)/);
  assert.match(js,/lotRenderLimit\+=LOT_RENDER_STEP/);
  assert.match(html,/id="loadMoreLotsBtn"/);
});

test('ST-MNM-44E oferece leiloeiro e mapa apenas quando aplicavel',()=>{
  const js=fs.readFileSync('app.js','utf8');
  const html=fs.readFileSync('app.html','utf8');
  const sources=fs.readFileSync('official-sources.js','utf8');
  assert.match(html,/id="auctioneerLink"/);
  assert.match(html,/id="auctionMapLink"/);
  assert.match(js,/google\.com\/maps\/search\/\?api=1&query=/);
  assert.match(js,/mapEligible/);
  assert.match(sources,/Kronberg Leilões/);
  assert.match(sources,/https:\/\/www\.kronbergleiloes\.com\.br\//);
});

test('ST-MNM-44E mantem PDF e CSV itemizados',()=>{
  const js=fs.readFileSync('app.js','utf8');
  assert.match(js,/operationalEntries\(a\)/);
  assert.match(js,/Item \/ ID/);
  assert.match(js,/Identificador do item/);
});
