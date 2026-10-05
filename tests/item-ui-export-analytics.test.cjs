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
  assert.match(js,/const LOT_RENDER_STEP = 60/);
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


test('ST-MNM-44E mapa usa cidade e estado dos itens sem inventar coordenadas',()=>{
  const js=fs.readFileSync('analises.js','utf8');
  const html=fs.readFileSync('analises.html','utf8');
  assert.match(js,/city,state/);
  assert.match(js,/function renderLocations\(items,auction\)/);
  assert.match(js,/google\.com\/maps\?q=/);
  assert.match(html,/id="analyticsMapFrame"/);
  assert.match(html,/id="analyticsLocations"/);
});


test('ST-MNM-44F reduz trabalho pesado em salvamento e mídia',()=>{
  const app=fs.readFileSync('app.js','utf8');
  const cloud=fs.readFileSync('cloud-sync.js','utf8');
  const media=fs.readFileSync('private-media.js','utf8');

  assert.match(app,/function saveState\(showError = true, change = \{\}\)/);
  assert.doesNotMatch(app,/state\.auctions\.forEach\(a => \(a\.lots \|\| \[\]\)\.forEach\(syncLotRollupFromItems\)\)/);
  assert.match(app,/syncOnline:false/);
  assert.match(cloud,/pendingLotsByAuction/);
  assert.match(cloud,/\.in\('lot_number',requestedNumbers\)/);
  assert.match(cloud,/syncOperationalChangesBatch/);
  assert.match(cloud,/\},2200\);/);
  assert.doesNotMatch(media,/sistema-thiago:state-saved/);
  assert.match(media,/sistema-thiago:media-refresh-request/);
  assert.match(media,/45\*60\*1000/);
});


test('ST-MNM-44F busca vazia usa caminho rapido sem montar FIPE textual',()=>{
  const js=fs.readFileSync('app.js','utf8');
  const start=js.indexOf('function matches(lot)');
  const end=js.indexOf('const HUMAN_CONFIRMABLE_LOT_FIELDS',start);
  const block=js.slice(start,end);
  assert.match(block,/if \(query\) \{/);
  const gate=block.indexOf('if (query) {');
  const itemSearch=block.indexOf('const itemSearch',gate);
  const fipeSearch=block.indexOf('const fipeSearch',gate);
  const status=block.indexOf('const anyWaiting',gate);
  assert.ok(gate>=0 && itemSearch>gate && fipeSearch>itemSearch && status>fipeSearch);
  assert.doesNotMatch(block.slice(0,gate),/lotFipeCandidates|flatMap/);
});
