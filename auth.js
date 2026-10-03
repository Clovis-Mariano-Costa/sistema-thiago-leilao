import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const config=window.SUPABASE_CONFIG || {};
const $=sel=>document.querySelector(sel);
const status=$('#authStatus');
const notice=$('#authSetupNotice');
const authForms=$('#authForms');
const signedInBox=$('#signedInBox');
const loginForm=$('#emailLoginForm');
const signupForm=$('#signupForm');
const profileForm=$('#profileForm');
const googleBtn=$('#googleLoginBtn');
const resetPasswordBtn=$('#resetPasswordBtn');
const resendConfirmationBtn=$('#resendConfirmationBtn');
const signupInlineStatus=$('#signupInlineStatus');
const confirmationPanel=$('#confirmationPanel');
const confirmationEmail=$('#confirmationEmail');
const confirmationResendBtn=$('#confirmationResendBtn');
const confirmationLoginBtn=$('#confirmationLoginBtn');
const logoutBtn=$('#logoutBtn');
const signedInName=$('#signedInName');
const signedInEmail=$('#signedInEmail');
const emailStatusBadge=$('#emailStatusBadge');
const accessSummary=$('#accessSummary');
const profileAvatar=$('#profileAvatar');

let supabase=null;
let currentUser=null;
let currentProfile=null;
let lastSignupEmail='';

function setStatus(message,type=''){
  status.textContent=message;
  status.className='auth-status auth-status-box '+type;
}

function friendlyError(error){
  const message=String(error?.message || error || '');
  if(/Invalid login credentials/i.test(message)) return 'E-mail ou senha incorretos, ou a conta ainda não foi confirmada.';
  if(/Email not confirmed/i.test(message)) return 'Confirme seu e-mail antes de entrar.';
  if(/User already registered/i.test(message)) return 'Já existe uma conta com este e-mail.';
  if(/Weak password|Password should be at least/i.test(message)) return 'A senha não atende à política mínima de segurança.';
  if(/Unsupported provider|provider is not enabled/i.test(message)) return 'O login Google ainda precisa ser habilitado no Supabase.';
  if(/redirect/i.test(message)) return 'O endereço de retorno ainda precisa ser autorizado na configuração de autenticação.';
  if(/rate limit/i.test(message)) return 'Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.';
  return message || 'Ocorreu um erro de autenticação.';
}

function appOrigin(){
  return String(config.appOrigin || location.origin).replace(/\/$/,'');
}

function authUrl(params=''){
  const suffix=params ? '?' + params : '';
  return appOrigin() + '/auth.html' + suffix;
}

function appUrl(){
  return appOrigin() + '/app.html';
}

function emailRedirectUrl(){
  return authUrl('confirmed=1');
}

function oauthRedirectUrl(){
  return authUrl('oauth=1');
}

function passwordChecks(password,confirmPassword=''){
  return {
    length:password.length>=8,
    lower:/[a-z]/.test(password),
    upper:/[A-Z]/.test(password),
    number:/\d/.test(password),
    symbol:/[^A-Za-z0-9]/.test(password),
    match:Boolean(password) && password===confirmPassword
  };
}

function renderPasswordPolicy(){
  const password=signupForm.elements.password.value || '';
  const confirmPassword=signupForm.elements.confirmPassword.value || '';
  const checks=passwordChecks(password,confirmPassword);
  Object.entries(checks).forEach(([rule,ok])=>{
    const el=document.querySelector(`[data-password-rule="${rule}"]`);
    if(el) el.classList.toggle('ok',ok);
  });
  return Object.values(checks).every(Boolean);
}

function passwordFailureMessage(){
  const p=signupForm.elements.password.value || '';
  const c=signupForm.elements.confirmPassword.value || '';
  const checks=passwordChecks(p,c);
  const names={
    length:'8 ou mais caracteres',
    lower:'uma letra minúscula',
    upper:'uma letra maiúscula',
    number:'um número',
    symbol:'um símbolo',
    match:'as duas senhas precisam ser idênticas'
  };
  return Object.entries(checks).filter(([,ok])=>!ok).map(([k])=>names[k]);
}

function showSignupError(message){
  signupInlineStatus.textContent=message;
  signupInlineStatus.className='inline-form-status error';
  signupInlineStatus.scrollIntoView({behavior:'smooth',block:'center'});
}

function maskEmail(email){
  const [name,domain]=String(email||'').split('@');
  if(!domain) return email || 'seu e-mail';
  const shown=name.length<=2 ? name[0]+'*' : name.slice(0,2)+'***';
  return shown+'@'+domain;
}

function showConfirmation(email){
  lastSignupEmail=email || lastSignupEmail;
  confirmationEmail.textContent=maskEmail(lastSignupEmail);
  authForms.hidden=true;
  confirmationPanel.hidden=false;
  signedInBox.hidden=true;
  notice.hidden=true;
  confirmationPanel.scrollIntoView({behavior:'smooth',block:'start'});
}

function rememberSession(session){
  const user=session?.user;
  if(!user){
    localStorage.removeItem('sistema-thiago-auth-session');
    return;
  }
  const meta=user.user_metadata || {};
  localStorage.setItem('sistema-thiago-auth-session',JSON.stringify({
    uid:user.id,
    email:user.email || '',
    name:meta.display_name || meta.full_name || meta.name || user.email || 'Usuário',
    provider:user.app_metadata?.provider || 'email',
    authenticated:true,
    emailConfirmed:Boolean(user.email_confirmed_at)
  }));
}

function initials(name){
  return String(name||'?').trim().split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase() || '?';
}

async function avatarUrl(user,profile){
  if(profile?.avatar_path){
    const {data,error}=await supabase.storage.from('profile-avatars').createSignedUrl(profile.avatar_path,3600);
    if(!error && data?.signedUrl) return data.signedUrl;
  }
  const meta=user?.user_metadata || {};
  return meta.avatar_url || meta.picture || '';
}

async function paintAvatar(user,profile){
  const name=profile?.display_name || user?.user_metadata?.display_name || user?.user_metadata?.full_name || user?.email || 'Usuário';
  const url=await avatarUrl(user,profile);
  profileAvatar.innerHTML='';
  if(url){
    const img=document.createElement('img');
    img.src=url;
    img.alt='';
    img.referrerPolicy='no-referrer';
    profileAvatar.appendChild(img);
  }else{
    const span=document.createElement('span');
    span.textContent=initials(name);
    profileAvatar.appendChild(span);
  }
}

async function loadProfile(user){
  const {data,error}=await supabase.from('profiles')
    .select('id,display_name,email,avatar_path,profile_completed_at')
    .eq('id',user.id)
    .maybeSingle();
  if(error) return null;
  return data || null;
}

async function updateAccessSummary(user){
  if(!user?.email_confirmed_at){
    accessSummary.textContent='Aguardando confirmação';
    accessSummary.className='source-badge user-source';
    return;
  }
  const {data,error}=await supabase.from('auctions').select('id,title');
  if(error){
    accessSummary.textContent='Acesso protegido';
    accessSummary.className='source-badge user-source';
    return;
  }
  const total=Array.isArray(data)?data.length:0;
  accessSummary.textContent=total ? `${total} leilão(ões) autorizado(s)` : 'Nenhum leilão compartilhado';
  accessSummary.className='source-badge official-source';
}

async function renderUser(session){
  rememberSession(session);
  currentUser=session?.user || null;
  if(!currentUser){
    currentProfile=null;
    signedInBox.hidden=true;
    authForms.hidden=false;
    notice.hidden=false;
    return;
  }

  currentProfile=await loadProfile(currentUser);
  const meta=currentUser.user_metadata || {};
  const name=currentProfile?.display_name || meta.display_name || meta.full_name || meta.name || currentUser.email || 'Usuário';

  signedInName.textContent=name;
  signedInEmail.textContent=currentUser.email || '';
  emailStatusBadge.textContent=currentUser.email_confirmed_at ? 'E-mail confirmado' : 'E-mail não confirmado';
  emailStatusBadge.className='source-badge '+(currentUser.email_confirmed_at?'official-source':'user-source');

  profileForm.elements.displayName.value=currentProfile?.display_name || meta.display_name || meta.full_name || meta.name || '';
  await paintAvatar(currentUser,currentProfile);
  await updateAccessSummary(currentUser);

  signedInBox.hidden=false;
  authForms.hidden=true;
  notice.hidden=true;

  if(currentUser.email_confirmed_at){
    setStatus(currentProfile?.profile_completed_at ? 'Conta conectada e confirmada.' : 'E-mail confirmado. Complete seu perfil para finalizar o cadastro.','success');
  }else{
    setStatus('Conta conectada, mas o e-mail ainda precisa ser confirmado.','error');
  }
}

async function uploadAvatar(user,file,previousPath=''){
  if(!file || !file.size) return previousPath || '';
  const allowed=['image/jpeg','image/png','image/webp'];
  if(!allowed.includes(file.type)) throw new Error('Use foto JPG, PNG ou WebP.');
  if(file.size>2*1024*1024) throw new Error('A foto deve ter no máximo 2 MB.');

  const ext=file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg';
  const path=`${user.id}/avatar.${ext}`;
  const {error}=await supabase.storage.from('profile-avatars').upload(path,file,{
    upsert:true,
    contentType:file.type,
    cacheControl:'3600'
  });
  if(error) throw error;

  if(previousPath && previousPath!==path){
    await supabase.storage.from('profile-avatars').remove([previousPath]);
  }
  return path;
}

if(!config.url || !config.publishableKey){
  document.querySelectorAll('button,input').forEach(el=>el.disabled=true);
  setStatus('Configuração Supabase ausente.','error');
}else{
  supabase=createClient(config.url,config.publishableKey,{
    auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
  });

  signupForm.elements.password.addEventListener('input',renderPasswordPolicy);
  signupForm.elements.confirmPassword.addEventListener('input',renderPasswordPolicy);

  signupForm.addEventListener('submit',async e=>{
    e.preventDefault();
    const name=signupForm.elements.displayName.value.trim();
    const email=signupForm.elements.email.value.trim();
    const password=signupForm.elements.password.value;
    const confirmPassword=signupForm.elements.confirmPassword.value;

    signupInlineStatus.textContent='';
    if(name.length<2) return showSignupError('Informe seu nome para criar o perfil.');
    if(!renderPasswordPolicy()){
      const missing=passwordFailureMessage();
      return showSignupError('A senha ainda não cumpre os requisitos: '+missing.join('; ')+'.');
    }

    lastSignupEmail=email;
    try{
      setStatus('Criando conta e solicitando confirmação…');
      const {data,error}=await supabase.auth.signUp({
        email,
        password,
        options:{
          emailRedirectTo:emailRedirectUrl(),
          data:{display_name:name}
        }
      });
      if(error) throw error;

      if(data.session){
        setStatus('Conta criada e sessão aberta. Verificando confirmação…','success');
        await renderUser(data.session);
      }else{
        setStatus('Conta criada. Confirme seu e-mail para continuar.','success');
        showConfirmation(email);
      }
      signupForm.elements.password.value='';
      signupForm.elements.confirmPassword.value='';
      renderPasswordPolicy();
    }catch(error){
      setStatus('Não foi possível criar a conta: '+friendlyError(error),'error');
    }
  });

  resendConfirmationBtn.addEventListener('click',async ()=>{
    const email=(signupForm.elements.email.value || lastSignupEmail || loginForm.elements.email.value || '').trim();
    if(!email) return setStatus('Informe o e-mail da conta para reenviar a confirmação.','error');
    try{
      setStatus('Reenviando confirmação…');
      const {error}=await supabase.auth.resend({
        type:'signup',
        email,
        options:{emailRedirectTo:emailRedirectUrl()}
      });
      if(error) throw error;
      setStatus('Confirmação reenviada. Verifique também a pasta de spam/lixo eletrônico.','success');
    }catch(error){
      setStatus('Não foi possível reenviar: '+friendlyError(error),'error');
    }
  });

  confirmationResendBtn.addEventListener('click',()=>resendConfirmationBtn.click());
  confirmationLoginBtn.addEventListener('click',()=>{
    confirmationPanel.hidden=true;
    authForms.hidden=false;
    notice.hidden=false;
    loginForm.elements.email.value=lastSignupEmail || signupForm.elements.email.value || '';
    loginForm.scrollIntoView({behavior:'smooth',block:'start'});
    loginForm.elements.password.focus();
  });

  loginForm.addEventListener('submit',async e=>{
    e.preventDefault();
    const email=loginForm.elements.email.value.trim();
    const password=loginForm.elements.password.value;
    try{
      setStatus('Entrando…');
      const {data,error}=await supabase.auth.signInWithPassword({email,password});
      if(error) throw error;
      await renderUser(data.session);
      if(data.session?.user?.email_confirmed_at) location.replace(appUrl());
    }catch(error){
      setStatus('Não foi possível entrar: '+friendlyError(error),'error');
    }
  });

  resetPasswordBtn.addEventListener('click',async ()=>{
    const email=loginForm.elements.email.value.trim() || signupForm.elements.email.value.trim();
    if(!email) return setStatus('Informe o e-mail da conta para recuperar a senha.','error');
    try{
      setStatus('Solicitando recuperação…');
      const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:emailRedirectUrl()});
      if(error) throw error;
      setStatus('Pedido de recuperação enviado. Confira o e-mail informado.','success');
    }catch(error){
      setStatus('Não foi possível solicitar a recuperação: '+friendlyError(error),'error');
    }
  });

  googleBtn.addEventListener('click',async ()=>{
    try{
      setStatus('Abrindo autenticação Google…');
      const {error}=await supabase.auth.signInWithOAuth({
        provider:'google',
        options:{redirectTo:oauthRedirectUrl()}
      });
      if(error) throw error;
    }catch(error){
      setStatus('Google ainda não está disponível neste projeto: '+friendlyError(error),'error');
    }
  });

  profileForm.addEventListener('submit',async e=>{
    e.preventDefault();
    if(!currentUser) return setStatus('Faça login antes de editar o perfil.','error');
    if(!currentUser.email_confirmed_at) return setStatus('Confirme o e-mail antes de concluir o perfil.','error');

    const displayName=profileForm.elements.displayName.value.trim();
    if(displayName.length<2) return setStatus('Informe um nome de exibição válido.','error');

    try{
      setStatus('Salvando perfil…');
      const file=profileForm.elements.avatar.files?.[0];
      const avatarPath=await uploadAvatar(currentUser,file,currentProfile?.avatar_path || '');

      const {error:profileError}=await supabase.from('profiles').update({
        display_name:displayName,
        avatar_path:avatarPath || null,
        profile_completed_at:new Date().toISOString()
      }).eq('id',currentUser.id);
      if(profileError) throw profileError;

      const {error:userError}=await supabase.auth.updateUser({data:{display_name:displayName}});
      if(userError) throw userError;

      const {data:{session}}=await supabase.auth.getSession();
      await renderUser(session);
      profileForm.elements.avatar.value='';
      setStatus('Perfil salvo. Nome e foto já podem aparecer na página inicial.','success');
    }catch(error){
      setStatus('Não foi possível salvar o perfil: '+friendlyError(error),'error');
    }
  });

  logoutBtn.addEventListener('click',async ()=>{
    const {error}=await supabase.auth.signOut();
    if(error) return setStatus('Não foi possível sair: '+friendlyError(error),'error');
    setStatus('Sessão encerrada.');
  });

  supabase.auth.onAuthStateChange((_event,session)=>{
    setTimeout(()=>renderUser(session),0);
  });

  const {data:{session}}=await supabase.auth.getSession();
  await renderUser(session);

  const authParams=new URLSearchParams(location.search);
  if(authParams.get('oauth')==='1' && session?.user?.email_confirmed_at){
    history.replaceState({},document.title,location.pathname);
    location.replace(appUrl());
  }

  if(authParams.get('confirmed')==='1' && !session){
    setStatus('Se você acabou de confirmar o e-mail, entre agora com sua senha.','success');
  }
}
