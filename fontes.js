const STORAGE_KEY='sistema-thiago-v3';

const OFFICIAL_AUCTIONS=[
  {
    id:'detran-0013-2026',
    title:'DETRAN/SC — Processo 0013/2026',
    date:'2026-10-13',
    time:'09:00',
    reference:'Edital Descritivo do Leilão Público nº 13/DETRAN/2026',
    description:'Leilão Eletrônico — veículos conservados e sucatas.',
    officialUrl:'https://sistemas.sc.gov.br/sea/portaldecompras/'
  },
  {
    id:'detran-1500-2026',
    title:'DETRAN/SC — Processo 1500/2026',
    date:'2026-10-19',
    time:'12:32',
    reference:'Processo 1500/2026 — Portal de Compras SC',
    description:'Alienação de veículos conservados e sucatas em pátios de custódia de municípios catarinenses.',
    officialUrl:'https://sistemas.sc.gov.br/sea/portaldecompras/'
  },
  {
    id:'detran-1600-2026',
    title:'DETRAN/SC — Processo 1600/2026',
    date:'2026-10-26',
    time:'14:18',
    reference:'Processo 1600/2026 — Portal de Compras SC',
    description:'Alienação de veículos conservados e sucatas em pátios de custódia de municípios catarinenses.',
    officialUrl:'https://sistemas.sc.gov.br/sea/portaldecompras/'
  }
];

function esc(v){
  return String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
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

function importAuction(item){
  const state=loadState();
  state.auctions=Array.isArray(state.auctions)?state.auctions:[];
  const existing=state.auctions.find(a=>a.reference===item.reference&&a.date===item.date);
  if(existing){
    state.currentAuctionId=existing.id;
    saveState(state);
    location.href='index.html';
    return;
  }

  const id='oficial-'+item.id+'-'+Date.now().toString(36);
  state.auctions.push({
    id,
    title:item.title,
    date:item.date,
    time:item.time,
    reference:item.reference,
    location:'',
    sourceType:'official',
    sourceLabel:'Fonte oficial',
    officialUrl:item.officialUrl,
    photoDataUrl:'',
    notes:item.description,
    participants:[state.currentUserId||'thiago'],
    createdBy:state.currentUserId||'thiago',
    createdAt:new Date().toISOString(),
    lots:[]
  });
  state.currentAuctionId=id;
  saveState(state);
  location.href='index.html';
}

function render(){
  const wrap=document.querySelector('#officialAuctionList');
  document.querySelector('#officialCount').textContent=OFFICIAL_AUCTIONS.length;
  wrap.innerHTML=OFFICIAL_AUCTIONS.map(item=>`
    <article class="official-auction-card">
      <div class="source-row"><span class="source-badge official-source">Fonte oficial</span><span class="status-badge waiting">${esc(item.date.split('-').reverse().join('/'))}</span></div>
      <h3>${esc(item.title)}</h3>
      <p>${esc(item.description)}</p>
      <p><strong>Data/hora:</strong> ${esc(item.date.split('-').reverse().join('/'))} • ${esc(item.time)}</p>
      <p><strong>Referência:</strong> ${esc(item.reference)}</p>
      <div class="official-card-actions">
        <a class="secondary-link compact" href="${esc(item.officialUrl)}" target="_blank" rel="noopener">Abrir fonte</a>
        <button class="primary-btn import-official-btn" data-id="${esc(item.id)}" type="button">Adicionar ao Sistema Thiago</button>
      </div>
    </article>`).join('');

  wrap.querySelectorAll('.import-official-btn').forEach(btn=>btn.addEventListener('click',()=>{
    const item=OFFICIAL_AUCTIONS.find(x=>x.id===btn.dataset.id);
    if(item) importAuction(item);
  }));
}

render();
