import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const cfg=window.SUPABASE_CONFIG || {};
const pill=document.querySelector('#userPill');
const avatar=document.querySelector('#userPillAvatar');
const label=document.querySelector('#userPillLabel');

function initials(name){
  return String(name||'?').trim().split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase() || '?';
}

function paintFallback(name){
  if(!avatar) return;
  avatar.innerHTML='';
  const span=document.createElement('span');
  span.textContent=initials(name);
  avatar.appendChild(span);
}

async function renderSession(client,session){
  if(!pill || !label) return;
  const user=session?.user;
  if(!user){
    label.textContent='Entrar / criar conta';
    pill.title='Entrar ou criar conta';
    paintFallback('Conta');
    return;
  }

  let profile=null;
  try{
    const {data}=await client.from('profiles')
      .select('display_name,avatar_path,profile_completed_at')
      .eq('id',user.id)
      .maybeSingle();
    profile=data||null;
  }catch{}

  const meta=user.user_metadata || {};
  const name=profile?.display_name || meta.display_name || meta.full_name || meta.name || user.email || 'Minha conta';
  label.textContent=name;
  pill.title=user.email_confirmed_at ? 'Minha conta • e-mail confirmado' : 'Minha conta • confirmação pendente';

  let imageUrl='';
  if(profile?.avatar_path){
    const {data}=await client.storage.from('profile-avatars').createSignedUrl(profile.avatar_path,3600);
    imageUrl=data?.signedUrl || '';
  }
  if(!imageUrl) imageUrl=meta.avatar_url || meta.picture || '';

  if(imageUrl){
    avatar.innerHTML='';
    const img=document.createElement('img');
    img.src=imageUrl;
    img.alt='';
    img.referrerPolicy='no-referrer';
    avatar.appendChild(img);
  }else{
    paintFallback(name);
  }
}

if(cfg.url && cfg.publishableKey && pill){
  const client=createClient(cfg.url,cfg.publishableKey,{
    auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
  });
  const {data:{session}}=await client.auth.getSession();
  await renderSession(client,session);
  client.auth.onAuthStateChange((_event,nextSession)=>{
    setTimeout(()=>renderSession(client,nextSession),0);
  });
}
