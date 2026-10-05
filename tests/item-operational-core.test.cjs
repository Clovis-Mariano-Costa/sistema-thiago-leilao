const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

test('ST-MNM-44B modela operacao no item sem eliminar o lote',()=>{
  const app=fs.readFileSync('app.js','utf8');
  assert.match(app,/function generatedItemIdentifier/);
  assert.match(app,/function operationalEntries/);
  assert.match(app,/function nextPendingItem/);
  assert.match(app,/bindItemText\(card,'.fipe-value-input',lot,item,'fipeValue'\)/);
  assert.match(app,/bindItemText\(card,'.minimum-bid-input',lot,item,'minimumBid'\)/);
  assert.match(app,/item\.preferenceLevel = \(item\.preferenceLevel \+ 1\) % 3/);
  assert.match(app,/item\.sold = !item\.sold/);
});

test('ST-MNM-44B card navega entre itens e mostra identificador',()=>{
  const html=fs.readFileSync('app.html','utf8');
  const css=fs.readFileSync('styles.css','utf8');
  assert.match(html,/class="item-identity"/);
  assert.match(html,/class="item-prev-btn"/);
  assert.match(html,/class="item-next-btn"/);
  assert.match(html,/Dados completos do item/);
  assert.match(css,/\.lot-item-tab\.active/);
  assert.match(css,/\.item-identity/);
});

test('ST-MNM-44B PDF e CSV discriminam item e identificador',()=>{
  const app=fs.readFileSync('app.js','utf8');
  assert.match(app,/Identificador do item/);
  assert.match(app,/Item \/ ID/);
  assert.match(app,/FIPE \/ referências/);
  assert.match(app,/operationalEntries\(a\)\.map/);
});

test('ST-MNM-44B persiste operacao por item no banco canonico',()=>{
  const cloud=fs.readFileSync('cloud-sync.js','utf8');
  const migration=fs.readFileSync('supabase/migrations/20261005190000_item_operational_controls.sql','utf8');
  assert.match(cloud,/function canonicalItemPayload/);
  assert.match(cloud,/\.from\('lot_items'\)/);
  assert.match(cloud,/itemChanged/);
  for(const column of ['fipe_value','minimum_bid','max_bid','final_value','preference_level','sold','result','note']){
    assert.ok(migration.includes('add column if not exists '+column),column+' precisa existir na migration');
  }
  assert.match(migration,/generated_identifier_origin/);
  assert.match(migration,/having count\(\*\)=1/);
});

test('ST-MNM-44B importadores geram ID interno sem sobrescrever identificador existente',()=>{
  const fontes=fs.readFileSync('fontes.js','utf8');
  const wa=fs.readFileSync('whatsapp-import.js','utf8');
  assert.ok(fontes.includes("'ST-L'+String(n).padStart(3,'0')+'-I01"));
  assert.match(fontes,/fipe_value:relationalMoney/);
  assert.match(fontes,/minimum_bid:relationalMoney/);
  assert.match(wa,/generatedIdentifierOrigin:'sistema_thiago'/);
});
