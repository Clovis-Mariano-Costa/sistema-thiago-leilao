const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

test('favicon SVG está presente e referenciado nas páginas principais',()=>{
  assert.ok(fs.existsSync('favicon.svg'));
  for(const file of ['index.html','auth.html','app.html','fipe.html','fontes-oficiais.html','parceria.html','privacidade.html','cookies.html','termos.html']){
    const html=fs.readFileSync(file,'utf8');
    assert.match(html,/favicon\.svg\?v=20261003b/);
    assert.match(html,/favicon\.png\?v=20261003b/);
  }
});
