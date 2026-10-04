import JSZip from 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm';
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const IMPORT_BATCH='whatsapp-2026-10-01';
const TARGET_AUCTION_TITLE='Leilão Thiago — Base inicial';
const IMPORT_LABEL='Dados inseridos pelo usuário';
const cfg=window.SUPABASE_CONFIG || {};
const app=window.SISTEMA_THIAGO_APP;
const button=document.querySelector('#importWhatsappBtn');
const input=document.querySelector('#importWhatsappInput');

function ensureStatusBox(){
  let box=document.querySelector('#whatsappImportStatus');
  if(box) return box;
  box=document.createElement('section');
  box.id='whatsappImportStatus';
  box.className='sync-status';
  box.hidden=true;
  box.setAttribute('aria-live','polite');
  const anchor=document.querySelector('#cloudSyncStatus');
  anchor?.insertAdjacentElement('afterend',box);
  return box;
}

const statusBox=ensureStatusBox();
function setStatus(message,kind='info'){
  statusBox.className='sync-status '+kind;
  statusBox.textContent=message;
  statusBox.hidden=false;
}

function formatBrl(value){
  if(value===null || value===undefined || value==='') return '';
  const n=Number(value);
  if(!Number.isFinite(n)) return String(value);
  return n.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
}

function normalizeCandidate(candidate={}){
  return {
    brand:String(candidate.brand || ''),
    model:String(candidate.description || candidate.model || ''),
    code:String(candidate.code || ''),
    year:String(candidate.model_year || candidate.year || ''),
    fuel:String(candidate.fuel || ''),
    value:formatBrl(candidate.value_brl ?? candidate.value ?? '')
  };
}

function splitLocation(value=''){
  const [city='',state='']=String(value).split('/').map(x=>x.trim());
  return {city,state};
}

function mergeLocalState(manifest){
  if(!app) throw new Error('Aplicação do Sistema Thiago não está disponível.');
  const state=app.getState();
  let auction=state.auctions.find(a=>a.id==='thiago-base-inicial') || state.auctions.find(a=>a.title===TARGET_AUCTION_TITLE);
  if(!auction){
    auction={
      id:'thiago-base-inicial', title:TARGET_AUCTION_TITLE, date:'', time:'',
      reference:'Conversas e imagens enviadas pelo usuário — outubro/2026', location:'',
      sourceType:'user', sourceLabel:IMPORT_LABEL, officialUrl:'', photoDataUrl:'',
      notes:'Base inicial criada a partir das informações fornecidas pelo usuário.',
      participants:['thiago'], createdBy:'thiago', createdAt:new Date().toISOString(), lots:[]
    };
    state.auctions.push(auction);
  }
  auction.sourceType='user';
  auction.sourceLabel=IMPORT_LABEL;
  auction.extraFields={...(auction.extraFields||{}),importBatch:IMPORT_BATCH,reviewRequired:true};

  const byNumber=new Map((auction.lots||[]).map(l=>[Number(l.n),l]));
  for(const entry of manifest.lots || []){
    const n=Number(entry.lot);
    if(!n) continue;
    const imageData=entry.image_data_ref ? manifest.image_data?.[entry.image_data_ref] : null;
    const {city,state:uf}=splitLocation(imageData?.location || '');
    const fipeCandidates=(imageData?.fipe_candidates || []).map(normalizeCandidate);
    const existing=byNumber.get(n) || {n,preferenceLevel:0,sold:false,result:'',note:'',minimumBid:'',maxBid:'',finalValue:'',items:[]};
    const existingItem=Array.isArray(existing.items) && existing.items[0] ? existing.items[0] : {};
    const item={
      ...existingItem,
      itemIdentifier:String(imageData?.plate || existingItem.itemIdentifier || '').trim(),
      description:String(imageData?.vehicle_source || entry.label || existingItem.description || '').trim(),
      vehicle:String(imageData?.vehicle_source || entry.label || existingItem.vehicle || '').trim(),
      plate:String(imageData?.plate || existingItem.plate || '').trim().toUpperCase(),
      brandModel:String(imageData?.vehicle_source || existingItem.brandModel || '').trim(),
      chassis:String(imageData?.chassis || existingItem.chassis || '').trim(),
      year:String(imageData?.vehicle_year || existingItem.year || '').trim(),
      color:String(imageData?.color || existingItem.color || '').trim(),
      city, state:uf,
      fipeCandidates,
      sourceMediaLabel:String(entry.image || existingItem.sourceMediaLabel || '').trim(),
      extraFields:{
        ...(existingItem.extraFields||{}),
        importBatch:IMPORT_BATCH,
        sourceAssociation:entry.association || '',
        reviewRequired:true,
        referenceMonth:imageData?.reference || ''
      }
    };
    existing.vehicle=existing.vehicle || item.vehicle || entry.label || '';
    existing.plate=existing.plate || item.plate || '';
    existing.brandModel=existing.brandModel || item.brandModel || '';
    existing.chassis=existing.chassis || item.chassis || '';
    existing.year=existing.year || item.year || '';
    existing.color=existing.color || item.color || '';
    existing.sourceType='user';
    existing.sourceLabel=IMPORT_LABEL;
    existing.items=[item,...((existing.items||[]).slice(1))];
    existing.extraFields={
      ...(existing.extraFields||{}),
      importBatch:IMPORT_BATCH,
      whatsappLabel:entry.label || '',
      sourceAssociation:entry.association || '',
      reviewRequired:true,
      sourceImage:entry.image || ''
    };
    byNumber.set(n,existing);
  }
  auction.lots=[...byNumber.values()].sort((a,b)=>Number(a.n)-Number(b.n));
  state.currentAuctionId=auction.id;
  app.replaceState(state,{save:true});
  return state;
}

async function readPackage(file){
  if(!file || !/\.zip$/i.test(file.name)) throw new Error('Selecione o pacote ZIP preparado para o Sistema Thiago.');
  const zip=await JSZip.loadAsync(file);
  const jsonNames=Object.keys(zip.files).filter(name=>/manifesto.*\.json$/i.test(name));
  if(!jsonNames.length) throw new Error('Manifesto JSON não encontrado dentro do ZIP.');
  const manifest=JSON.parse(await zip.file(jsonNames[0]).async('string'));
  if(manifest?.project!=='Sistema Thiago - Leilao' || !Array.isArray(manifest?.lots) || !manifest?.image_data){
    throw new Error('O manifesto não corresponde ao pacote esperado do Sistema Thiago.');
  }
  return {zip,manifest};
}

async function ensureAuction(supabase,uid){
  const {data:found,error:findError}=await supabase.from('auctions')
    .select('id,title,owner_id')
    .eq('owner_id',uid)
    .eq('title',TARGET_AUCTION_TITLE)
    .limit(1);
  if(findError) throw findError;
  if(found?.[0]) return found[0];

  const rpcPayload={
    p_title:TARGET_AUCTION_TITLE,
    p_reference:'Conversas e imagens enviadas pelo usuário — outubro/2026',
    p_source_label:IMPORT_LABEL,
    p_notes:'Base inicial criada a partir das informações fornecidas pelo usuário.',
    p_source_evidence:{import_batch:IMPORT_BATCH,origin:'WhatsApp exportado pelo usuário',review_required:true},
    p_extra_data:{import_batch:IMPORT_BATCH}
  };
  const {data:rpcId,error:rpcError}=await supabase.rpc('ensure_owned_auction',rpcPayload);
  if(!rpcError && rpcId){
    return {id:rpcId,title:TARGET_AUCTION_TITLE,owner_id:uid};
  }
  if(rpcError && !/function .*ensure_owned_auction.* does not exist|Could not find the function/i.test(String(rpcError.message||rpcError))){
    throw rpcError;
  }

  const payload={
    owner_id:uid,
    title:TARGET_AUCTION_TITLE,
    reference:'Conversas e imagens enviadas pelo usuário — outubro/2026',
    source_type:'user',
    source_label:IMPORT_LABEL,
    notes:'Base inicial criada a partir das informações fornecidas pelo usuário.',
    source_evidence:{import_batch:IMPORT_BATCH,origin:'WhatsApp exportado pelo usuário',review_required:true},
    extra_data:{import_batch:IMPORT_BATCH}
  };
  const {data,error}=await supabase.from('auctions').insert(payload).select('id,title,owner_id').single();
  if(error) throw error;
  return data;
}

async function upsertLots(supabase,auctionId,manifest,uid){
  const rows=(manifest.lots||[]).map(entry=>{
    const imageData=entry.image_data_ref ? manifest.image_data?.[entry.image_data_ref] : null;
    return {
      auction_id:auctionId,
      lot_number:Number(entry.lot),
      vehicle:imageData?.vehicle_source || entry.label || null,
      plate:imageData?.plate || null,
      brand_model:imageData?.vehicle_source || null,
      chassis:imageData?.chassis || null,
      model_year:imageData?.vehicle_year || null,
      color:imageData?.color || null,
      source_type:'user',
      source_evidence:{
        import_batch:IMPORT_BATCH,
        origin:'WhatsApp exportado pelo usuário',
        source_image:entry.image || null,
        association:entry.association || null,
        review_required:true,
        note:entry.note || null
      },
      extra_data:{whatsapp_label:entry.label || null},
      created_by:uid
    };
  }).filter(row=>row.lot_number>0);
  const {data,error}=await supabase.from('lots').upsert(rows,{onConflict:'auction_id,lot_number'}).select('id,lot_number');
  if(error) throw error;
  return new Map((data||[]).map(row=>[Number(row.lot_number),row.id]));
}

async function upsertItems(supabase,lotIds,manifest,uid){
  const rows=[];
  for(const entry of manifest.lots||[]){
    const lotId=lotIds.get(Number(entry.lot));
    if(!lotId) continue;
    const imageData=entry.image_data_ref ? manifest.image_data?.[entry.image_data_ref] : null;
    const {city,state}=splitLocation(imageData?.location || '');
    rows.push({
      lot_id:lotId,
      item_order:1,
      item_identifier:imageData?.plate || null,
      description:imageData?.vehicle_source || entry.label || null,
      vehicle:imageData?.vehicle_source || entry.label || null,
      plate:imageData?.plate || null,
      brand_model:imageData?.vehicle_source || null,
      chassis:imageData?.chassis || null,
      model_year:imageData?.vehicle_year || null,
      color:imageData?.color || null,
      city:city || null,
      state:state || null,
      source_type:'user',
      source_media_label:entry.image || null,
      source_evidence:{
        import_batch:IMPORT_BATCH,
        origin:'WhatsApp exportado pelo usuário',
        association:entry.association || null,
        review_required:true
      },
      extra_data:{
        reference_month:imageData?.reference || null,
        fipe_candidates:imageData?.fipe_candidates || [],
        whatsapp_label:entry.label || null
      },
      created_by:uid
    });
  }
  if(!rows.length) return;
  const {error}=await supabase.from('lot_items').upsert(rows,{onConflict:'lot_id,item_order'});
  if(error) throw error;
}

async function replaceFipeReferences(supabase,auctionId,manifest,uid){
  const {error:deleteError}=await supabase.from('fipe_references')
    .delete()
    .eq('owner_id',uid)
    .eq('auction_id',auctionId)
    .contains('extra_data',{import_batch:IMPORT_BATCH});
  if(deleteError) throw deleteError;
  const rows=[];
  for(const [imageName,imageData] of Object.entries(manifest.image_data||{})){
    for(const candidate of imageData.fipe_candidates||[]){
      rows.push({
        owner_id:uid,
        auction_id:auctionId,
        vehicle:imageData.vehicle_source || null,
        plate:imageData.plate || null,
        city_uf:imageData.location || null,
        chassis:imageData.chassis || null,
        vehicle_year:imageData.vehicle_year || null,
        color:imageData.color || null,
        licensing:imageData.licensing || null,
        reference_month:imageData.reference || null,
        brand:candidate.brand || null,
        model:candidate.description || null,
        fipe_code:candidate.code || null,
        fipe_year:candidate.model_year ? String(candidate.model_year) : null,
        fuel:candidate.fuel || null,
        fipe_value:candidate.value_brl ?? null,
        source_type:'user',
        user_reported_official_consultation:false,
        note:'Informação fornecida pelo usuário; não confirmada como dado oficial.',
        extra_data:{import_batch:IMPORT_BATCH,source_image:imageName,official_confirmed:false}
      });
    }
  }
  if(!rows.length) return 0;
  const {error}=await supabase.from('fipe_references').insert(rows);
  if(error) throw error;
  return rows.length;
}

async function uploadImages(supabase,auctionId,zip,manifest,lotIds){
  const uniqueImages=[...new Set((manifest.lots||[]).map(x=>x.image).filter(Boolean))];
  let uploaded=0;
  const paths=new Map();
  for(const name of uniqueImages){
    const entry=Object.keys(zip.files).find(path=>path.endsWith('/'+name) || path===name);
    if(!entry) continue;
    const blob=await zip.file(entry).async('blob');
    const path=`${auctionId}/${IMPORT_BATCH}/${name}`;
    const {error}=await supabase.storage.from('auction-media').upload(path,blob,{upsert:true,contentType:'image/jpeg'});
    if(error) throw error;
    uploaded++;
    paths.set(name,path);
  }

  for(const entry of manifest.lots||[]){
    const lotId=lotIds.get(Number(entry.lot));
    const path=entry.image ? paths.get(entry.image) : null;
    if(!lotId || !path) continue;
    const {error}=await supabase.from('lots').update({photo_path:path}).eq('id',lotId);
    if(error) throw error;
    const {error:itemError}=await supabase.from('lot_items').update({
      source_evidence:{
        import_batch:IMPORT_BATCH,
        origin:'WhatsApp exportado pelo usuário',
        association:entry.association || null,
        review_required:true,
        storage_path:path
      }
    }).eq('lot_id',lotId).eq('item_order',1);
    if(itemError) throw itemError;
  }
  return uploaded;
}

async function runImport(file){
  if(!cfg.url || !cfg.publishableKey) throw new Error('Configuração Supabase não encontrada.');
  setStatus('Lendo o pacote do WhatsApp…');
  const {zip,manifest}=await readPackage(file);

  const supabase=createClient(cfg.url,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  await supabase.auth.refreshSession();
  const {data:{user},error:userError}=await supabase.auth.getUser();
  if(userError || !user?.id) throw new Error('Entre novamente na sua conta antes de importar o pacote.');
  if(!user.email_confirmed_at) throw new Error('Confirme o e-mail da conta antes de gravar a importação online.');

  // Primeiro protege a parte recuperável no estado local e no snapshot da própria conta.
  const localState=mergeLocalState(manifest);
  const {error:snapshotError}=await supabase.from('user_state_snapshots').upsert({
    user_id:user.id,
    state_version:Number(localState?.version)||4,
    state:localState,
    source_origin:location.origin,
    last_client_change:new Date().toISOString()
  },{onConflict:'user_id'});
  if(snapshotError){
    throw new Error('A base foi preparada neste navegador, mas o backup online da própria conta falhou: '+snapshotError.message);
  }

  try{
    setStatus('Preparando o leilão e os 37 lotes no Supabase…');
    const auction=await ensureAuction(supabase,user.id);
    const lotIds=await upsertLots(supabase,auction.id,manifest,user.id);

    setStatus('Vinculando itens e candidatos FIPE…');
    await upsertItems(supabase,lotIds,manifest,user.id);
    const fipeCount=await replaceFipeReferences(supabase,auction.id,manifest,user.id);

    setStatus('Enviando as imagens ao Storage privado…');
    const imageCount=await uploadImages(supabase,auction.id,zip,manifest,lotIds);

    setStatus(`Importação concluída: ${lotIds.size} lotes, ${fipeCount} referências FIPE e ${imageCount} imagens privadas vinculadas. Revise as associações marcadas antes de tratar os dados como confirmados.`,'ok');
  }catch(error){
    const message=String(error?.message||error||'');
    if(/row-level security|violates.*policy|42501/i.test(message)){
      setStatus('Base inicial preservada neste navegador e no backup online da sua conta. A etapa relacional/mídias foi bloqueada pela política RLS do banco e ficou pendente para correção administrativa; nenhum dado foi promovido a oficial.','warn');
      return;
    }
    throw error;
  }
}

button?.addEventListener('click',()=>input?.click());
input?.addEventListener('change',async event=>{
  const file=event.target.files?.[0];
  if(!file) return;
  button.disabled=true;
  try{
    await runImport(file);
  }catch(error){
    console.error(error);
    setStatus('Importação interrompida: '+(error?.message || error)+'. Nenhum dado foi promovido a oficial.','error');
  }finally{
    button.disabled=false;
    input.value='';
  }
});
