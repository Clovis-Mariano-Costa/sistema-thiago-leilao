const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

test('painel oferece acesso discreto à Charlie Echo',()=>{
  const html=fs.readFileSync('app.html','utf8');
  assert.match(html,/href="charlie-echo\.html">✦ Charlie Echo<\/a>/);
  assert.match(html,/aprendizagem é permanente/i);
  assert.match(html,/competência demonstrada não encerra estudo/i);
});

test('página Charlie Echo preserva vínculos, limites e aprendizagem permanente',()=>{
  const html=fs.readFileSync('charlie-echo.html','utf8');
  assert.match(html,/Assistente especializada em leilões/i);
  assert.match(html,/Aprendizagem permanente/i);
  assert.match(html,/Jus 9 Tecnologia Jurídica/);
  assert.match(html,/Voluntariado/);
  assert.match(html,/Nações Por Herança/);
  assert.match(html,/Decisões de lance continuam humanas/i);
  assert.match(html,/data-system-chat-launcher/);
  assert.match(html,/charlie-chat\.js/);
});

test('Charlie Echo envia contexto mínimo e nunca trata aprendizagem como encerrada',()=>{
  const chat=fs.readFileSync('charlie-chat.js','utf8');
  const page=fs.readFileSync('charlie-page.js','utf8');
  const html=fs.readFileSync('charlie-echo.html','utf8');
  const contextFn=page.match(/function contextSummary\(\)\{([\s\S]*?)\n\}/)?.[1] || '';
  assert.match(chat,/SISTEMA_THIAGO_CHARLIE_CONTEXT/);
  assert.match(chat,/aprendizagem permanente/i);
  assert.match(html,/contexto automático permanece mínimo/i);
  assert.match(contextFn,/aprendizagem contínua/i);
  assert.doesNotMatch(contextFn,/plate|placa|chassis|chassi/i);
});

test('build do Pages inclui o espaço Charlie Echo',()=>{
  const build=fs.readFileSync('scripts/build-pages.cjs','utf8');
  assert.match(build,/charlie-echo\.html/);
  assert.match(build,/charlie-page\.js/);
});
