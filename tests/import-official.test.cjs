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
  assert.match(edge,/parsedRatio<0\.98/);
  assert.match(edge,/needsReview:true/);
  assert.match(edge,/gov\.br/);
});
