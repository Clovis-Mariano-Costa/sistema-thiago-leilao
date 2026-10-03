const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

test('favicon PNG absoluto está referenciado nas páginas principais',()=>{
  assert.ok(fs.existsSync('favicon.png'));
  for(const file of ['index.html','auth.html','app.html','fipe.html','fontes-oficiais.html','parceria.html','privacidade.html','cookies.html','termos.html']){
    const html=fs.readFileSync(file,'utf8');
    assert.match(html,/href="\/favicon\.png\?v=20261003c"/,file);
    assert.doesNotMatch(html,/favicon\.svg/,file);
  }
});
