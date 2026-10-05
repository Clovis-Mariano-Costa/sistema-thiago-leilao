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
