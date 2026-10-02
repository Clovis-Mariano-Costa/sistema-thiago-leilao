import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signOut
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

const config = window.FIREBASE_CONFIG;
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
const logoutBtn = document.querySelector('#logoutBtn');

function setStatus(message, type=''){
  status.textContent = message;
  status.className = 'auth-status ' + type;
}

function rememberUser(user){
  const session = user ? {
    uid:user.uid,
    email:user.email || '',
    name:user.displayName || user.email || 'Usuário',
    provider:user.providerData?.[0]?.providerId || ''
  } : null;
  if(session) localStorage.setItem('sistema-thiago-auth-session',JSON.stringify(session));
  else localStorage.removeItem('sistema-thiago-auth-session');
}

function setEnabled(enabled){
  [googleBtn,emailInput,passwordInput,emailLoginBtn,emailCreateBtn,resetPasswordBtn].forEach(el=>el.disabled=!enabled);
}

if(!config || !config.apiKey || !config.projectId){
  setEnabled(false);
  setStatus('Aguardando configuração do projeto Firebase.');
} else {
  notice.hidden = true;
  setEnabled(true);

  const app = initializeApp(config);
  const auth = getAuth(app);
  const google = new GoogleAuthProvider();

  googleBtn.addEventListener('click', async ()=>{
    try{
      setStatus('Abrindo login Google…');
      await signInWithPopup(auth,google);
    }catch(error){
      setStatus('Não foi possível entrar com Google: ' + (error?.message || error),'error');
    }
  });

  form.addEventListener('submit', async e=>{
    e.preventDefault();
    try{
      setStatus('Entrando…');
      await signInWithEmailAndPassword(auth,emailInput.value.trim(),passwordInput.value);
    }catch(error){
      setStatus('Não foi possível entrar: ' + (error?.message || error),'error');
    }
  });

  emailCreateBtn.addEventListener('click', async ()=>{
    if(!emailInput.value.trim() || !passwordInput.value){
      setStatus('Informe e-mail e senha para criar a conta.','error');
      return;
    }
    try{
      setStatus('Criando conta…');
      await createUserWithEmailAndPassword(auth,emailInput.value.trim(),passwordInput.value);
    }catch(error){
      setStatus('Não foi possível criar a conta: ' + (error?.message || error),'error');
    }
  });

  resetPasswordBtn.addEventListener('click', async ()=>{
    if(!emailInput.value.trim()){
      setStatus('Informe o e-mail para recuperar a senha.','error');
      return;
    }
    try{
      await sendPasswordResetEmail(auth,emailInput.value.trim());
      setStatus('E-mail de recuperação solicitado. Confira sua caixa de entrada.','success');
    }catch(error){
      setStatus('Não foi possível solicitar a recuperação: ' + (error?.message || error),'error');
    }
  });

  logoutBtn.addEventListener('click',()=>signOut(auth));

  onAuthStateChanged(auth,user=>{
    rememberUser(user);
    if(user){
      signedInBox.hidden=false;
      signedInName.textContent=user.displayName || 'Usuário autenticado';
      signedInEmail.textContent=user.email || '';
      setStatus('Login ativo.','success');
    }else{
      signedInBox.hidden=true;
      setStatus('Nenhum usuário autenticado.');
    }
  });
}
