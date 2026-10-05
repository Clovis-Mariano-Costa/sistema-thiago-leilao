const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

test('ponte de recuperação é local, explícita e não apaga dados',()=>{
  const html=fs.readFileSync('recuperar-legado.html','utf8');
  const js=fs.readFileSync('legacy-recovery.js','utf8');
  assert.match(html,/Não apague nada antes de conferir/);
  assert.match(html,/mesmo celular e navegador/i);
  assert.match(js,/sistema-thiago-v3/);
  assert.match(js,/sistema-thiago-leilao-v2/);
  assert.match(js,/sistema-thiago-v4:/);
  assert.match(js,/Exportar backup/);
  assert.doesNotMatch(js,/fetch\s*\(/);
  assert.doesNotMatch(js,/localStorage\.removeItem/);
  assert.doesNotMatch(js,/localStorage\.clear/);
});

test('backup de recuperação é compatível com Restaurar backup',()=>{
  const js=fs.readFileSync('legacy-recovery.js','utf8');
  assert.match(js,/format:'sistema-thiago-backup'/);
  assert.match(js,/backupVersion:1/);
  assert.match(js,/state:candidate\.state/);
  assert.match(js,/fipeUserRefs:fipeRefs\(\)/);
});

test('build Pages inclui a ponte de recuperação',()=>{
  const build=fs.readFileSync('scripts/build-pages.cjs','utf8');
  assert.match(build,/recuperar-legado\.html/);
  assert.match(build,/legacy-recovery\.js/);
});


test('ST-MNM-34A prévia legada permite reconhecer cópia sem mutação',()=>{
  const fs=require('node:fs');
  const html=fs.readFileSync('recuperar-legado.html','utf8');
  const js=fs.readFileSync('legacy-recovery.js','utf8');
  assert.match(js,/function auctionPreview/);
  assert.match(js,/lotSample/);
  assert.match(js,/Identificador local:/);
  assert.match(js,/amostra:/);
  assert.match(html,/Esta prévia é somente leitura/);
  assert.doesNotMatch(js,/localStorage\.removeItem/);
  assert.doesNotMatch(js,/localStorage\.clear/);
  assert.doesNotMatch(js,/fetch\s*\(/);
});


test('ST-MNM-34A informa itens omitidos e separa título da metadata',()=>{
  const js=fs.readFileSync('legacy-recovery.js','utf8');
  assert.match(js,/omitted:Math\.max\(0,auctions\.length-visible\.length\)/);
  assert.match(js,/leilão\(ões\) adicional\(is\) não exibido\(s\) nesta prévia/);
  assert.match(js,/A lista acima mostra apenas os 8 primeiros/);
  assert.match(js,/meta\.textContent=' — '/);
});
