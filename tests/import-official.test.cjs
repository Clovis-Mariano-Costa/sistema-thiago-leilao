const test = require('node:test');
const assert = require('node:assert/strict');

function normalizeImportedLot(lot,index,item){
  const n=Number(lot?.n ?? lot?.lot ?? lot?.numero ?? index+1);
  return {
    n,
    vehicle:lot?.vehicle || lot?.item || lot?.description || lot?.descricao || lot?.brandModel || lot?.marcaModelo || '',
    sourceType:'official',
    sourceLabel:'Fonte oficial',
    officialUrl:item.officialUrl || ''
  };
}

function upsertOfficialAuction(state,item){
  state.auctions=Array.isArray(state.auctions)?state.auctions:[];
  const importedLots=Array.isArray(item.lots)
    ? item.lots.map((lot,index)=>normalizeImportedLot(lot,index,item)).filter(lot=>lot.n>0)
    : [];
  const duplicate=state.auctions.find(a=>a.sourceEvidence?.officialResultId===item.id || (a.reference===item.reference&&a.date===item.date&&a.sourceType==='official'));
  let auctionId;
  if(duplicate){
    auctionId=duplicate.id;
    duplicate.title=item.title||duplicate.title||item.reference||'Leilão oficial';
    duplicate.date=item.date||duplicate.date||'';
    duplicate.time=item.time||duplicate.time||'';
    duplicate.reference=item.reference||item.process||duplicate.reference||'Fonte oficial';
    duplicate.location=item.location||item.scope||duplicate.location||'';
    duplicate.sourceType='official';
    duplicate.sourceLabel='Fonte oficial';
    duplicate.officialUrl=item.officialUrl||duplicate.officialUrl||'';
    duplicate.notes=item.object||duplicate.notes||'';
    duplicate.officialPayload=JSON.parse(JSON.stringify(item));
    duplicate.sourceEvidence={officialResultId:item.id};
    duplicate.extraFields={...(duplicate.extraFields||{}),...(item.extraFields||{})};
    if(importedLots.length){
      const previousByNumber=new Map((duplicate.lots||[]).map(lot=>[Number(lot.n),lot]));
      duplicate.lots=importedLots.map(lot=>({...lot,...(previousByNumber.get(Number(lot.n))||{}),sourceType:'official',sourceLabel:'Fonte oficial',officialUrl:item.officialUrl||''}));
    } else if(!Array.isArray(duplicate.lots)) duplicate.lots=[];
  } else {
    auctionId='oficial-'+item.id;
    state.auctions.push({
      id:auctionId,
      title:item.title||item.reference||'Leilão oficial',
      date:item.date||'',
      reference:item.reference||item.process||'Fonte oficial',
      sourceType:'official',
      sourceLabel:'Fonte oficial',
      officialUrl:item.officialUrl||'',
      officialPayload:JSON.parse(JSON.stringify(item)),
      sourceEvidence:{officialResultId:item.id},
      extraFields:{...(item.extraFields||{})},
      lots:importedLots
    });
  }
  state.currentAuctionId=auctionId;
  return {auctionId,importedLots};
}

test('reimportar cadastro oficial atualiza a cópia antiga',()=>{
  const state={currentAuctionId:'x',auctions:[{
    id:'old',sourceType:'official',reference:'Edital 1',date:'2026-10-13',
    title:'Antigo',lots:[],sourceEvidence:{officialResultId:'det-1'}
  }]};
  upsertOfficialAuction(state,{
    id:'det-1',title:'Atualizado',reference:'Edital 1',date:'2026-10-13',
    officialUrl:'https://oficial.example/edital',object:'Objeto atualizado',
    extraFields:{orgao:'DETRAN'}
  });
  assert.equal(state.auctions.length,1);
  assert.equal(state.currentAuctionId,'old');
  assert.equal(state.auctions[0].title,'Atualizado');
  assert.equal(state.auctions[0].notes,'Objeto atualizado');
  assert.equal(state.auctions[0].extraFields.orgao,'DETRAN');
});

test('lotes oficiais são incorporados quando passam a existir',()=>{
  const state={auctions:[{
    id:'old',sourceType:'official',reference:'Edital 2',date:'2026-10-14',
    lots:[{n:7,vehicle:'Ranger',note:'preferida',preferenceLevel:2}],
    sourceEvidence:{officialResultId:'det-2'}
  }]};
  upsertOfficialAuction(state,{
    id:'det-2',reference:'Edital 2',date:'2026-10-14',officialUrl:'https://oficial.example/2',
    lots:[{n:7,vehicle:'Ford Ranger XLS'},{n:8,vehicle:'Hilux'}]
  });
  assert.equal(state.auctions[0].lots.length,2);
  assert.equal(state.auctions[0].lots[0].n,7);
  assert.equal(state.auctions[0].lots[0].note,'preferida');
  assert.equal(state.auctions[0].lots[0].preferenceLevel,2);
  assert.equal(state.auctions[0].lots[1].vehicle,'Hilux');
});

test('reimportação sem lots não apaga lotes já cadastrados',()=>{
  const state={auctions:[{
    id:'old',sourceType:'official',reference:'Edital 3',date:'2026-10-15',
    lots:[{n:1,vehicle:'Sprinter'}],
    sourceEvidence:{officialResultId:'det-3'}
  }]};
  upsertOfficialAuction(state,{id:'det-3',reference:'Edital 3',date:'2026-10-15'});
  assert.equal(state.auctions[0].lots.length,1);
  assert.equal(state.auctions[0].lots[0].vehicle,'Sprinter');
});


test('PRF/SC possui adaptador de lotes oficial sem depender de coordenadas PNCP',()=>{
  const fs=require('node:fs');
  const fontes=fs.readFileSync('fontes.js','utf8');
  const edge=fs.readFileSync('supabase/functions/pncp-lots/index.ts','utf8');
  assert.match(fontes,/sourceId==='prf-sc'/);
  assert.match(fontes,/enrichOfficialLots/);
  assert.match(edge,/sourceId==="prf-sc"/);
  assert.match(edge,/fetchPrfLots/);
  assert.match(edge,/Anexo I/);
  assert.match(edge,/parsed\.lots\.length!==parsed\.sourceRows/);
  assert.match(edge,/needsReview:true/);
  assert.match(edge,/gov\.br/);
});


test('importação oficial protege snapshot online antes do redirecionamento',()=>{
  const fs=require('node:fs');
  const fontes=fs.readFileSync('fontes.js','utf8');
  assert.match(fontes,/async function persistOfficialStateOnline/);
  assert.match(fontes,/from\('user_state_snapshots'\)/);
  assert.match(fontes,/onConflict:'user_id'/);
  assert.match(fontes,/const online=await persistOfficialStateOnline\(state\)/);
  assert.match(fontes,/sync:online\.ok\?'online':'local'/);
});

test('painel informa se a importação oficial ficou protegida online',()=>{
  const fs=require('node:fs');
  const app=fs.readFileSync('app.js','utf8');
  assert.match(app,/params\.get\('sync'\)/);
  assert.match(app,/Backup online:<\/strong> atualizado antes de abrir o painel/);
  assert.match(app,/não confirmado nesta importação/);
});


test('ST-MNM-22 promove cadastro oficial ao modelo relacional com RLS do usuário',()=>{
  const fs=require('node:fs');
  const fontes=fs.readFileSync('fontes.js','utf8');
  assert.match(fontes,/async function persistOfficialRelational/);
  assert.match(fontes,/\.from\('auctions'\)/);
  assert.match(fontes,/owner_id:uid/);
  assert.match(fontes,/source_type:'official'/);
  assert.match(fontes,/\.from\('lots'\)[\s\S]*onConflict:'auction_id,lot_number'/);
  assert.match(fontes,/\.from\('lot_items'\)[\s\S]*onConflict:'lot_id,item_order'/);
  assert.match(fontes,/const relational=await persistOfficialRelational\(item\)/);
});

test('ST-MNM-22 não zera campos de decisão do usuário em reimportação oficial',()=>{
  const fs=require('node:fs');
  const fontes=fs.readFileSync('fontes.js','utf8');
  const start=fontes.indexOf('const lotRows=sourceLots.map');
  const end=fontes.indexOf('const lotIdByNumber',start);
  const lotPayload=fontes.slice(start,end);
  assert.doesNotMatch(lotPayload,/preference_level:/);
  assert.doesNotMatch(lotPayload,/max_bid:/);
  assert.doesNotMatch(lotPayload,/final_value:/);
  assert.doesNotMatch(lotPayload,/sold:/);
  assert.doesNotMatch(lotPayload,/result:/);
});

test('painel distingue snapshot de banco relacional após importação oficial',()=>{
  const fs=require('node:fs');
  const app=fs.readFileSync('app.js','utf8');
  assert.match(app,/params\.get\('relational'\)/);
  assert.match(app,/Banco canônico:<\/strong>/);
  assert.match(app,/reconciliação pendente/);
});


test('ST-MNM-23A migration registra todas as fontes oficiais do catálogo',()=>{
  const fs=require('node:fs');
  const source=fs.readFileSync('official-sources.js','utf8');
  const migration=fs.readFileSync('supabase/migrations/20261005025351_seed_official_sources.sql','utf8');
  for(const id of ['detran-sc','compras-sc','pncp','prf-sc','receita-federal','florianopolis','sao-jose','palhoca','biguacu']){
    assert.match(source,new RegExp("id:'"+id+"'"));
    assert.match(migration,new RegExp("'"+id+"'"));
  }
  assert.match(migration,/on conflict \(id\) do update/i);
  assert.match(migration,/public\.official_sources/);
});


test('ST-MNM-23B envia identidade da fonte para o conector oficial',()=>{
  const fs=require('node:fs');
  const fontes=fs.readFileSync('fontes.js','utf8');
  assert.match(fontes,/sourceId:item\.sourceId\|\|'pncp'/);
  assert.match(fontes,/resultId:item\.id\|\|''/);
  assert.match(fontes,/reference:item\.reference\|\|''/);
});

test('ST-MNM-23B registra busca e documento no backend sem expor chave secreta ao frontend',()=>{
  const fs=require('node:fs');
  const edge=fs.readFileSync('supabase/functions/pncp-lots/index.ts','utf8');
  const fontes=fs.readFileSync('fontes.js','utf8');
  assert.match(edge,/function adminSupabase/);
  assert.match(edge,/SUPABASE_SECRET_KEYS/);
  assert.match(edge,/SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(edge,/from\("source_search_runs"\)/);
  assert.match(edge,/from\("source_documents"\)/);
  assert.match(edge,/SOURCE_RUN_START_WARN/);
  assert.match(edge,/SOURCE_DOCUMENT_WARN/);
  assert.doesNotMatch(fontes,/SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SECRET_KEYS/);
});

test('ST-MNM-23B observabilidade é best-effort e não substitui retorno da importação',()=>{
  const fs=require('node:fs');
  const edge=fs.readFileSync('supabase/functions/pncp-lots/index.ts','utf8');
  assert.match(edge,/if\(!admin \|\| !sourceId\) return \{admin:null,runId:""\}/);
  assert.match(edge,/console\.warn\("SOURCE_RUN_START_WARN"/);
  assert.match(edge,/return json\(req,\{\.\.\.result,sourceRunId:/);
  assert.match(edge,/sourceDocumentId:documentId\|\|null/);
});


test('ST-MNM-31A catálogo declara conectores de lotes sem rota genérica',()=>{
  const fs=require('node:fs');
  const sources=fs.readFileSync('official-sources.js','utf8');
  const fontes=fs.readFileSync('fontes.js','utf8');
  const edge=fs.readFileSync('supabase/functions/pncp-lots/index.ts','utf8');
  assert.match(sources,/lotsConnector:'prf-pdf'/);
  assert.match(sources,/lotsConnector:'pncp-detran'/);
  assert.match(sources,/lotsConnector:'pncp'/);
  assert.match(fontes,/SUPPORTED_LOT_CONNECTORS/);
  assert.match(fontes,/lotConnectorFor/);
  assert.doesNotMatch(fontes,/item\?\.sourceId==='prf-sc'/);
  assert.match(edge,/connector==="prf-pdf"/);
  assert.match(edge,/sourceId!=="prf-sc"/);
  assert.match(edge,/Conector oficial não reconhecido/);
});

test('ST-MNM-31A PRF permanece restrito à fonte oficial já cadastrada',()=>{
  const fs=require('node:fs');
  const edge=fs.readFileSync('supabase/functions/pncp-lots/index.ts','utf8');
  assert.match(edge,/PRF_HOSTS/);
  assert.match(edge,/page\.pathname\.startsWith\("\/prf\/"\)/);
  assert.match(edge,/Conector PRF permitido somente para a fonte PRF\/SC cadastrada/);
});

test('ST-MNM-31A fonte sem capacidade declarada não recebe importador automático',()=>{
  const fs=require('node:fs');
  const fontes=fs.readFileSync('fontes.js','utf8');
  assert.match(fontes,/if\(!SUPPORTED_LOT_CONNECTORS\.has\(declared\)\) return ''/);
  assert.match(fontes,/if\(\(declared==='pncp' \|\| declared==='pncp-detran'\) && !item\?\.pncp\) return ''/);
});
