import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const cfg=window.SUPABASE_CONFIG || {};
const TARGET_AUCTION_TITLE='Leilão Thiago — Base inicial';
let running=false;

async function hydratePrivateLotMedia(){
  if(running || !window.SISTEMA_THIAGO_APP || !cfg.url || !cfg.publishableKey) return;
  running=true;
  try{
    const supabase=createClient(cfg.url,cfg.publishableKey,{
      auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
    });
    const {data:{user}}=await supabase.auth.getUser();
    if(!user?.id) return;

    const {data:auctions,error:auctionError}=await supabase.from('auctions')
      .select('id,title')
      .eq('owner_id',user.id)
      .eq('title',TARGET_AUCTION_TITLE)
      .limit(1);
    if(auctionError) throw auctionError;
    const auction=auctions?.[0];
    if(!auction?.id) return;

    const {data:lots,error:lotsError}=await supabase.from('lots')
      .select('lot_number,photo_path')
      .eq('auction_id',auction.id)
      .not('photo_path','is',null);
    if(lotsError) throw lotsError;

    const paths=[...new Set((lots||[]).map(row=>row.photo_path).filter(Boolean))];
    if(!paths.length) return;

    const {data:signed,error:signedError}=await supabase.storage.from('auction-media')
      .createSignedUrls(paths,60*60);
    if(signedError) throw signedError;

    const byPath=new Map((signed||[]).map(row=>[row.path,row.signedUrl]));
    const runtime={};
    for(const row of lots||[]){
      const url=byPath.get(row.photo_path);
      if(url) runtime[String(row.lot_number)]=url;
    }
    window.SISTEMA_THIAGO_MEDIA_URLS=runtime;
    window.SISTEMA_THIAGO_APP.renderAll();
  }catch(error){
    console.warn('Não foi possível carregar as fotos privadas dos lotes.',error);
  }finally{
    running=false;
  }
}

if(window.SISTEMA_THIAGO_APP) hydratePrivateLotMedia();
else window.addEventListener('sistema-thiago:app-ready',hydratePrivateLotMedia,{once:true});

window.addEventListener('sistema-thiago:state-saved',()=>{
  setTimeout(hydratePrivateLotMedia,250);
});
