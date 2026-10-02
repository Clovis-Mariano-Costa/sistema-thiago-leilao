import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const config = window.SUPABASE_CONFIG || {};
const status = document.querySelector('#authStatus');
const notice = document.querySelector('#authSetupNotice');
const googleBtn = document.querySelector('#googleLoginBtn');
const form = document.querySelector('#emailLoginForm');
const emailInput = form.elements.email;
const passwordInput = form.elements.password;
const emailLoginBtn = document.querySelector('#emailLoginBtn');
const emailCreateBtn = document.querySelector('#emailCreateBtn');
const resetPasswordBtn = document.querySelector('#resetPasswordBtn');
const signedInBox = document.querySelector('#signedInBox');
const signedInName = document.querySelector('#signedInName');
const signedInEmail = document.querySelector('#signedInEmail');
const accessSummary = document.querySelector('#accessSummary');
const logoutBtn = document.querySelector('#logoutBtn');

function setStatus(message,type=''){
  status.textContent=message;
  status.className='auth-status '+type;
}

function friendlyError(error){
  const message=String(error?.message || error || '');
  if(/Invalid login credentials/i.test(message)) return 'E-mail ou senha incorretos, ou a conta ainda não foi confirmada.';
  if(/Email not confirmed/i.test(message)) return 'Confirme seu e-mail antes de entrar.';
  if(/User already registered/i.test(message)) return 'Já existe uma conta com este e-mail.';
  if(/Password should be at least/i.test(message)) return 'A senha precisa ter pelo menos 6 caracteres.';
  if(/Unsupported provider|provider is not enabled/i.test(message)) return 'O login Google ainda precisa ser habilitado no projeto Supabase.';
  if(/redirect/i.test(message)) return 'O endereço de retorno da autenticação ainda precisa ser autorizado no Supabase.';
  return message || 'Ocorreu um erro de autenticação.';
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
    name:meta.full_name || meta.name || user.email || 'Usuário',
    provider:user.app_metadata?.provider || 'email',
    authenticated:true
  }));
}

async function updateAccessSummary(client,user){
  if(!user){
    accessSummary.textContent='';
    return;
  }
  const { data,error }=await client.from('auctions').select('id,title',{count:'exact'});
  if(error){
    accessSummary.textContent='Conta autenticada. O acesso aos leilões compartilhados ainda está em validação.';
    return;
  }
  const total=Array.isArray(data)?data.length:0;
  accessSummary.textContent=total
    ? `Acesso autorizado a ${total} leilão(ões) compartilhado(s).`
    : 'Conta ativa. Nenhum leilão compartilhado foi autorizado para este usuário.';
}

if(!config.url || !config.publishableKey){
  [googleBtn,emailInput,passwordInput,emailLoginBtn,emailCreateBtn,resetPasswordBtn].forEach(el=>el.disabled=true);
  setStatus('Configuração Supabase ausente.','error');
} else {
  const supabase=createClient(config.url,config.publishableKey,{
    auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
  });

  form.addEventListener('submit',async e=>{
    e.preventDefault();
    const email=emailInput.value.trim();
    const password=passwordInput.value;
    if(!email || !password) return setStatus('Informe e-mail e senha.','error');
    try{
      setStatus('Entrando…');
      const { data,error }=await supabase.auth.signInWithPassword({email,password});
      if(error) throw error;
      rememberSession(data.session);
      setStatus('Login realizado.','success');
      await updateAccessSummary(supabase,data.user);
    }catch(error){
      setStatus('Não foi possível entrar: '+friendlyError(error),'error');
    }
  });

  emailCreateBtn.addEventListener('click',async ()=>{
    const email=emailInput.value.trim();
    const password=passwordInput.value;
    if(!email || !password) return setStatus('Informe e-mail e senha para criar a conta.','error');
    if(password.length<6) return setStatus('A senha precisa ter pelo menos 6 caracteres.','error');
    try{
      setStatus('Criando conta…');
      const { data,error }=await supabase.auth.signUp({
        email,password,
        options:{data:{display_name:email.split('@')[0]}}
      });
      if(error) throw error;
      if(data.session){
        rememberSession(data.session);
        setStatus('Conta criada e login realizado.','success');
        await updateAccessSummary(supabase,data.user);
      }else{
        setStatus('Conta criada. Confira seu e-mail para confirmar o cadastro antes de entrar.','success');
      }
    }catch(error){
      setStatus('Não foi possível criar a conta: '+friendlyError(error),'error');
    }
  });

  resetPasswordBtn.addEventListener('click',async ()=>{
    const email=emailInput.value.trim();
    if(!email) return setStatus('Informe o e-mail para recuperar a senha.','error');
    try{
      setStatus('Solicitando recuperação…');
      const { error }=await supabase.auth.resetPasswordForEmail(email);
      if(error) throw error;
      setStatus('Pedido enviado. Confira o e-mail informado.','success');
    }catch(error){
      setStatus('Não foi possível solicitar a recuperação: '+friendlyError(error),'error');
    }
  });

  googleBtn.addEventListener('click',async ()=>{
    try{
      setStatus('Abrindo autenticação Google…');
      const { error }=await supabase.auth.signInWithOAuth({
        provider:'google',
        options:{redirectTo:location.href.split('#')[0].split('?')[0]}
      });
      if(error) throw error;
    }catch(error){
      setStatus('Google ainda não está disponível: '+friendlyError(error),'error');
    }
  });

  logoutBtn.addEventListener('click',async ()=>{
    const { error }=await supabase.auth.signOut();
    if(error) setStatus('Não foi possível sair: '+friendlyError(error),'error');
  });

  supabase.auth.onAuthStateChange(async (_event,session)=>{
    rememberSession(session);
    const user=session?.user;
    if(user){
      const meta=user.user_metadata || {};
      signedInBox.hidden=false;
      signedInName.textContent=meta.full_name || meta.name || 'Usuário autenticado';
      signedInEmail.textContent=user.email || '';
      notice.hidden=true;
      setStatus('Login ativo.','success');
      await updateAccessSummary(supabase,user);
    }else{
      signedInBox.hidden=true;
      notice.hidden=false;
      accessSummary.textContent='';
      if(!status.textContent) setStatus('Nenhum usuário autenticado.');
    }
  });

  const { data:{session} }=await supabase.auth.getSession();
  rememberSession(session);
  if(session?.user) await updateAccessSummary(supabase,session.user);
}
