const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

test('snapshot online vazio não oculta recuperação legada do aparelho',()=>{
  const src=fs.readFileSync('cloud-sync.js','utf8');
  assert.match(src,/if\(legacy && !auctionCount\(local\) && !auctionCount\(cloudState\)\)/);
  const legacyGate=src.indexOf('if(legacy && !auctionCount(local) && !auctionCount(cloudState))');
  const cloudGate=src.indexOf('}else if(cloudState){');
  assert.ok(legacyGate>=0 && cloudGate>legacyGate,'recuperação legada deve ser avaliada antes do snapshot vazio');
  assert.match(src,/Não limpe os dados do navegador antes de conferir a recuperação/);
  assert.match(src,/Recuperação concluída/);
});

test('recuperação continua explícita e preserva a cópia antiga',()=>{
  const src=fs.readFileSync('cloud-sync.js','utf8');
  assert.match(src,/data-recover-legacy/);
  assert.match(src,/app\.replaceState\(candidate\.state,\{save:true\}\)/);
  assert.doesNotMatch(src,/localStorage\.removeItem\(candidate\.key\)/);
});
