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

function normalizeMoney(value){
  const raw=String(value??'').trim();
  if(!raw) return null;
  const compact=raw.replace(/[^0-9,.-]/g,'');
  const normalized=compact.includes(',')
    ? compact.replace(/\./g,'').replace(',','.')
    : compact;
  const number=Number(normalized);
  return Number.isFinite(number)?number:null;
}

function operationalPayload(lot){
  return {
    preference_level:Number.isFinite(Number(lot?.preferenceLevel)) ? Math.max(0,Math.min(2,Number(lot.preferenceLevel))) : 0,
    fipe_value:normalizeMoney(lot?.fipeValue),
    minimum_bid:normalizeMoney(lot?.minimumBid),
    max_bid:normalizeMoney(lot?.maxBid),
    final_value:normalizeMoney(lot?.finalValue),
    sold:Boolean(lot?.sold),
    result:String(lot?.result||'').trim()||null,
    note:String(lot?.note||'').trim()||null,
    updated_at:new Date().toISOString()
  };
}

const HUMAN_FIELD_DB_MAP={
  type:'item_type',
  plate:'plate',
  brandModel:'brand_model',
  chassis:'chassis',
  engine:'engine',
  year:'model_year',
  color:'color',
  fuel:'fuel'
};

function humanConfirmedPayload(lot,existingRow={}){
  const fields=Array.isArray(lot?.extraFields?.humanConfirmedFields) ? lot.extraFields.humanConfirmedFields : [];
  if(!fields.length) return {};
  const payload={};
  for(const field of fields){
    const dbField=HUMAN_FIELD_DB_MAP[field];
    if(!dbField) continue;
    const raw=lot?.[field];
    payload[dbField]=raw==null || String(raw).trim()==='' ? null : String(raw).trim();
  }
  payload.extra_data={
    ...(existingRow?.extra_data||{}),
    ...(lot?.extraFields||{}),
    humanConfirmedFields:[...new Set(fields.filter(field=>HUMAN_FIELD_DB_MAP[field]))],
    humanConfirmedAt:lot?.extraFields?.humanConfirmedAt || new Date().toISOString()
  };
  return payload;
}

function canonicalPayload(lot,existingRow={}){
  return {...operationalPayload(lot),...humanConfirmedPayload(lot,existingRow)};
}

function operationalFingerprint(value){
  const payload=value?.preference_level!==undefined ? value : canonicalPayload(value);
  return JSON.stringify([
    Number(payload.preference_level||0),
    payload.fipe_value==null?null:Number(payload.fipe_value),
    payload.minimum_bid==null?null:Number(payload.minimum_bid),
    payload.max_bid==null?null:Number(payload.max_bid),
    payload.final_value==null?null:Number(payload.final_value),
    Boolean(payload.sold),
    payload.result||null,
    payload.note||null,
    payload.item_type??null,
    payload.plate??null,
    payload.brand_model??null,
    payload.chassis??null,
    payload.engine??null,
    payload.model_year??null,
    payload.color??null,
    payload.fuel??null,
    payload.extra_data?.humanConfirmedFields||[]
  ]);
}

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
  const relationalAuctionCache=new Map();
  const relationalLotCache=new Map();
  const operationalFingerprints=new Map();

  async function resolveRelationalAuction(localAuction){
    if(!localAuction) return null;
    if(relationalAuctionCache.has(localAuction.id)) return relationalAuctionCache.get(localAuction.id);

    const hinted=String(localAuction?.extraFields?.relationalAuctionId||'').trim();
    if(hinted){
      const {data,error}=await supabase.from('auctions')
        .select('id,title,reference,source_evidence')
        .eq('id',hinted)
        .maybeSingle();
      if(!error && data){
        relationalAuctionCache.set(localAuction.id,data);
        return data;
      }
    }

    const resultId=String(localAuction?.sourceEvidence?.officialResultId||'').trim();
    if(resultId){
      const {data,error}=await supabase.from('auctions')
        .select('id,title,reference,source_evidence')
        .contains('source_evidence',{officialResultId:resultId})
        .limit(1);
      if(!error && data?.length){
        relationalAuctionCache.set(localAuction.id,data[0]);
        return data[0];
      }
    }

    let query=supabase.from('auctions')
      .select('id,title,reference,source_evidence')
      .eq('title',localAuction.title||'')
      .limit(1);
    if(localAuction.reference) query=query.eq('reference',localAuction.reference);
    const {data,error}=await query;
    if(error || !data?.length) return null;
    relationalAuctionCache.set(localAuction.id,data[0]);
    return data[0];
  }

  async function loadRelationalLots(auctionId){
    if(relationalLotCache.has(auctionId)) return relationalLotCache.get(auctionId);
    const byNumber=new Map();
    const pageSize=500;
    let from=0;

    while(true){
      const {data,error}=await supabase.from('lots')
        .select('id,lot_number,preference_level,fipe_value,minimum_bid,max_bid,final_value,sold,result,note,item_type,plate,brand_model,chassis,engine,model_year,color,fuel,extra_data')
        .eq('auction_id',auctionId)
        .order('lot_number',{ascending:true})
        .range(from,from+pageSize-1);
      if(error) throw error;
      for(const row of data||[]){
        byNumber.set(Number(row.lot_number),row);
        operationalFingerprints.set(row.id,operationalFingerprint(row));
      }
      if(!data || data.length<pageSize) break;
      from+=pageSize;
    }

    relationalLotCache.set(auctionId,byNumber);
    return byNumber;
  }

  async function syncOperationalChanges(state){
    const localAuction=(state?.auctions||[]).find(a=>a.id===state.currentAuctionId) || null;
    if(!localAuction) return {ok:true,changed:0};

    const relationalAuction=await resolveRelationalAuction(localAuction);
    if(!relationalAuction?.id) return {ok:true,changed:0};

    let byNumber;
    try{ byNumber=await loadRelationalLots(relationalAuction.id); }
    catch(error){ return {ok:false,changed:0,error:error?.message||String(error)}; }

    let changed=0;
    for(const lot of localAuction.lots||[]){
      const row=byNumber.get(Number(lot.n));
      if(!row?.id) continue;

      const payload=canonicalPayload(lot,row);
      const nextFingerprint=operationalFingerprint(payload);
      const previousFingerprint=operationalFingerprints.get(row.id);
      if(nextFingerprint===previousFingerprint) continue;

      const {data,error}=await supabase
        .from('lots')
        .update(payload)
        .eq('id',row.id)
        .select('id')
        .maybeSingle();
      if(error) return {ok:false,changed,error:error.message||String(error)};
      if(!data?.id){
        return {ok:false,changed,error:'A política de acesso não confirmou edição deste lote.'};
      }
      operationalFingerprints.set(row.id,nextFingerprint);
      changed++;
    }

    return {ok:true,changed};
  }

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
    timer=setTimeout(async()=>{
      const current=app.getState();
      const snapshotOk=await upload(current,'Alterações salvas online');
      if(!snapshotOk) return;
      const relational=await syncOperationalChanges(current);
      if(!relational.ok){
        setStatus(
          '<strong>Backup online salvo, mas o banco canônico não confirmou a última alteração operacional.</strong> '+
          'Os dados continuam protegidos no snapshot. '+String(relational.error||''),
          'warn'
        );
      }else if(relational.changed>0){
        setStatus(
          '<strong>Alterações salvas online.</strong> '+auctionCount(current)+' leilão(ões), '+
          lotCount(current)+' lote(s) no snapshot e '+relational.changed+' lote(s) operacional(is) reconciliado(s) no banco canônico.',
          'ok'
        );
      }
    },900);
  });

  supabase.auth.onAuthStateChange((_event,nextSession)=>{
    if(!nextSession?.user) setStatus('<strong>Sessão encerrada.</strong> O backup online não receberá novas alterações até o próximo login.','warn');
  });
}

if(window.SISTEMA_THIAGO_APP) start();
else window.addEventListener('sistema-thiago:app-ready',start,{once:true});
