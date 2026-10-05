import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const STORAGE_KEY_BASE='sistema-thiago-v4';
const AUTH_SESSION_KEY='sistema-thiago-auth-session';

function currentSessionIdentity(){
  try{
    const parsed=JSON.parse(localStorage.getItem(AUTH_SESSION_KEY)||'null');
    if(parsed?.authenticated && parsed?.uid) return String(parsed.uid);
  }catch{}
  return 'guest';
}
function storageKey(){ return `${STORAGE_KEY_BASE}:${currentSessionIdentity()}`; }
const SOURCES=Array.isArray(window.SISTEMA_THIAGO_OFFICIAL_SOURCES)?window.SISTEMA_THIAGO_OFFICIAL_SOURCES:[];
const RESULTS=Array.isArray(window.SISTEMA_THIAGO_OFFICIAL_RESULTS)?window.SISTEMA_THIAGO_OFFICIAL_RESULTS:[];
const SUPABASE_CFG=window.SUPABASE_CONFIG || {};
const supabase=(SUPABASE_CFG.url && SUPABASE_CFG.publishableKey) ? createClient(SUPABASE_CFG.url,SUPABASE_CFG.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}) : null;

let sourceFilter='all';
let searchQuery='';

const $=sel=>document.querySelector(sel);

function esc(v){
  return String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
}

function formatDate(value){
  if(!value) return 'Data não informada';
  const [y,m,d]=value.split('-');
  return y&&m&&d?`${d}/${m}/${y}`:value;
}

function loadState(){
  try{
    const raw=JSON.parse(localStorage.getItem(storageKey())||'null');
    if(raw&&typeof raw==='object') return raw;
  }catch{}
  const identity=currentSessionIdentity();
  return {
    version:4,
    currentUserId:identity==='guest'?'':identity,
    users:[],
    currentAuctionId:'',
    auctions:[]
  };
}

function saveState(state){
  localStorage.setItem(storageKey(),JSON.stringify(state));
}

function normalizeImportedLot(lot,index,item){
  const n=Number(lot?.n ?? lot?.lot ?? lot?.numero ?? index+1);
  const known=new Set(['n','lot','numero','vehicle','item','description','descricao','type','tipo','plate','placa','brandModel','marcaModelo','marca/modelo','chassis','chassi','engine','motor','year','ano','color','cor','fuel','combustivel','fipeValue','valorFipe','minimumBid','lanceMinimo','valorMinimo','note','observacao','sourceType','needsReview','extraFields']);
  const preserved={...(lot?.extraFields||{})};
  Object.entries(lot||{}).forEach(([key,value])=>{ if(!known.has(key)) preserved[key]=value; });
  if(lot?.remocao) preserved.remocao=lot.remocao;
  if(lot?.context) preserved.contexto_oficial=lot.context;
  if(lot?.needsReview) preserved.needsReview=true;
  return {
    n,
    vehicle:lot?.vehicle || lot?.item || lot?.description || lot?.descricao || lot?.brandModel || lot?.marcaModelo || '',
    type:lot?.type || lot?.tipo || '',
    plate:String(lot?.plate || lot?.placa || '').toUpperCase(),
    brandModel:lot?.brandModel || lot?.marcaModelo || lot?.['marca/modelo'] || '',
    chassis:lot?.chassis || lot?.chassi || '',
    engine:lot?.engine || lot?.motor || '',
    year:lot?.year || lot?.ano || '',
    color:lot?.color || lot?.cor || '',
    fuel:lot?.fuel || lot?.combustivel || '',
    fipeValue:lot?.fipeValue || lot?.valorFipe || '',
    minimumBid:lot?.minimumBid || lot?.lanceMinimo || lot?.valorMinimo || '',
    maxBid:'',
    finalValue:'',
    preferenceLevel:0,
    sold:false,
    result:'',
    note:lot?.note || lot?.observacao || '',
    sourceType:'official',
    sourceLabel:'Fonte oficial',
    officialUrl:item.officialUrl || '',
    photoDataUrl:'',
    needsReview:Boolean(lot?.needsReview),
    extraFields:preserved
  };
}

function fullText(obj){
  const values=[];
  const walk=v=>{
    if(v==null) return;
    if(Array.isArray(v)) return v.forEach(walk);
    if(typeof v==='object') return Object.entries(v).forEach(([k,val])=>{values.push(k);walk(val)});
    values.push(String(v));
  };
  walk(obj);
  return values.join(' ').toLowerCase();
}

function isGreaterFlorianopolis(item){
  const text=fullText(item);
  return ['florianópolis','florianopolis','são josé','sao jose','palhoça','palhoca','biguacu','biguaçu','governador celso ramos','antônio carlos','antonio carlos','santo amaro da imperatriz'].some(x=>text.includes(x));
}

function matchesScope(item){
  if(sourceFilter==='all') return true;
  if(sourceFilter==='SC') return /santa catarina|\/sc|sc\b/i.test(fullText(item));
  if(sourceFilter==='Brasil') return /brasil/i.test(fullText(item)) || item.scope==='Brasil';
  if(sourceFilter==='Grande Florianópolis') return isGreaterFlorianopolis(item);
  return true;
}

function matchesSearch(item){
  return !searchQuery || fullText(item).includes(searchQuery);
}

function hasOfficialLotConnector(item){
  return Boolean(item?.pncp || item?.sourceId==='prf-sc');
}

async function enrichOfficialLots(item,button){
  if(!hasOfficialLotConnector(item)) return {item,connectorAttempted:false,connectorError:'',connectorData:null};

  if(!supabase || !SUPABASE_CFG.url || !SUPABASE_CFG.publishableKey){
    return {
      item,
      connectorAttempted:true,
      connectorError:'Configuração do conector PNCP/Supabase não encontrada nesta publicação.',
      connectorData:null
    };
  }

  const {data:{session}}=await supabase.auth.getSession();
  if(!session?.access_token){
    return {
      item,
      connectorAttempted:true,
      connectorError:'Entre na sua conta e confirme o e-mail antes de buscar lotes automaticamente.',
      connectorData:null
    };
  }

  const previousLabel=button?.textContent || '';
  if(button){
    button.disabled=true;
    button.textContent='Buscando lotes no edital oficial…';
  }

  try{
    const response=await fetch(SUPABASE_CFG.url+'/functions/v1/pncp-lots',{
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        'Authorization':'Bearer '+session.access_token,
        'apikey':SUPABASE_CFG.publishableKey
      },
      body:JSON.stringify(item?.pncp
        ? {...item.pncp,fallbackUrl:item.detranDownloadPage||''}
        : {sourceId:item.sourceId,fallbackUrl:item.officialUrl||''})
    });

    let data=null;
    try{ data=await response.json(); }catch{}

    if(!response.ok){
      const message=data?.error || ('Conector respondeu HTTP '+response.status);
      throw new Error(message);
    }

    const lots=Array.isArray(data?.lots)?data.lots:[];
    const enriched={
      ...item,
      lots:lots.length ? lots : (Array.isArray(item.lots)?item.lots:[]),
      extraFields:{
        ...(item.extraFields||{}),
        pncp_control:item?.pncp?.control || data?.pncpControl || '',
        pncp_items:Array.isArray(data?.items)?data.items:[],
        pncp_files:Array.isArray(data?.files)?data.files:[],
        pncp_document_used:data?.documentUsed || null,
        pncp_diagnostics:Array.isArray(data?.diagnostics)?data.diagnostics:[],
        pncp_lots_extracted:lots.length,
        pncp_imported_at:data?.importedAt || new Date().toISOString(),
        official_connector_source:data?.source || (item?.pncp?'PNCP':item?.sourceId||''),
        official_connector_document:data?.documentUsed || null,
        official_connector_diagnostics:Array.isArray(data?.diagnostics)?data.diagnostics:[],
        official_connector_lots_extracted:lots.length,
        official_connector_imported_at:data?.importedAt || new Date().toISOString()
      }
    };

    return {item:enriched,connectorAttempted:true,connectorError:'',connectorData:data};
  }catch(error){
    return {
      item:{
        ...item,
        extraFields:{
          ...(item.extraFields||{}),
          pncp_control:item?.pncp?.control || '',
          pncp_import_error:String(error?.message || error),
          pncp_import_attempted_at:new Date().toISOString()
        }
      },
      connectorAttempted:true,
      connectorError:String(error?.message || error),
      connectorData:null
    };
  }finally{
    if(button){
      button.disabled=false;
      button.textContent=previousLabel;
    }
  }
}

async function importAuction(item,button){
  const state=loadState();
  state.auctions=Array.isArray(state.auctions)?state.auctions:[];
  const knownKeys=new Set(['id','title','date','time','reference','scope','location','sourceId','sourceName','agency','officialUrl','foundAt','lastChecked','object','extraFields','lots']);
  const extraFields={...(item.extraFields||{})};
  Object.entries(item).forEach(([key,value])=>{
    if(!knownKeys.has(key)) extraFields[key]=value;
  });

  const evidence={
    officialResultId:item.id,
    sourceId:item.sourceId||'',
    sourceName:item.sourceName||'',
    agency:item.agency||'',
    foundAt:item.foundAt||'',
    officialUrl:item.officialUrl||'',
    queriedAt:new Date().toISOString(),
    lastVerified:item.lastChecked||''
  };
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
    duplicate.sourceEvidence=evidence;
    duplicate.extraFields={...(duplicate.extraFields||{}),...extraFields};
    if(importedLots.length){
      const previousByNumber=new Map((duplicate.lots||[]).map(lot=>[Number(lot.n),lot]));
      duplicate.lots=importedLots.map(lot=>({...lot,...(previousByNumber.get(Number(lot.n))||{}),sourceType:'official',sourceLabel:'Fonte oficial',officialUrl:item.officialUrl||''}));
    } else if(!Array.isArray(duplicate.lots)) {
      duplicate.lots=[];
    }
  } else {
    auctionId='oficial-'+item.id+'-'+Date.now().toString(36);
    state.auctions.push({
      id:auctionId,
      title:item.title||item.reference||'Leilão oficial',
      date:item.date||'',
      time:item.time||'',
      reference:item.reference||item.process||'Fonte oficial',
      location:item.location||item.scope||'',
      sourceType:'official',
      sourceLabel:'Fonte oficial',
      officialUrl:item.officialUrl||'',
      photoDataUrl:'',
      notes:item.object||'',
      participants:state.currentUserId?[state.currentUserId]:[],
      createdBy:state.currentUserId||'',
      createdAt:new Date().toISOString(),
      officialPayload:JSON.parse(JSON.stringify(item)),
      sourceEvidence:evidence,
      extraFields,
      lots:importedLots
    });
  }

  state.currentAuctionId=auctionId;
  saveState(state);
  const params=new URLSearchParams({
    imported:item.id,
    fields:String(Object.keys(item||{}).length),
    lots:String(importedLots.length)
  });
  if(item.__pncpAttempted) params.set('pncp','1');
  if(item.__pncpError) params.set('pncp_error',item.__pncpError);
  if(item.__pncpDocument) params.set('pncp_document',item.__pncpDocument);
  location.href='app.html?'+params.toString();
}

function resultCard(item){
  const extras=Object.entries(item.extraFields||{});
  const statusText=item.status || '';
  const statusClass=/suspens/i.test(statusText)?'status-badge sold':'status-badge waiting';
  const importLabel=hasOfficialLotConnector(item)
    ? 'Importar cadastro + buscar lotes'
    : (Array.isArray(item.lots) && item.lots.length ? 'Importar cadastro oficial' : 'Importar cadastro oficial • dados gerais');
  return `<article class="official-auction-card">
    <div class="source-row">
      <span class="source-badge official-source">Fonte oficial</span>
      <span class="${statusClass}">${esc(statusText || formatDate(item.date))}</span>
    </div>
    <h3>${esc(item.title||item.reference||'Leilão oficial')}</h3>
    <p>${esc(item.object||'')}</p>
    ${item.statusNote?`<div class="research-mode-notice"><strong>Situação:</strong> ${esc(item.statusNote)}</div>`:''}
    <dl class="official-data-grid">
      <div><dt>Órgão</dt><dd>${esc(item.agency||'—')}</dd></div>
      <div><dt>Referência</dt><dd>${esc(item.reference||'—')}</dd></div>
      <div><dt>Modalidade</dt><dd>${esc(item.modality||'—')}</dd></div>
      <div><dt>Data/hora</dt><dd>${esc(formatDate(item.date))}${item.time?' • '+esc(item.time):''}</dd></div>
      <div><dt>Abrangência</dt><dd>${esc(item.scope||'—')}</dd></div>
      <div><dt>Última verificação</dt><dd>${esc(formatDate(item.lastChecked))}</dd></div>
    </dl>
    ${extras.length?`<details class="official-extra"><summary>Outros campos encontrados (${extras.length})</summary><div>${extras.map(([k,v])=>`<p><strong>${esc(k)}:</strong> ${esc(Array.isArray(v)?v.join(', '):typeof v==='object'?JSON.stringify(v):v)}</p>`).join('')}</div></details>`:''}
    <div class="found-source">
      <strong>Encontrado em:</strong> ${esc(item.foundAt||item.sourceName||item.agency||'Fonte oficial')}
    </div>
    <div class="official-card-actions">
      <a class="secondary-link compact" href="${esc(item.officialUrl||'#')}" target="_blank" rel="noopener">Abrir origem oficial</a>
      <button class="primary-btn import-official-btn" data-id="${esc(item.id)}" type="button">${importLabel}</button>
    </div>
  </article>`;
}

function sourceCard(source){
  return `<article class="source-registry-card">
    <div class="source-row">
      <span class="source-badge official-source">Fonte oficial cadastrada</span>
      <span class="source-state">${esc(source.status||'')}</span>
    </div>
    <h3>${esc(source.name)}</h3>
    <p><strong>Órgão:</strong> ${esc(source.agency)}</p>
    <p><strong>Abrangência:</strong> ${esc(source.scope)}</p>
    <p><strong>Conteúdo:</strong> ${esc(source.kind)}</p>
    <p><strong>Método:</strong> ${esc(source.method)}</p>
    <p><strong>Última verificação:</strong> ${esc(formatDate(source.lastVerified))}</p>
    <div class="found-source"><strong>Local cadastrado:</strong> ${esc(source.url)}</div>
    <div class="official-card-actions">
      <a class="secondary-link compact" href="${esc(source.searchUrl||source.url)}" target="_blank" rel="noopener">Pesquisar nesta fonte</a>
    </div>
  </article>`;
}

function render(){
  const resultList=$('#officialAuctionList');
  const sourceList=$('#officialSourceList');
  const filteredResults=RESULTS.filter(x=>matchesScope(x)&&matchesSearch(x));
  const filteredSources=SOURCES.filter(x=>matchesScope(x)&&matchesSearch(x));

  $('#officialCount').textContent=filteredResults.length;
  $('#sourceCount').textContent=filteredSources.length;
  $('#officialEmpty').hidden=filteredResults.length!==0;

  resultList.innerHTML=filteredResults.map(resultCard).join('');
  sourceList.innerHTML=filteredSources.map(sourceCard).join('');

  resultList.querySelectorAll('.import-official-btn').forEach(btn=>btn.addEventListener('click',async()=>{
    const base=RESULTS.find(x=>x.id===btn.dataset.id);
    if(!base) return;

    const enriched=await enrichOfficialLots(base,btn);
    const item={
      ...enriched.item,
      __pncpAttempted:enriched.pncpAttempted,
      __connectorError:enriched.pncpError || '',
      __pncpDocument:enriched.pncpData?.documentUsed?.name || ''
    };
    await importAuction(item,btn);
  }));
}

$('#officialSearchInput').addEventListener('input',e=>{
  searchQuery=e.target.value.trim().toLowerCase();
  render();
});

document.querySelectorAll('[data-source-filter]').forEach(btn=>btn.addEventListener('click',()=>{
  document.querySelectorAll('[data-source-filter]').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  sourceFilter=btn.dataset.sourceFilter;
  render();
}));

const params=new URLSearchParams(location.search);
if(params.get('mode')==='import') $('#importModeNotice').hidden=false;

render();
