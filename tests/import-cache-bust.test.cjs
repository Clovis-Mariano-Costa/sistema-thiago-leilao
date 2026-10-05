const fs=require('node:fs');
const test=require('node:test');
const assert=require('node:assert/strict');

test('app força versão nova do importador',()=>{
  const html=fs.readFileSync('app.html','utf8');
  assert.match(html,/whatsapp-import\.js\?v=20261005-item45a1/);
});

test('Pages não mantém importador antigo em cache',()=>{
  const headers=fs.readFileSync('_headers','utf8');
  assert.match(headers,/\/app\*/);
  assert.match(headers,/whatsapp-import\.js/);
  assert.match(headers,/no-cache/);
  const build=fs.readFileSync('scripts/build-pages.cjs','utf8');
  assert.match(build,/'_headers'/);
});
