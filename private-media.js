import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const cfg=window.SUPABASE_CONFIG || {};
const TARGET_AUCTION_TITLE='Leilão Thiago — Base inicial';
let running=false;
let lastHydratedAt=0;

function setRuntimeMaps({lotUrls={},itemUrls={},fipeUrls={},fipeContexts={},scope={}}={}){
  lastHydratedAt=Date.now();
  window.SISTEMA_THIAGO_MEDIA_URLS=lotUrls;
  window.SISTEMA_THIAGO_ITEM_MEDIA_URLS=itemUrls;
  window.SISTEMA_THIAGO_FIPE_MEDIA_URLS=fipeUrls;
  window.SISTEMA_THIAGO_FIPE_CONTEXTS=fipeContexts;
  window.SISTEMA_THIAGO_MEDIA_SCOPE={
    auctionTitle:String(scope.auctionTitle||''),
    relationalAuctionId:String(scope.relationalAuctionId||'')
  };
  if(window.SISTEMA_THIAGO_APP?.renderAll) window.SISTEMA_THIAGO_APP.renderAll();
  window.dispatchEvent(new CustomEvent('sistema-thiago:media-ready',{
    detail:{
      lots:Object.keys(lotUrls).length,
      items:Object.keys(itemUrls).length,
      fipe:Object.keys(fipeUrls).length,
      contexts:Object.keys(fipeContexts).length
    }
  }));
}

async function hydratePrivateLotMedia(){
  if(running || !cfg.url || !cfg.publishableKey) return;
  running=true;
  try{
    const supabase=createClient(cfg.url,cfg.publishableKey,{
      auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
    });
    const {data:{user},error:userError}=await supabase.auth.getUser();
    if(userError || !user?.id) return;

    const {data:auctions,error:auctionError}=await supabase.from('auctions')
      .select('id,title,extra_data')
      .eq('title',TARGET_AUCTION_TITLE)
      .order('updated_at',{ascending:false})
      .limit(10);
    if(auctionError) throw auctionError;
    if(!auctions?.length) return;

    // RLS devolve somente leilões que o usuário pode ver (proprietário ou membro).
    // Quando existem cópias com o mesmo título, a canônica vem primeiro.
    const accessibleAuctions=[...auctions].sort((a,b)=>{
      const ca=a?.extra_data?.canonical===true ? 1 : 0;
      const cb=b?.extra_data?.canonical===true ? 1 : 0;
      return cb-ca;
    });

    let chosen=null;
    let lots=[];
    let media=[];
    let items=[];

    for(const auction of accessibleAuctions){
      const {data:auctionLots,error:lotsError}=await supabase.from('lots')
        .select('id,lot_number,photo_path')
        .eq('auction_id',auction.id)
        .order('lot_number',{ascending:true});
      if(lotsError) throw lotsError;
      const lotIds=(auctionLots||[]).map(row=>row.id).filter(Boolean);
      if(!lotIds.length) continue;

      const [itemsResult,mediaResult]=await Promise.all([
        supabase.from('lot_items')
          .select('id,lot_id,item_order,item_identifier,source_media_label,chassis,plate,vehicle')
          .in('lot_id',lotIds)
          .order('item_order',{ascending:true}),
        supabase.from('lot_media')
          .select('id,lot_id,lot_item_id,storage_path,source_label,media_kind,mime_type')
          .in('lot_id',lotIds)
      ]);
      if(itemsResult.error) throw itemsResult.error;
      if(mediaResult.error) throw mediaResult.error;

      if((mediaResult.data||[]).length || (auctionLots||[]).some(row=>row.photo_path)){
        chosen=auction;
        lots=auctionLots||[];
        items=itemsResult.data||[];
        media=mediaResult.data||[];
        break;
      }
    }

    if(!chosen) return;

    const pathSet=new Set();
    lots.forEach(row=>{if(row.photo_path) pathSet.add(row.photo_path)});
    media.forEach(row=>{if(row.storage_path) pathSet.add(row.storage_path)});
    const paths=[...pathSet];
    if(!paths.length){
      setRuntimeMaps({scope:{auctionTitle:chosen.title,relationalAuctionId:chosen.id}});
      return;
    }

    const {data:signed,error:signedError}=await supabase.storage.from('auction-media')
      .createSignedUrls(paths,60*60);
    if(signedError) throw signedError;

    const byPath=new Map((signed||[]).map(row=>[row.path,row.signedUrl]));
    const lotNumberById=new Map(lots.map(row=>[row.id,String(row.lot_number)]));
    const itemById=new Map(items.map(row=>[row.id,row]));
    const itemsByLotId=new Map();
    for(const item of items){
      if(!itemsByLotId.has(item.lot_id)) itemsByLotId.set(item.lot_id,[]);
      itemsByLotId.get(item.lot_id).push(item);
    }
    for(const rows of itemsByLotId.values()){
      rows.sort((a,b)=>Number(a.item_order||1)-Number(b.item_order||1));
    }

    const lotUrls={};
    for(const row of lots){
      const url=byPath.get(row.photo_path);
      if(url) lotUrls[String(row.lot_number)]=url;
    }

    const itemUrls={};
    const fipeUrls={};
    const fipeContexts={};
    const putFipeContext=(label,item,lotNumber,url='')=>{
      const key=String(label||'').trim();
      if(!key || !item) return;
      const siblings=itemsByLotId.get(item.lot_id)||[];
      const itemIndex=Math.max(0,siblings.findIndex(entry=>entry.id===item.id));
      const context={
        auctionTitle:chosen.title,
        lotNumber:String(lotNumber||''),
        itemOrder:itemIndex+1,
        itemTotal:Math.max(1,siblings.length),
        itemIdentifier:String(item.item_identifier||''),
        serial:String(item.chassis||''),
        plate:String(item.plate||''),
        vehicle:String(item.vehicle||''),
        imageUrl:String(url||'')
      };
      fipeContexts[key]=context;
      const basename=key.split(/[\\/]/).pop();
      if(basename) fipeContexts[basename]=context;
    };
    for(const row of media){
      const url=byPath.get(row.storage_path);
      if(!url) continue;

      const label=String(row.source_label||'').trim();
      if(label){
        fipeUrls[label]=url;
        const basename=label.split(/[\\/]/).pop();
        if(basename) fipeUrls[basename]=url;
      }

      const item=itemById.get(row.lot_item_id);
      if(item?.item_identifier) itemUrls[String(item.item_identifier)]=url;

      const lotNumber=lotNumberById.get(row.lot_id);
      if(lotNumber && !lotUrls[lotNumber]) lotUrls[lotNumber]=url;
      if(label && item) putFipeContext(label,item,lotNumber,url);
    }

    // Compatibilidade: se a mídia estiver vinculada por source_media_label,
    // também disponibiliza URL ao item mesmo que item_identifier tenha sido
    // gerado depois da importação original.
    for(const item of items){
      if(itemUrls[item.item_identifier]) continue;
      const label=String(item.source_media_label||'').trim();
      const url=label ? fipeUrls[label] : '';
      if(url && item.item_identifier) itemUrls[String(item.item_identifier)]=url;
      if(label){
        const lotNumber=lotNumberById.get(item.lot_id);
        putFipeContext(label,item,lotNumber,url);
      }
    }

    setRuntimeMaps({
      lotUrls,
      itemUrls,
      fipeUrls,
      fipeContexts,
      scope:{auctionTitle:chosen.title,relationalAuctionId:chosen.id}
    });
  }catch(error){
    console.warn('Não foi possível carregar as fotos privadas dos lotes/itens.',error);
  }finally{
    running=false;
  }
}

function scheduleMediaHydration(){
  const launch=()=>hydratePrivateLotMedia();
  if('requestIdleCallback' in window){
    window.requestIdleCallback(launch,{timeout:1500});
  }else{
    setTimeout(launch,260);
  }
}

scheduleMediaHydration();
if(!window.SISTEMA_THIAGO_APP){
  window.addEventListener('sistema-thiago:app-ready',scheduleMediaHydration,{once:true});
}

window.addEventListener('sistema-thiago:media-refresh-request',scheduleMediaHydration);
document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='visible' && Date.now()-lastHydratedAt>45*60*1000){
    scheduleMediaHydration();
  }
});
