const fs=require('node:fs');
const test=require('node:test');
const assert=require('node:assert/strict');

const html=fs.readFileSync('app.html','utf8');
const js=fs.readFileSync('app.js','utf8');
const css=fs.readFileSync('styles.css','utf8');
const sync=fs.readFileSync('cloud-sync.js','utf8');

test('ST-MNM-36C modo ao vivo permite editar nosso máximo no celular',()=>{
  assert.match(html,/id="liveMaxBidInput"/);
  assert.match(html,/inputmode="decimal"/);
  assert.match(js,/function saveLiveMaxBid/);
  assert.match(js,/current\.maxBid = nextValue/);
  assert.match(js,/liveMaxBidInput\?\.addEventListener\('change',saveLiveMaxBid\)/);
  assert.match(js,/saveState\(\)/);
});

test('ST-MNM-36C nosso máximo continua no snapshot e banco canônico',()=>{
  assert.match(sync,/max_bid:normalizeMoney\(lot\?\.maxBid\)/);
  assert.match(sync,/user_state_snapshots/);
  assert.match(sync,/syncOperationalChanges/);
});

test('ST-MNM-36C diálogo ao vivo suporta viewport móvel baixo',()=>{
  assert.match(css,/max-height:96dvh/);
  assert.match(css,/\.live-shell\{[^}]*overflow:auto/);
  assert.match(css,/@media\(max-width:520px\)/);
  assert.match(css,/\.live-actions-grid,\.live-max-bid-editor,\.live-sold-btn\{width:100%\}/);
});
