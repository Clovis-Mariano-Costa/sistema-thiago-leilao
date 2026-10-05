(()=>{
const status=document.querySelector('#legacyRecoveryStatus');
const list=document.querySelector('#legacyRecoveryList');
const FIPE_KEY='sistema-thiago-fipe-user-v1';
const explicitLegacy=['sistema-thiago-v3','sistema-thiago-leilao-v2'];

function parse(value){try{return JSON.parse(value)}catch{return null}}
function counts(state){
  const auctions=Array.isArray(state?.auctions)?state.auctions:[];
  return {auctions:auctions.length,lots:auctions.reduce((n,a)=>n+(Array.isArray(a?.lots)?a.lots.length:0),0)};
}
function auctionPreview(state){
  const auctions=Array.isArray(state?.auctions)?state.auctions:[];
  return auctions.slice(0,8).map((auction,index)=>{
    const lots=Array.isArray(auction?.lots)?auction.lots:[];
    const lotSample=lots.slice(0,6).map(lot=>String(lot?.n??lot?.lotNumber??'')).filter(Boolean);
    return {
      title:String(auction?.title||auction?.reference||('Leilão '+(index+1))),
      lots:lots.length,
      lotSample
    };
  });
}
function labelFor(key){
  if(key==='sistema-thiago-v3') return 'Cópia antiga v3';
  if(key==='sistema-thiago-leilao-v2') return 'Cópia antiga v2';
  if(key.startsWith('sistema-thiago-v4:')) return 'Cópia v4 deste endereço';
  return 'Cópia local';
}
function candidates(){
  const keys=[...explicitLegacy];
  for(let i=0;i<localStorage.length;i++){
    const key=localStorage.key(i)||'';
    if(key.startsWith('sistema-thiago-v4:')&&!keys.includes(key)) keys.push(key);
  }
  return keys.map(key=>({key,state:parse(localStorage.getItem(key)||'')}))
    .filter(x=>x.state&&Array.isArray(x.state.auctions)&&x.state.auctions.length)
    .map(x=>({...x,...counts(x.state),preview:auctionPreview(x.state)}));
}
function fipeRefs(){
  const parsed=parse(localStorage.getItem(FIPE_KEY)||'[]');
  return Array.isArray(parsed)?parsed:[];
}
function download(candidate){
  const payload={
    format:'sistema-thiago-backup',
    backupVersion:1,
    generatedAt:new Date().toISOString(),
    origin:location.origin,
    recoverySourceKey:candidate.key,
    state:candidate.state,
    fipeUserRefs:fipeRefs()
  };
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;
  a.download='sistema-thiago-recuperacao-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
function render(){
  const found=candidates();
  list.innerHTML='';
  if(!found.length){
    status.className='auth-status auth-status-box';
    status.innerHTML='<strong>Nenhuma cópia antiga com leilões foi encontrada neste endereço.</strong> Não significa que os dados foram perdidos: eles podem estar em outra origem/endereço do mesmo navegador.';
    return;
  }
  status.className='auth-status auth-status-box success';
  status.innerHTML='<strong>'+found.length+' cópia(s) com leilões encontrada(s).</strong> Compare as quantidades e exporte a que corresponde ao leilão que você quer recuperar.';
  for(const item of found){
    const card=document.createElement('article');
    card.className='research-card legacy-recovery-card';
    const h=document.createElement('h3');
    h.textContent=labelFor(item.key);
    const p=document.createElement('p');
    p.textContent=item.auctions+' leilão(ões) • '+item.lots+' lote(s)';

    const preview=document.createElement('div');
    preview.className='legacy-preview';
    for(const auction of item.preview||[]){
      const row=document.createElement('div');
      row.className='legacy-preview-row';
      const strong=document.createElement('strong');
      strong.textContent=auction.title;
      const meta=document.createElement('span');
      meta.textContent=auction.lots+' lote(s)' + (auction.lotSample.length ? ' • amostra: '+auction.lotSample.join(', ') : '');
      row.append(strong,meta);
      preview.appendChild(row);
    }

    const sourceKey=document.createElement('p');
    sourceKey.className='form-help';
    sourceKey.textContent='Identificador local: '+item.key;

    const origin=document.createElement('p');
    origin.className='form-help';
    origin.textContent='Encontrada localmente em '+location.origin+'. Nenhum dado será apagado.';
    const btn=document.createElement('button');
    btn.type='button';
    btn.className='primary-btn';
    btn.textContent='Exportar backup';
    btn.addEventListener('click',()=>download(item));
    card.append(h,p,preview,sourceKey,origin,btn);
    list.appendChild(card);
  }
}
render();
})();