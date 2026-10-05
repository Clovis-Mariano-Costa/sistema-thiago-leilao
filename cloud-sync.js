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

function canonicalItemPayload(item,row){
  const payload={
    item_identifier:String(item?.itemIdentifier||row?.item_identifier||'').trim()||null,
    description:String(item?.description||item?.vehicle||row?.description||'').trim()||null,
    item_type:String(item?.type||row?.item_type||'').trim()||null,
    vehicle:String(item?.vehicle||item?.description||row?.vehicle||'').trim()||null,
    plate:String(item?.plate||'').trim().toUpperCase()||null,
    brand_model:String(item?.brandModel||'').trim()||null,
    chassis:String(item?.chassis||'').trim()||null,
    engine:String(item?.engine||'').trim()||null,
    model_year:String(item?.year||'').trim()||null,
    color:String(item?.color||'').trim()||null,
    fuel:String(item?.fuel||'').trim()||null,
    licensing:String(item?.licensing||'').trim()||null,
    city:String(item?.city||'').trim()||null,
    state:String(item?.state||'').trim()||null,
    fipe_value:normalizeMoney(item?.fipeValue),
    minimum_bid:normalizeMoney(item?.minimumBid),
    max_bid:normalizeMoney(item?.maxBid),
    final_value:normalizeMoney(item?.finalValue),
    preference_level:Math.max(0,Math.min(2,Number(item?.preferenceLevel)||0)),
    sold:Boolean(item?.sold),
    result:String(item?.result||'').trim()||null,
    note:String(item?.note||'').trim()||null,
    extra_data:{
      ...(row?.extra_data||{}),
      ...(item?.extraFields||{})
    },
    updated_at:new Date().toISOString()
  };
  return payload;
}

function itemOperationalFingerprint(payload){
  return JSON.stringify([
    payload.item_identifier??null,
    payload.description??null,
    payload.item_type??null,
    payload.vehicle??null,
    payload.plate??null,
    payload.brand_model??null,
    payload.chassis??null,
    payload.engine??null,
    payload.model_year??null,
    payload.color??null,
    payload.fuel??null,
    payload.licensing??null,
    payload.city??null,
    payload.state??null,
    payload.fipe_value==null?null:Number(payload.fipe_value),
    payload.minimum_bid==null?null:Number(payload.minimum_bid),
    payload.max_bid==null?null:Number(payload.max_bid),
    payload.final_value==null?null:Number(payload.final_value),
    Number(payload.preference_level||0),
    Boolean(payload.sold),
    payload.result||null,
    payload.note||null,
    payload.extra_data?.humanConfirmedFields||[],
    Boolean(payload.extra_data?.generatedIdentifier)
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
  const relationalItemCache=new Map();
  const operationalFingerprints=new Map();
  const itemOperationalFingerprints=new Map();
  let unresolvedStateConflict=false;

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

  async function loadRelationalItems(auctionId,byNumber){
    if(relationalItemCache.has(auctionId)) return relationalItemCache.get(auctionId);
    const byKey=new Map();
    const lotIds=[...byNumber.values()].map(row=>row.id).filter(Boolean);
    const chunkSize=250;
    for(let i=0;i<lotIds.length;i+=chunkSize){
      const ids=lotIds.slice(i,i+chunkSize);
      const {data,error}=await supabase.from('lot_items')
        .select('id,lot_id,item_order,item_identifier,source_media_label,description,item_type,vehicle,plate,brand_model,chassis,engine,model_year,color,fuel,licensing,city,state,fipe_value,minimum_bid,max_bid,final_value,preference_level,sold,result,note,extra_data')
        .in('lot_id',ids)
        .order('item_order',{ascending:true});
      if(error) throw error;
      for(const row of data||[]){
        const key=row.lot_id+':'+Number(row.item_order||1);
        byKey.set(key,row);
        itemOperationalFingerprints.set(row.id,itemOperationalFingerprint(row));
      }
    }
    relationalItemCache.set(auctionId,byKey);
    return byKey;
  }

  function hasImportedItemStructure(auction){
    if(!auction) return false;
    if(auction?.extraFields?.importBatch || auction?.extraFields?.import_batch) return true;
    return (auction?.lots||[]).some(lot=>
      lot?.extraFields?.importBatch ||
      lot?.extraFields?.import_batch ||
      (lot?.items||[]).some(item=>item?.extraFields?.importBatch || item?.extraFields?.import_batch)
    );
  }

  function stableLocalIdentifier(item){
    const id=String(item?.itemIdentifier||'').trim();
    if(!id) return '';
    if(item?.extraFields?.generatedIdentifier || /^ST-L\d+-I\d+$/i.test(id)) return '';
    return id;
  }

  function relationalItemToLocal(row,existing={}){
    const existed=existing && Object.keys(existing).length>0;
    const remoteExtra=row?.extra_data && typeof row.extra_data==='object' ? row.extra_data : {};
    const localExtra=existing?.extraFields && typeof existing.extraFields==='object' ? existing.extraFields : {};
    const pickText=(local,remote)=>{
      const localText=String(local??'').trim();
      return localText ? local : (remote??'');
    };
    const operational=(localKey,remoteValue,fallback='')=>{
      if(existed && Object.prototype.hasOwnProperty.call(existing,localKey)) return existing[localKey];
      return remoteValue==null ? fallback : remoteValue;
    };
    const serial=String(
      localExtra.itemSerial ||
      localExtra.item_serial ||
      remoteExtra.itemSerial ||
      remoteExtra.item_serial ||
      existing?.chassis ||
      row?.chassis ||
      ''
    ).trim();
    const remoteCandidates=Array.isArray(remoteExtra.fipe_candidates) ? remoteExtra.fipe_candidates : [];
    const localCandidates=Array.isArray(existing?.fipeCandidates) ? existing.fipeCandidates : [];

    return {
      ...existing,
      itemOrder:Math.max(1,Number(row?.item_order)||Number(existing?.itemOrder)||1),
      itemIdentifier:pickText(existing?.itemIdentifier,row?.item_identifier),
      description:pickText(existing?.description,row?.description||row?.vehicle),
      vehicle:pickText(existing?.vehicle,row?.vehicle||row?.description),
      type:pickText(existing?.type,row?.item_type),
      plate:String(pickText(existing?.plate,row?.plate)||'').toUpperCase(),
      brandModel:pickText(existing?.brandModel,row?.brand_model),
      chassis:pickText(existing?.chassis,row?.chassis),
      engine:pickText(existing?.engine,row?.engine),
      year:pickText(existing?.year,row?.model_year),
      color:pickText(existing?.color,row?.color),
      fuel:pickText(existing?.fuel,row?.fuel),
      licensing:pickText(existing?.licensing,row?.licensing),
      city:pickText(existing?.city,row?.city),
      state:pickText(existing?.state,row?.state),
      fipeValue:String(operational('fipeValue',row?.fipe_value,'')??''),
      minimumBid:String(operational('minimumBid',row?.minimum_bid,'')??''),
      maxBid:String(operational('maxBid',row?.max_bid,'')??''),
      finalValue:String(operational('finalValue',row?.final_value,'')??''),
      preferenceLevel:Number(operational('preferenceLevel',row?.preference_level,0))||0,
      sold:Boolean(operational('sold',row?.sold,false)),
      result:String(operational('result',row?.result,'')??''),
      note:String(operational('note',row?.note,'')??''),
      fipeCandidates:localCandidates.length ? localCandidates : remoteCandidates,
      sourceMediaLabel:pickText(existing?.sourceMediaLabel,row?.source_media_label),
      sourceType:existing?.sourceType || 'user',
      extraFields:{
        ...remoteExtra,
        ...localExtra,
        ...(serial ? {itemSerial:serial} : {})
      }
    };
  }

  async function reconcileImportedItemStructure(state){
    let changed=false;
    let recoveredItems=0;

    for(const auction of state?.auctions||[]){
      if(!hasImportedItemStructure(auction)) continue;

      const relationalAuction=await resolveRelationalAuction(auction);
      if(!relationalAuction?.id) continue;

      let byNumber;
      let itemsByKey;
      try{
        byNumber=await loadRelationalLots(relationalAuction.id);
        itemsByKey=await loadRelationalItems(relationalAuction.id,byNumber);
      }catch(error){
        return {ok:false,state,changed,recoveredItems,error:error?.message||String(error)};
      }

      const itemsByLotId=new Map();
      for(const row of itemsByKey.values()){
        if(!itemsByLotId.has(row.lot_id)) itemsByLotId.set(row.lot_id,[]);
        itemsByLotId.get(row.lot_id).push(row);
      }

      for(const lot of auction.lots||[]){
        const relationalLot=byNumber.get(Number(lot.n));
        if(!relationalLot?.id) continue;
        const rows=(itemsByLotId.get(relationalLot.id)||[])
          .slice()
          .sort((a,b)=>Number(a.item_order||1)-Number(b.item_order||1));
        if(!rows.length) continue;

        const localItems=Array.isArray(lot.items)?lot.items:[];
        const used=new Set();
        const merged=[];

        for(const row of rows){
          let match=-1;
          const remoteId=String(row.item_identifier||'').trim();
          const remoteMedia=String(row.source_media_label||'').trim();

          if(remoteId){
            match=localItems.findIndex((item,index)=>
              !used.has(index) && stableLocalIdentifier(item)===remoteId
            );
          }
          if(match<0 && remoteMedia){
            match=localItems.findIndex((item,index)=>
              !used.has(index) && String(item?.sourceMediaLabel||'').trim()===remoteMedia
            );
          }
          if(match<0){
            match=localItems.findIndex((item,index)=>{
              if(used.has(index)) return false;
              if(stableLocalIdentifier(item) || String(item?.sourceMediaLabel||'').trim()) return false;
              return Math.max(1,Number(item?.itemOrder)||index+1)===Math.max(1,Number(row.item_order)||1);
            });
          }

          const existing=match>=0 ? localItems[match] : {};
          if(match>=0) used.add(match);
          else recoveredItems++;
          merged.push(relationalItemToLocal(row,existing));
        }

        localItems.forEach((item,index)=>{
          if(!used.has(index)) merged.push(item);
        });
        merged.sort((a,b)=>Number(a?.itemOrder||1)-Number(b?.itemOrder||1));

        if(JSON.stringify(localItems)!==JSON.stringify(merged)){
          lot.items=merged;
          changed=true;
        }
      }
    }

    return {ok:true,state,changed,recoveredItems};
  }

  async function syncOperationalChanges(state,change={}){
    const targetAuctionId=String(change?.auctionId || state?.currentAuctionId || '');
    const localAuction=(state?.auctions||[]).find(a=>String(a.id)===targetAuctionId) || null;
    if(!localAuction) return {ok:true,changed:0,itemChanged:0};

    const relationalAuction=await resolveRelationalAuction(localAuction);
    if(!relationalAuction?.id) return {ok:true,changed:0,itemChanged:0};

    const requestedNumbers=[...new Set(
      (Array.isArray(change?.lotNumbers)?change.lotNumbers:[])
        .map(Number)
        .filter(Number.isFinite)
    )];

    let byNumber;
    let itemsByKey;
    let targetLots=localAuction.lots||[];

    try{
      if(requestedNumbers.length){
        targetLots=targetLots.filter(lot=>requestedNumbers.includes(Number(lot.n)));
        byNumber=new Map();
        itemsByKey=new Map();

        const {data:lotRows,error:lotError}=await supabase.from('lots')
          .select('id,lot_number,preference_level,fipe_value,minimum_bid,max_bid,final_value,sold,result,note,item_type,plate,brand_model,chassis,engine,model_year,color,fuel,extra_data')
          .eq('auction_id',relationalAuction.id)
          .in('lot_number',requestedNumbers);
        if(lotError) throw lotError;

        for(const row of lotRows||[]){
          byNumber.set(Number(row.lot_number),row);
          operationalFingerprints.set(row.id,operationalFingerprint(row));
        }

        const lotIds=(lotRows||[]).map(row=>row.id).filter(Boolean);
        if(lotIds.length){
          const {data:itemRows,error:itemError}=await supabase.from('lot_items')
            .select('id,lot_id,item_order,item_identifier,source_media_label,description,item_type,vehicle,plate,brand_model,chassis,engine,model_year,color,fuel,licensing,city,state,fipe_value,minimum_bid,max_bid,final_value,preference_level,sold,result,note,extra_data')
            .in('lot_id',lotIds)
            .order('item_order',{ascending:true});
          if(itemError) throw itemError;
          for(const row of itemRows||[]){
            const key=row.lot_id+':'+Number(row.item_order||1);
            itemsByKey.set(key,row);
            itemOperationalFingerprints.set(row.id,itemOperationalFingerprint(row));
          }
        }
      }else{
        byNumber=await loadRelationalLots(relationalAuction.id);
        itemsByKey=await loadRelationalItems(relationalAuction.id,byNumber);
      }
    }catch(error){
      return {ok:false,changed:0,itemChanged:0,error:error?.message||String(error)};
    }

    let changed=0;
    let itemChanged=0;
    for(const lot of targetLots){
      const row=byNumber.get(Number(lot.n));
      if(!row?.id) continue;

      const localItems=Array.isArray(lot.items)?lot.items:[];
      for(let index=0;index<localItems.length;index++){
        const item=localItems[index];
        const order=Math.max(1,Number(item?.itemOrder)||index+1);
        const itemRow=itemsByKey.get(row.id+':'+order);
        if(!itemRow?.id) continue;
        const itemPayload=canonicalItemPayload(item,itemRow);
        const itemFingerprint=itemOperationalFingerprint(itemPayload);
        const previousItemFingerprint=itemOperationalFingerprints.get(itemRow.id);
        if(itemFingerprint===previousItemFingerprint) continue;

        const {data,error}=await supabase
          .from('lot_items')
          .update(itemPayload)
          .eq('id',itemRow.id)
          .select('id')
          .maybeSingle();
        if(error) return {ok:false,changed,itemChanged,error:error.message||String(error)};
        if(!data?.id) return {ok:false,changed,itemChanged,error:'A política de acesso não confirmou edição deste item.'};
        itemOperationalFingerprints.set(itemRow.id,itemFingerprint);
        itemChanged++;
      }

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
      if(error) return {ok:false,changed,itemChanged,error:error.message||String(error)};
      if(!data?.id) return {ok:false,changed,itemChanged,error:'A política de acesso não confirmou edição deste lote.'};
      operationalFingerprints.set(row.id,nextFingerprint);
      changed++;
    }

    return {ok:true,changed,itemChanged};
  }

  async function syncOperationalChangesBatch(state,fullAuctionIds,dirtyLotsByAuction){
    let changed=0;
    let itemChanged=0;
    const fullSet=new Set(fullAuctionIds||[]);

    for(const auctionId of fullSet){
      const result=await syncOperationalChanges(state,{auctionId});
      if(!result.ok) return {ok:false,changed,itemChanged,error:result.error};
      changed+=result.changed||0;
      itemChanged+=result.itemChanged||0;
    }

    for(const [auctionId,lotNumbers] of dirtyLotsByAuction||[]){
      if(fullSet.has(auctionId)) continue;
      const result=await syncOperationalChanges(state,{auctionId,lotNumbers});
      if(!result.ok) return {ok:false,changed,itemChanged,error:result.error};
      changed+=result.changed||0;
      itemChanged+=result.itemChanged||0;
    }

    return {ok:true,changed,itemChanged};
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
    unresolvedStateConflict=true;
    setStatus(
      '<strong>Encontramos dados em dois lugares.</strong> Para evitar perda, escolha qual cópia deve prevalecer.<div class="sync-actions">'+
      '<button type="button" data-sync-local>Manter dados deste navegador</button>'+
      '<button type="button" data-sync-cloud>Usar backup online</button></div>',
      'warn'
    );
    statusBox.querySelector('[data-sync-local]')?.addEventListener('click',async()=>{
      const currentLocal=app.getState();
      const ok=await upload(currentLocal,'Dados deste navegador enviados ao backup online');
      if(ok) unresolvedStateConflict=false;
    });
    statusBox.querySelector('[data-sync-cloud]')?.addEventListener('click',()=>{
      unresolvedStateConflict=false;
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

  if(!unresolvedStateConflict){
    const reconciliation=await reconcileImportedItemStructure(app.getState());
    if(!reconciliation.ok){
      setStatus(
        '<strong>Sincronização ativa, mas a reconciliação estrutural de itens ficou pendente.</strong> '+
        String(reconciliation.error||''),
        'warn'
      );
    }else if(reconciliation.changed){
      app.replaceState(reconciliation.state,{save:true});
      local=app.getState();
      await upload(
        local,
        'Estrutura de itens reconciliada'+
        (reconciliation.recoveredItems ? ' — '+reconciliation.recoveredItems+' item(ns) recuperado(s)' : '')
      );
    }
  }

  let timer=null;
  let pendingState=null;
  const pendingLotsByAuction=new Map();
  const pendingFullAuctions=new Set();

  window.addEventListener('sistema-thiago:state-saved',event=>{
    const detail=event?.detail||{};
    pendingState=detail.state || pendingState;

    const auctionId=String(detail.auctionId||'');
    if(!detail.skipRelational && auctionId){
      if(detail.lotNumber!=null){
        if(!pendingLotsByAuction.has(auctionId)) pendingLotsByAuction.set(auctionId,new Set());
        pendingLotsByAuction.get(auctionId).add(Number(detail.lotNumber));
      }else{
        pendingFullAuctions.add(auctionId);
      }
    }

    clearTimeout(timer);
    timer=setTimeout(async()=>{
      if(unresolvedStateConflict){
        setStatus(
          '<strong>Conflito ainda não resolvido.</strong> As alterações deste navegador permanecem locais e não substituirão o backup online até você escolher qual cópia deve prevalecer.',
          'warn'
        );
        return;
      }

      const current=pendingState || app.getState();
      pendingState=null;
      const fullAuctionIds=[...pendingFullAuctions];
      pendingFullAuctions.clear();
      const dirtyLots=[...pendingLotsByAuction.entries()].map(([auctionId,numbers])=>[auctionId,[...numbers]]);
      pendingLotsByAuction.clear();

      const snapshotOk=await upload(current,'Alterações salvas online');
      if(!snapshotOk) return;

      const relational=await syncOperationalChangesBatch(current,fullAuctionIds,dirtyLots);
      if(!relational.ok){
        setStatus(
          '<strong>Backup online salvo, mas o banco canônico não confirmou a última alteração operacional.</strong> '+
          'Os dados continuam protegidos no snapshot. '+String(relational.error||''),
          'warn'
        );
      }else if(relational.changed>0 || relational.itemChanged>0){
        setStatus(
          '<strong>Alterações salvas online.</strong> '+auctionCount(current)+' leilão(ões), '+
          lotCount(current)+' lote(s) no snapshot; '+relational.changed+' lote(s) e '+
          relational.itemChanged+' item(ns) operacional(is) reconciliado(s) no banco canônico.',
          'ok'
        );
      }
    },2200);
  });

  supabase.auth.onAuthStateChange((_event,nextSession)=>{
    if(!nextSession?.user) setStatus('<strong>Sessão encerrada.</strong> O backup online não receberá novas alterações até o próximo login.','warn');
  });
}

function scheduleCloudStart(){
  const launch=()=>start();
  if('requestIdleCallback' in window){
    window.requestIdleCallback(launch,{timeout:1200});
  }else{
    setTimeout(launch,180);
  }
}

if(window.SISTEMA_THIAGO_APP) scheduleCloudStart();
else window.addEventListener('sistema-thiago:app-ready',scheduleCloudStart,{once:true});
