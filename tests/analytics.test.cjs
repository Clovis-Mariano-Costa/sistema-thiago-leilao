const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

test('painel publica acesso à área de análises',()=>{
  const app=fs.readFileSync('app.html','utf8');
  const build=fs.readFileSync('scripts/build-pages.cjs','utf8');
  assert.match(app,/href="analises\.html">Análises</);
  assert.match(build,/'analises\.html','analises\.js','analises\.css'/);
});

test('análises usam somente dados relacionais visíveis por RLS',()=>{
  const js=fs.readFileSync('analises.js','utf8');
  assert.match(js,/client\.auth\.getUser\(\)/);
  assert.match(js,/client\.from\('auctions'\)/);
  assert.match(js,/client\.from\('lots'\)/);
  assert.match(js,/\.eq\('auction_id',auctionId\)/);
  assert.match(js,/\.range\(from,from\+pageSize-1\)/);
  assert.doesNotMatch(js,/service[_-]?role|SUPABASE_SECRET_KEYS/i);
});

test('análises não convertem ausência de valor em média zero',()=>{
  const js=fs.readFileSync('analises.js','utf8');
  assert.match(js,/if\(!values\.length\) return null/);
  assert.match(js,/avg==null\?'—':money\(avg\)/);
  assert.match(js,/nenhum valor informado/);
});

test('mapa só abre quando há localização estruturada disponível',()=>{
  const html=fs.readFileSync('analises.html','utf8');
  const js=fs.readFileSync('analises.js','utf8');
  assert.match(html,/id="analyticsMapFrame"/);
  assert.match(html,/id="analyticsMapEmpty"/);
  assert.match(js,/function normalizeMapLocation/);
  assert.match(js,/if\(!locationLabel\)/);
  assert.match(js,/frame\.removeAttribute\('src'\)/);
  assert.match(js,/google\.com\/maps\?q=/);
});

test('ST-MNM-26A separa FIPE, mínimo, nosso máximo e valor final',()=>{
  const js=fs.readFileSync('analises.js','utf8');
  for(const field of ['fipe_value','minimum_bid','max_bid','final_value']){
    assert.match(js,new RegExp(field));
  }
});
