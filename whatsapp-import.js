import JSZip from 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm';
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const IMPORT_BATCH='whatsapp-2026-10-01';
const TARGET_AUCTION_TITLE='Leilão Thiago — Base inicial';
const IMPORT_LABEL='Dados inseridos pelo usuário';
const cfg=window.SUPABASE_CONFIG || {};
const app=window.SISTEMA_THIAGO_APP;
const buttons=[...document.querySelectorAll('[data-import-package]')];
const input=document.querySelector('#importPackageInput');

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

function mimeTypeForName(name=''){
  const value=String(name).toLowerCase();
  if(/\.jpe?g$/.test(value)) return 'image/jpeg';
  if(/\.png$/.test(value)) return 'image/png';
  if(/\.webp$/.test(value)) return 'image/webp';
  throw new Error('Tipo de imagem não suportado no pacote: '+name);
}

async function sha256Hex(value=''){
  const bytes=new TextEncoder().encode(String(value));
  const digest=await crypto.subtle.digest('SHA-256',bytes);
  return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');
}

async function assertPackageTargetAccount(manifest,user){
  const expected=String(manifest?.expected_account_email_sha256||'').trim().toLowerCase();
  if(!expected) return;
  const current=await sha256Hex(String(user?.email||'').trim().toLowerCase());
  if(current!==expected){
    throw new Error('Este pacote foi preparado para outra conta. Saia desta conta e entre na conta de destino correta antes de importar.');
  }
}

function cleanLegacyNotes(notes=[]){
  return notes.map(x=>String(x||'').trim()).filter(Boolean).filter(note=>{
    return !/arquivo anexado/i.test(note) && !/\.(?:opus|pdf|jpe?g|png|webp)$/i.test(note);
  });
}

function normalizePackageManifest(raw={}){
  let manifest=raw;

  // Formato seguro legado produzido na primeira triagem: entries[] + lot_mentions[].
  if(Array.isArray(raw.entries) && !Array.isArray(raw.lots)){
    const occurrence=new Map();
    const lots=[];
    const image_data={};

    for(const entry of raw.entries){
      const image=String(entry?.image||'').trim();
      const notes=cleanLegacyNotes(entry?.notes||[]);
      const mentions=Array.isArray(entry?.lot_mentions)?entry.lot_mentions:[];
      if(image && !image_data[image]) image_data[image]={};

      mentions.forEach((mention,index)=>{
        const lot=Number(mention?.lot_number);
        if(!lot) return;
        const itemOrder=(occurrence.get(lot)||0)+1;
        occurrence.set(lot,itemOrder);
        const label=notes[index] || notes[notes.length-1] || '';
        lots.push({
          lot,
          item_order:itemOrder,
          image,
          label,
          association:'legacy_message_sequence_requires_review',
          note:'Associação proveniente do manifesto seguro legado; requer revisão humana.',
          image_data_ref:image || null
        });
      });
    }

    manifest={
      project:'Sistema Thiago - Leilao',
      source_schema:'legacy_safe_staging_v1',
      source:raw.source || 'WhatsApp exportado pelo usuário',
      rules:raw.rules || [],
      package_id:raw.package_id || null,
      expected_account_email_sha256:raw.expected_account_email_sha256 || null,
      lots,
      image_data
    };
  }

  if(manifest?.project!=='Sistema Thiago - Leilao' || !Array.isArray(manifest?.lots) || !manifest?.image_data){
    throw new Error('O manifesto não corresponde ao adaptador WhatsApp atual do Sistema Thiago.');
  }

  // Mesmo no formato enriquecido, duplicidades do mesmo lote viram itens distintos.
  const occurrence=new Map();
  manifest.lots=manifest.lots.map(entry=>{
    const lot=Number(entry?.lot);
    const next=(occurrence.get(lot)||0)+1;
    occurrence.set(lot,next);
    return {...entry,item_order:Number(entry?.item_order)||next};
  });

  return manifest;
}

function uniqueLotEntries(manifest){
  const byLot=new Map();
  for(const entry of manifest.lots||[]){
    const lot=Number(entry?.lot);
    if(!lot) continue;
    const current=byLot.get(lot);
    if(!current || Number(entry?.item_order||1) < Number(current?.item_order||1)) byLot.set(lot,entry);
  }
  return [...byLot.values()];
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
    const itemOrder=Math.max(1,Number(entry.item_order)||1);
    const imageData=entry.image_data_ref ? manifest.image_data?.[entry.image_data_ref] : null;
    const {city,state:uf}=splitLocation(imageData?.location || '');
    const fipeCandidates=(imageData?.fipe_candidates || []).map(normalizeCandidate);
    const existing=byNumber.get(n) || {n,preferenceLevel:0,sold:false,result:'',note:'',minimumBid:'',maxBid:'',finalValue:'',items:[]};
    const items=Array.isArray(existing.items)?existing.items:[];
    const index=items.findIndex(it=>Number(it?.itemOrder||1)===itemOrder);
    const existingItem=index>=0?items[index]:{};
    const item={
      ...existingItem,
      itemOrder,
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
    if(index>=0) items[index]=item; else items.push(item);
    items.sort((a,b)=>Number(a?.itemOrder||1)-Number(b?.itemOrder||1));

    const primary=items[0]||item;
    existing.vehicle=existing.vehicle || primary.vehicle || entry.label || '';
    existing.plate=existing.plate || primary.plate || '';
    existing.brandModel=existing.brandModel || primary.brandModel || '';
    existing.chassis=existing.chassis || primary.chassis || '';
    existing.year=existing.year || primary.year || '';
    existing.color=existing.color || primary.color || '';
    existing.sourceType='user';
    existing.sourceLabel=IMPORT_LABEL;
    existing.items=items;
    existing.extraFields={
      ...(existing.extraFields||{}),
      importBatch:IMPORT_BATCH,
      reviewRequired:true
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
  const jsonNames=Object.keys(zip.files).filter(name=>/(?:^|\/)manifest(?:o|_)?[^/]*\.json$/i.test(name));
  if(!jsonNames.length) throw new Error('Manifesto JSON não encontrado dentro do ZIP.');
  const rawManifest=JSON.parse(await zip.file(jsonNames[0]).async('string'));
  const manifest=normalizePackageManifest(rawManifest);
  return {zip,manifest};
}

async function ensureAuction(supabase,uid){
  const {data:found,error:findError}=await supabase.from('auctions')
    .select('id,title,owner_id,created_at,extra_data,source_evidence')
    .eq('owner_id',uid)
    .eq('title',TARGET_AUCTION_TITLE)
    .order('created_at',{ascending:true})
    .limit(3);
  if(findError) throw findError;
  if((found||[]).length>1){
    throw new Error('Integridade bloqueou a importação: existe mais de uma Base inicial relacional. Abra Integridade e reconcilie a duplicata antes de importar novamente.');
  }
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
  if(rpcError && /DUPLICATE_OWNED_AUCTION/.test(String(rpcError.message||rpcError))){
    throw new Error('Integridade bloqueou a importação: o banco encontrou mais de uma Base inicial relacional. Reconcilie a duplicata antes de importar novamente.');
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
  const rows=uniqueLotEntries(manifest).map(entry=>{
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
      item_order:Math.max(1,Number(entry.item_order)||1),
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
  if(!rows.length) return new Map();
  const {data,error}=await supabase.from('lot_items')
    .upsert(rows,{onConflict:'lot_id,item_order'})
    .select('id,lot_id,item_order');
  if(error) throw error;
  return new Map((data||[]).map(row=>[`${row.lot_id}:${Number(row.item_order)||1}`,row.id]));
}

async function replaceLotFipeCandidates(supabase,lotIds,itemIds,manifest,uid){
  const lotIdList=[...lotIds.values()];
  if(lotIdList.length){
    const {error:deleteError}=await supabase.from('lot_fipe_candidates')
      .delete()
      .in('lot_id',lotIdList)
      .contains('extra_data',{import_batch:IMPORT_BATCH});
    if(deleteError) throw deleteError;
  }

  const rows=[];
  for(const entry of manifest.lots||[]){
    const lotId=lotIds.get(Number(entry.lot));
    if(!lotId) continue;
    const itemOrder=Math.max(1,Number(entry.item_order)||1);
    const itemId=itemIds.get(`${lotId}:${itemOrder}`) || null;
    const imageData=entry.image_data_ref ? manifest.image_data?.[entry.image_data_ref] : null;
    for(const candidate of imageData?.fipe_candidates||[]){
      rows.push({
        lot_id:lotId,
        lot_item_id:itemId,
        fipe_code:candidate.code || null,
        brand:candidate.brand || null,
        model:candidate.description || candidate.model || null,
        model_year:candidate.model_year ? String(candidate.model_year) : null,
        fuel:candidate.fuel || null,
        fipe_value:candidate.value_brl ?? candidate.value ?? null,
        reference_month:imageData.reference || null,
        source_type:'user',
        verification_status:'user_reference',
        is_selected:false,
        notes:'Valor transcrito da captura fornecida pelo usuário; associação e versão devem ser revisadas.',
        extra_data:{
          import_batch:IMPORT_BATCH,
          source_image:entry.image || null,
          association:entry.association || null,
          review_required:true
        },
        created_by:uid
      });
    }
  }
  if(!rows.length) return 0;
  const {error}=await supabase.from('lot_fipe_candidates').insert(rows);
  if(error) throw error;
  return rows.length;
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
    const bytes=await zip.file(entry).async('uint8array');
    const mimeType=mimeTypeForName(name);
    const body=typeof File==='function'
      ? new File([bytes],name,{type:mimeType})
      : new Blob([bytes],{type:mimeType});
    const path=`${auctionId}/${IMPORT_BATCH}/${name}`;
    const {error}=await supabase.storage.from('auction-media').upload(path,body,{upsert:true,contentType:mimeType});
    if(error) throw error;
    uploaded++;
    paths.set(name,path);
  }

  const lotPhotoSet=new Set();
  for(const entry of manifest.lots||[]){
    const lotId=lotIds.get(Number(entry.lot));
    const path=entry.image ? paths.get(entry.image) : null;
    if(!lotId || !path) continue;
    if(!lotPhotoSet.has(lotId)){
      const {error}=await supabase.from('lots').update({photo_path:path}).eq('id',lotId);
      if(error) throw error;
      lotPhotoSet.add(lotId);
    }
    const itemOrder=Math.max(1,Number(entry.item_order)||1);
    const {error:itemError}=await supabase.from('lot_items').update({
      source_evidence:{
        import_batch:IMPORT_BATCH,
        origin:'WhatsApp exportado pelo usuário',
        association:entry.association || null,
        review_required:true,
        storage_path:path
      }
    }).eq('lot_id',lotId).eq('item_order',itemOrder);
    if(itemError) throw itemError;
  }
  return uploaded;
}

async function runImport(file){
  if(!cfg.url || !cfg.publishableKey) throw new Error('Configuração Supabase não encontrada.');
  setStatus('Lendo o pacote…');
  const {zip,manifest}=await readPackage(file);

  const supabase=createClient(cfg.url,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  await supabase.auth.refreshSession();
  const {data:{user},error:userError}=await supabase.auth.getUser();
  if(userError || !user?.id) throw new Error('Entre novamente na sua conta antes de importar o pacote.');
  if(!user.email_confirmed_at) throw new Error('Confirme o e-mail da conta antes de gravar a importação online.');
  await assertPackageTargetAccount(manifest,user);

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
    const uniqueLotCount=new Set((manifest.lots||[]).map(x=>Number(x.lot)).filter(Boolean)).size;
    setStatus(`Preparando o leilão e ${uniqueLotCount} lotes no Supabase…`);
    const auction=await ensureAuction(supabase,user.id);
    const lotIds=await upsertLots(supabase,auction.id,manifest,user.id);

    setStatus('Vinculando itens e candidatos FIPE…');
    const itemIds=await upsertItems(supabase,lotIds,manifest,user.id);
    const lotFipeCount=await replaceLotFipeCandidates(supabase,lotIds,itemIds,manifest,user.id);
    const fipeCount=await replaceFipeReferences(supabase,auction.id,manifest,user.id);

    setStatus('Enviando as imagens ao Storage privado…');
    const imageCount=await uploadImages(supabase,auction.id,zip,manifest,lotIds);

    setStatus(`Importação concluída: ${lotIds.size} lotes, ${fipeCount} referências FIPE (${lotFipeCount} vínculos por item) e ${imageCount} imagens privadas vinculadas. Revise as associações marcadas antes de tratar os dados como confirmados.`,'ok');
  }catch(error){
    const message=String(error?.message||error||'');
    if(/row-level security|violates.*policy|42501/i.test(message)){
      setStatus('Base inicial preservada neste navegador e no backup online da sua conta. A etapa relacional/mídias foi bloqueada pela política RLS do banco e ficou pendente para correção administrativa; nenhum dado foi promovido a oficial.','warn');
      return;
    }
    throw error;
  }
}

buttons.forEach(button=>button.addEventListener('click',()=>input?.click()));
input?.addEventListener('change',async event=>{
  const file=event.target.files?.[0];
  if(!file) return;
  buttons.forEach(button=>{button.disabled=true;});
  try{
    await runImport(file);
  }catch(error){
    console.error(error);
    setStatus('Importação interrompida: '+(error?.message || error)+'. As etapas já concluídas permanecem protegidas; mídias ou etapas seguintes podem estar pendentes e a importação pode ser repetida com segurança após a correção.','error');
  }finally{
    buttons.forEach(button=>{button.disabled=false;});
    input.value='';
  }
});
