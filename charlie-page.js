import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const cfg=window.SUPABASE_CONFIG || {};
const statusEl=document.querySelector('#charlieContextStatus');
const contextEl=document.querySelector('#charlieAuctionContext');
const fields={
  title:document.querySelector('#charlieAuctionTitle'),
  date:document.querySelector('#charlieAuctionDate'),
  reference:document.querySelector('#charlieAuctionReference'),
  lots:document.querySelector('#charlieAuctionLots'),
  next:document.querySelector('#charlieNextLot'),
  source:document.querySelector('#charlieAuctionSource')
};

let state=null;

function safeJson(value){try{return JSON.parse(value)}catch{return null}}
function sessionIdentity(){
  const cached=safeJson(localStorage.getItem('sistema-thiago-auth-session')||'null');
  return cached?.authenticated&&cached?.uid?String(cached.uid):'';
}
function localStateFor(uid){
  if(!uid) return null;
  return safeJson(localStorage.getItem('sistema-thiago-v4:'+uid)||'null');
}
function activeAuction(){
  const auctions=Array.isArray(state?.auctions)?state.auctions:[];
  return auctions.find(a=>a.id===state?.currentAuctionId)||auctions[0]||null;
}
function sourceLabel(auction){
  return auction?.sourceType==='official'?'Fonte oficial':'Dados inseridos pelo usuário';
}
function contextSummary(){
  const auction=activeAuction();
  if(!auction) return 'Nenhum leilão está aberto neste momento.';
  const lots=Array.isArray(auction.lots)?auction.lots:[];
  const pending=lots.find(l=>!l.sold);
  return [
    'Leilão atual: '+String(auction.title||'Sem título').slice(0,160),
    auction.date?'Data: '+auction.date:'',
    auction.reference?'Referência: '+String(auction.reference).slice(0,180):'',
    'Origem: '+sourceLabel(auction),
    'Lotes cadastrados: '+lots.length,
    pending?'Próximo lote pendente: '+String(pending.n||'')+' — '+String(pending.vehicle||'item').slice(0,120):'Sem lote pendente',
    'Regra permanente: Charlie Echo permanece em aprendizagem contínua; competência demonstrada não encerra estudo ou revisão.'
  ].filter(Boolean).join('\n');
}

window.SISTEMA_THIAGO_CHARLIE_CONTEXT=contextSummary;
window.SISTEMA_THIAGO_CHARLIE_ROOM={
  title:'Sistema Thiago — Charlie Echo especializada em leilões',
  summary:'Assistência especializada em leilões, em aprendizagem permanente. Separar fontes, fatos, inferências e dúvidas. Não decidir lance, compra ou arrematação pelo usuário.'
};

function render(){
  const auction=activeAuction();
  if(!auction){
    statusEl.className='sync-status warn';
    statusEl.innerHTML='<strong>Nenhum leilão aberto.</strong> Volte ao painel, escolha ou cadastre um leilão e depois retorne à Charlie Echo.';
    contextEl.hidden=true;
    return;
  }
  const lots=Array.isArray(auction.lots)?auction.lots:[];
  const pending=lots.find(l=>!l.sold);
  fields.title.textContent=auction.title||'Sem título';
  fields.date.textContent=auction.date||'Não informada';
  fields.reference.textContent=auction.reference||'Não informada';
  fields.lots.textContent=String(lots.length);
  fields.next.textContent=pending?String(pending.n||'—')+' — '+String(pending.vehicle||'item'):'Sem lote pendente';
  fields.source.textContent=sourceLabel(auction);
  contextEl.hidden=false;
  statusEl.className='sync-status ok';
  statusEl.innerHTML='<strong>Contexto pronto.</strong> A conversa recebe somente um resumo operacional do leilão atualmente aberto.';
}

function openChatWith(text=''){
  const launcher=document.querySelector('[data-system-chat-launcher]');
  const input=document.querySelector('[data-system-chat-input]');
  launcher?.click();
  if(text&&input){
    input.value=text;
    input.focus();
  }
}
document.querySelector('[data-open-charlie]')?.addEventListener('click',()=>openChatWith());
document.querySelectorAll('[data-charlie-prompt]').forEach(btn=>{
  btn.addEventListener('click',()=>openChatWith(btn.dataset.charliePrompt||''));
});

async function start(){
  if(!cfg.url||!cfg.publishableKey){
    statusEl.className='sync-status error';
    statusEl.textContent='Configuração de autenticação indisponível.';
    return;
  }
  const supabase=createClient(cfg.url,cfg.publishableKey,{
    auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
  });
  const {data:{session}}=await supabase.auth.getSession();
  if(!session?.user?.id){
    location.replace('auth.html#login');
    return;
  }

  const uid=session.user.id;
  state=localStateFor(uid);
  if(!state||!Array.isArray(state.auctions)){
    const {data:cloud}=await supabase.from('user_state_snapshots')
      .select('state')
      .eq('user_id',uid)
      .maybeSingle();
    if(cloud?.state&&Array.isArray(cloud.state.auctions)) state=cloud.state;
  }
  render();
}

start();
