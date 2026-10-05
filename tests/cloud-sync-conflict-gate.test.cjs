const fs=require('node:fs');
const test=require('node:test');
const assert=require('node:assert/strict');

const sync=fs.readFileSync('cloud-sync.js','utf8');

test('ST-MNM-36D conflito local-cloud bloqueia autosync até decisão humana',()=>{
  assert.match(sync,/let unresolvedStateConflict=false/);
  assert.match(sync,/function offerConflict\(cloudState,localState\)\{\s*unresolvedStateConflict=true/);
  assert.match(sync,/if\(unresolvedStateConflict\)\{/);
  assert.match(sync,/não substituirão o backup online até você escolher/);
});

test('ST-MNM-36D cada escolha libera o bloqueio de forma explícita',()=>{
  assert.match(sync,/Dados deste navegador enviados ao backup online'[\s\S]*if\(ok\) unresolvedStateConflict=false/);
  assert.match(sync,/data-sync-cloud[\s\S]*unresolvedStateConflict=false;[\s\S]*app\.replaceState\(cloudState/);
});

test('ST-MNM-36D não remove o gate de conflito existente',()=>{
  assert.match(sync,/Encontramos dados em dois lugares/);
  assert.match(sync,/Manter dados deste navegador/);
  assert.match(sync,/Usar backup online/);
  assert.match(sync,/else if\(auctionCount\(local\) && !statesEqual\(local,cloudState\)\)\{\s*offerConflict/);
});
