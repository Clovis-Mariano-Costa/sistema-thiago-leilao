import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const cfg=window.SUPABASE_CONFIG || {};
const statusBox=document.querySelector('#cloudSyncStatus');
const legacyKeys=['sistema-thiago-v3','sistema-thiago-leilao-v2'];

function setStatus(html,kind='info'){
  if(!statusBox) return;
  statusBox.className='sync-status '+kind;
  statusBox.innerHTML=html;
  statusBox.hidden=false;
}
function hideStatus(){ if(statusBox) statusBox.hidden=true; }
function parseJson(value){ try{return JSON.parse(value)}catch{return null} }
function auctionCount(state){ return Array.isArray(state?.auctions)?state.auctions.length:0 }
function lotCount(state){ return (state?.auctions||[]).reduce((n,a)=>n+(Array.isArray(a?.lots)?a.lots.length:0),0) }
function statesEqual(a,b){ try{return JSON.stringify(a)===JSON.stringify(b)}catch{return false} }

function legacyCandidate(){
  for(const key of legacyKeys){
    const parsed=parseJson(localStorage.getItem(key)||'');
    if(parsed && Array.isArray(parsed.auctions) && parsed.auctions.length) return {key,state:parsed};
  }
  return null;
}

async function start(){
  if(!cfg.url || !cfg.publishableKey || !window.SISTEMA_THIAGO_APP) return;
  const supabase=createClient(cfg.url,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  const {data:{session}}=await supabase.auth.getSession();
  if(!session?.user?.id){
    setStatus('<strong>Dados deste navegador.</strong> Entre na sua conta para ativar backup e sincronização online entre dispositivos e domínios.','warn');
    return;
  }
  if(!session.user.email_confirmed_at){
    setStatus('<strong>Sincronização aguardando confirmação.</strong> Confirme seu e-mail para gravar o backup online.','warn');
    return;
  }

  const uid=session.user.id;
  const app=window.SISTEMA_THIAGO_APP;
  let local=app.getState();
  const legacy=legacyCandidate();

  const {data:cloud,error}=await supabase.from('user_state_snapshots').select('state,state_version,updated_at,source_origin').eq('user_id',uid).maybeSingle();
  if(error){
    setStatus('<strong>Backup online indisponível.</strong> Seus dados locais continuam preservados neste navegador.','error');
    return;
  }

  async function upload(state,reason='Sincronizado'){
    const payload={
      user_id:uid,
      state_version:Number(state?.version)||4,
      state,
      source_origin:location.origin,
      last_client_change:new Date().toISOString()
    };
    const {error:upErr}=await supabase.from('user_state_snapshots').upsert(payload,{onConflict:'user_id'});
    if(upErr){ setStatus('<strong>Não foi possível gravar o backup online.</strong> Os dados locais foram mantidos.','error'); return false; }
    localStorage.setItem('sistema-thiago-sync-last:'+uid,new Date().toISOString());
    setStatus('<strong>'+reason+'.</strong> '+auctionCount(state)+' leilão(ões) e '+lotCount(state)+' lote(s) protegidos na sua conta.','ok');
    return true;
  }

  function offerConflict(cloudState,localState){
    setStatus(
      '<strong>Encontramos dados em dois lugares.</strong> Para evitar perda, escolha qual cópia deve prevalecer.<div class="sync-actions">'+
      '<button type="button" data-sync-local>Manter dados deste navegador</button>'+
      '<button type="button" data-sync-cloud>Usar backup online</button></div>',
      'warn'
    );
    statusBox.querySelector('[data-sync-local]')?.addEventListener('click',()=>upload(localState,'Dados deste navegador enviados ao backup online'));
    statusBox.querySelector('[data-sync-cloud]')?.addEventListener('click',()=>{
      app.replaceState(cloudState,{save:true});
      setStatus('<strong>Backup online restaurado neste navegador.</strong> Confira os leilões antes de continuar.','ok');
    });
  }

  function offerLegacyRecovery(candidate){
    setStatus(
      '<strong>Dados antigos encontrados neste aparelho.</strong> Há '+auctionCount(candidate.state)+' leilão(ões) em '+candidate.key+'. '+
      'Não limpe os dados do navegador antes de conferir a recuperação. '+
      '<button type="button" data-recover-legacy>Recuperar e proteger online</button>',
      'warn'
    );
    statusBox.querySelector('[data-recover-legacy]')?.addEventListener('click',async()=>{
      app.replaceState(candidate.state,{save:true});
      const recovered=app.getState();
      const ok=await upload(recovered,'Dados antigos recuperados');
      if(ok) setStatus('<strong>Recuperação concluída.</strong> '+auctionCount(recovered)+' leilão(ões) e '+lotCount(recovered)+' lote(s) foram vinculados à sua conta. Confira antes de apagar qualquer dado antigo.','ok');
    });
  }

  const cloudState=(cloud?.state && Array.isArray(cloud.state.auctions)) ? cloud.state : null;

  // Um snapshot online vazio não deve esconder os dados legados deste aparelho.
  // Isso é especialmente importante na recuperação do leilão antigo do celular.
  if(legacy && !auctionCount(local) && !auctionCount(cloudState)){
    offerLegacyRecovery(legacy);
  }else if(cloudState){
    const cloudState=cloud.state;
    if(!auctionCount(local) && auctionCount(cloudState)){
      app.replaceState(cloudState,{save:true});
      local=app.getState();
      setStatus('<strong>Dados recuperados do backup online.</strong> '+auctionCount(local)+' leilão(ões) disponíveis neste navegador.','ok');
    }else if(auctionCount(local) && !statesEqual(local,cloudState)){
      offerConflict(cloudState,local);
    }else{
      setStatus('<strong>Sincronização online ativa.</strong> Seus dados estão vinculados à sua conta.','ok');
    }
  }else if(auctionCount(local)){
    await upload(local,'Primeiro backup online criado');
  }else if(legacy){
    offerLegacyRecovery(legacy);
  }else{
    await upload(local,'Conta iniciada com backup online vazio');
  }

  let timer=null;
  window.addEventListener('sistema-thiago:state-saved',()=>{
    clearTimeout(timer);
    timer=setTimeout(()=>upload(app.getState(),'Alterações salvas online'),900);
  });

  supabase.auth.onAuthStateChange((_event,nextSession)=>{
    if(!nextSession?.user) setStatus('<strong>Sessão encerrada.</strong> O backup online não receberá novas alterações até o próximo login.','warn');
  });
}

if(window.SISTEMA_THIAGO_APP) start();
else window.addEventListener('sistema-thiago:app-ready',start,{once:true});
