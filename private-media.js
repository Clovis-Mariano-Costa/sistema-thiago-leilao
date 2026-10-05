import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const cfg=window.SUPABASE_CONFIG || {};
const TARGET_AUCTION_TITLE='Leilão Thiago — Base inicial';
let running=false;
let lastHydratedAt=0;

function setRuntimeMaps({lotUrls={},itemUrls={},fipeUrls={}}={}){
  lastHydratedAt=Date.now();
  window.SISTEMA_THIAGO_MEDIA_URLS=lotUrls;
  window.SISTEMA_THIAGO_ITEM_MEDIA_URLS=itemUrls;
  window.SISTEMA_THIAGO_FIPE_MEDIA_URLS=fipeUrls;
  if(window.SISTEMA_THIAGO_APP?.renderAll) window.SISTEMA_THIAGO_APP.renderAll();
  window.dispatchEvent(new CustomEvent('sistema-thiago:media-ready',{
    detail:{
      lots:Object.keys(lotUrls).length,
      items:Object.keys(itemUrls).length,
      fipe:Object.keys(fipeUrls).length
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
      .select('id,title')
      .eq('owner_id',user.id)
      .eq('title',TARGET_AUCTION_TITLE)
      .order('updated_at',{ascending:false})
      .limit(5);
    if(auctionError) throw auctionError;
    if(!auctions?.length) return;

    // Se houver mais de uma Base inicial, não misturamos contas nem escolhemos
    // arbitrariamente uma cópia. Preferimos a primeira que tenha mídia.
    let chosen=null;
    let lots=[];
    let media=[];
    let items=[];

    for(const auction of auctions){
      const {data:auctionLots,error:lotsError}=await supabase.from('lots')
        .select('id,lot_number,photo_path')
        .eq('auction_id',auction.id)
        .order('lot_number',{ascending:true});
      if(lotsError) throw lotsError;
      const lotIds=(auctionLots||[]).map(row=>row.id).filter(Boolean);
      if(!lotIds.length) continue;

      const [itemsResult,mediaResult]=await Promise.all([
        supabase.from('lot_items')
          .select('id,lot_id,item_order,item_identifier,source_media_label')
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
      setRuntimeMaps();
      return;
    }

    const {data:signed,error:signedError}=await supabase.storage.from('auction-media')
      .createSignedUrls(paths,60*60);
    if(signedError) throw signedError;

    const byPath=new Map((signed||[]).map(row=>[row.path,row.signedUrl]));
    const lotNumberById=new Map(lots.map(row=>[row.id,String(row.lot_number)]));
    const itemById=new Map(items.map(row=>[row.id,row]));

    const lotUrls={};
    for(const row of lots){
      const url=byPath.get(row.photo_path);
      if(url) lotUrls[String(row.lot_number)]=url;
    }

    const itemUrls={};
    const fipeUrls={};
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
    }

    // Compatibilidade: se a mídia estiver vinculada por source_media_label,
    // também disponibiliza URL ao item mesmo que item_identifier tenha sido
    // gerado depois da importação original.
    for(const item of items){
      if(itemUrls[item.item_identifier]) continue;
      const label=String(item.source_media_label||'').trim();
      const url=label ? fipeUrls[label] : '';
      if(url && item.item_identifier) itemUrls[String(item.item_identifier)]=url;
    }

    setRuntimeMaps({lotUrls,itemUrls,fipeUrls});
  }catch(error){
    console.warn('Não foi possível carregar as fotos privadas dos lotes/itens.',error);
  }finally{
    running=false;
  }
}

if(window.SISTEMA_THIAGO_APP) hydratePrivateLotMedia();
else window.addEventListener('sistema-thiago:app-ready',hydratePrivateLotMedia,{once:true});

window.addEventListener('sistema-thiago:media-refresh-request',hydratePrivateLotMedia);
document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='visible' && Date.now()-lastHydratedAt>45*60*1000){
    hydratePrivateLotMedia();
  }
});
