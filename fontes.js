const STORAGE_KEY='sistema-thiago-v3';
const SOURCES=Array.isArray(window.SISTEMA_THIAGO_OFFICIAL_SOURCES)?window.SISTEMA_THIAGO_OFFICIAL_SOURCES:[];
const RESULTS=Array.isArray(window.SISTEMA_THIAGO_OFFICIAL_RESULTS)?window.SISTEMA_THIAGO_OFFICIAL_RESULTS:[];

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
    const raw=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');
    if(raw&&typeof raw==='object') return raw;
  }catch{}
  return {
    version:3,
    currentUserId:'thiago',
    users:[{id:'thiago',name:'Thiago',email:'',authMode:'local_mvp'}],
    currentAuctionId:'',
    auctions:[]
  };
}

function saveState(state){
  localStorage.setItem(STORAGE_KEY,JSON.stringify(state));
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

function importAuction(item){
  const state=loadState();
  state.auctions=Array.isArray(state.auctions)?state.auctions:[];
  const duplicate=state.auctions.find(a=>a.sourceEvidence?.officialResultId===item.id || (a.reference===item.reference&&a.date===item.date&&a.sourceType==='official'));
  if(duplicate){
    state.currentAuctionId=duplicate.id;
    saveState(state);
    location.href='index.html';
    return;
  }

  const knownKeys=new Set(['id','title','date','time','reference','scope','location','sourceId','sourceName','agency','officialUrl','foundAt','lastChecked','object','extraFields']);
  const extraFields={...(item.extraFields||{})};
  Object.entries(item).forEach(([key,value])=>{
    if(!knownKeys.has(key)) extraFields[key]=value;
  });

  const auctionId='oficial-'+item.id+'-'+Date.now().toString(36);
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
    participants:[state.currentUserId||'thiago'],
    createdBy:state.currentUserId||'thiago',
    createdAt:new Date().toISOString(),
    officialPayload:JSON.parse(JSON.stringify(item)),
    sourceEvidence:{
      officialResultId:item.id,
      sourceId:item.sourceId||'',
      sourceName:item.sourceName||'',
      agency:item.agency||'',
      foundAt:item.foundAt||'',
      officialUrl:item.officialUrl||'',
      queriedAt:new Date().toISOString(),
      lastVerified:item.lastChecked||''
    },
    extraFields,
    lots:[]
  });

  state.currentAuctionId=auctionId;
  saveState(state);
  location.href='index.html';
}

function resultCard(item){
  const extras=Object.entries(item.extraFields||{});
  return `<article class="official-auction-card">
    <div class="source-row">
      <span class="source-badge official-source">Fonte oficial</span>
      <span class="status-badge waiting">${esc(formatDate(item.date))}</span>
    </div>
    <h3>${esc(item.title||item.reference||'Leilão oficial')}</h3>
    <p>${esc(item.object||'')}</p>
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
      <button class="primary-btn import-official-btn" data-id="${esc(item.id)}" type="button">Importar cadastro oficial</button>
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

  resultList.querySelectorAll('.import-official-btn').forEach(btn=>btn.addEventListener('click',()=>{
    const item=RESULTS.find(x=>x.id===btn.dataset.id);
    if(item) importAuction(item);
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
