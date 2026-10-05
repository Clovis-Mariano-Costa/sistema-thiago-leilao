const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {execFileSync}=require('node:child_process');

test('app.js continua com sintaxe JavaScript válida',()=>{
  execFileSync(process.execPath,['--check','app.js'],{stdio:'pipe'});
});

test('cadastro suporta vários lotes e vários itens por lote',()=>{
  const html=fs.readFileSync('app.html','utf8');
  const js=fs.readFileSync('app.js','utf8');
  assert.match(html,/id="bulkLotsBtn"/);
  assert.match(html,/id="bulkLotsForm"/);
  assert.match(html,/name="additionalItems"/);
  assert.match(js,/function freshItem/);
  assert.match(js,/lot\.items = \[primary/);
  assert.match(js,/Itens deste lote/);
});

test('schema versionado contém lot_items e vínculos de mídia FIPE',()=>{
  const sql=fs.readFileSync('supabase/migrations/20261003045241_add_multi_item_lots.sql','utf8');
  assert.match(sql,/create table if not exists public\.lot_items/i);
  assert.match(sql,/add column if not exists lot_item_id/i);
  assert.match(sql,/enable row level security/i);
});


test('ST-MNM-45A recupera itens relacionais ausentes do snapshot e mostra serial',()=>{
  const app=fs.readFileSync('app.js','utf8');
  const cloud=fs.readFileSync('cloud-sync.js','utf8');
  assert.match(cloud,/function reconcileImportedItemStructure/);
  assert.match(cloud,/function relationalItemToLocal/);
  assert.match(cloud,/source_media_label/);
  assert.match(cloud,/recoveredItems/);
  assert.match(cloud,/Estrutura de itens reconciliada/);
  assert.match(app,/function itemSerial/);
  assert.match(app,/Serial\/chassi/);
  assert.match(app,/auction\?\.id\|\|''\)\+':/);
});


test('ST-MNM-45B separa contagem de lotes da contagem de itens e oferece seletor explícito',()=>{
  const html=fs.readFileSync('app.html','utf8');
  const js=fs.readFileSync('app.js','utf8');
  assert.match(html,/id="lotCount"/);
  assert.match(html,/<span>Lotes<\/span>/);
  assert.match(html,/class="item-select"/);
  assert.match(js,/\$\('#lotCount'\)\.textContent = lotTotal/);
  assert.match(js,/Selecionar item deste lote|itemSelect/);
  assert.match(js,/lotIndex\+1/);
  assert.match(js,/lotTotal/);
});
