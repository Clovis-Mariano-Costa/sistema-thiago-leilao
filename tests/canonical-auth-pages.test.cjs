const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

test('Auth usa domínio oficial do Sistema Thiago',()=>{
  const cfg=fs.readFileSync('auth-config.js','utf8');
  const auth=fs.readFileSync('auth.js','utf8');
  assert.match(cfg,/appOrigin:\s*"https:\/\/sistema\.thiago\.jus9verde\.jus9tecnologia\.com\.br"/);
  assert.match(auth,/function oauthRedirectUrl\(\)/);
  assert.match(auth,/options:\{redirectTo:oauthRedirectUrl\(\)\}/);
  assert.match(auth,/location\.replace\(appUrl\(\)\)/);
});

test('páginas principais expõem favicon cache-busted',()=>{
  for(const file of ['index.html','auth.html','app.html','fipe.html','fontes-oficiais.html','parceria.html','privacidade.html','cookies.html','termos.html']){
    const html=fs.readFileSync(file,'utf8');
    assert.match(html,/favicon\.png\?v=20261003/,file);
  }
});
