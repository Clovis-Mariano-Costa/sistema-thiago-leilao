import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const cfg=window.SUPABASE_CONFIG || {};
const statusBox=document.querySelector('#inviteStatus');
const form=document.querySelector('#inviteForm');
const auctionSelect=document.querySelector('#inviteAuction');
const emailInput=document.querySelector('#inviteEmail');
const roleSelect=document.querySelector('#inviteRole');
const submitButton=document.querySelector('#inviteSubmit');
const incomingBox=document.querySelector('#incomingInvites');
const outgoingBox=document.querySelector('#outgoingInvites');

const roleLabels={owner:'Proprietário',admin:'Administrador',participant:'Participante',observer:'Observador'};
const allowedInvites={
  owner:['admin','participant','observer'],
  admin:['participant','observer']
};

let client=null;
let user=null;
let managedAuctions=[];

function setStatus(message,kind='info'){
  if(!statusBox) return;
  statusBox.textContent=message;
  statusBox.className='sync-status '+kind;
  statusBox.hidden=false;
}

function clearStatus(){
  if(statusBox) statusBox.hidden=true;
}

function emptyNode(text){
  const p=document.createElement('p');
  p.className='invite-empty';
  p.textContent=text;
  return p;
}

function formatDate(value){
  if(!value) return 'sem prazo';
  const d=new Date(value);
  return Number.isNaN(d.getTime()) ? 'prazo não identificado' : d.toLocaleString('pt-BR');
}

function shortId(value=''){
  const text=String(value);
  return text.length>12 ? text.slice(0,8)+'…' : text;
}

async function loadIdentity(){
  if(!cfg.url || !cfg.publishableKey) throw new Error('Configuração Supabase não encontrada.');
  client=createClient(cfg.url,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  const {data:{user:current},error}=await client.auth.getUser();
  if(error || !current?.id) throw new Error('Entre na sua conta antes de gerenciar participantes.');
  if(!current.email_confirmed_at) throw new Error('Confirme o e-mail da conta antes de gerenciar convites.');
  user=current;
}

async function loadManagedAuctions(){
  const {data:auctions,error:auctionError}=await client.from('auctions')
    .select('id,title,owner_id')
    .order('created_at',{ascending:false});
  if(auctionError) throw auctionError;

  const {data:members,error:memberError}=await client.from('auction_members')
    .select('auction_id,role')
    .eq('user_id',user.id);
  if(memberError) throw memberError;

  const membership=new Map((members||[]).map(row=>[row.auction_id,row.role]));
  managedAuctions=(auctions||[]).map(auction=>{
    const role=auction.owner_id===user.id ? 'owner' : membership.get(auction.id);
    return {...auction,role};
  }).filter(auction=>allowedInvites[auction.role]);

  auctionSelect.innerHTML='';
  if(!managedAuctions.length){
    const option=document.createElement('option');
    option.value='';
    option.textContent='Nenhum leilão administrável';
    auctionSelect.appendChild(option);
    auctionSelect.disabled=true;
    roleSelect.disabled=true;
    emailInput.disabled=true;
    submitButton.disabled=true;
    outgoingBox.replaceChildren(emptyNode('Sua conta não administra nenhum leilão relacional no momento.'));
    return;
  }

  auctionSelect.disabled=false;
  emailInput.disabled=false;
  submitButton.disabled=false;
  for(const auction of managedAuctions){
    const option=document.createElement('option');
    option.value=auction.id;
    option.textContent=auction.title || ('Leilão '+shortId(auction.id));
    auctionSelect.appendChild(option);
  }
  paintRoles();
}

function selectedAuction(){
  return managedAuctions.find(a=>a.id===auctionSelect.value) || null;
}

function paintRoles(){
  const auction=selectedAuction();
  roleSelect.innerHTML='';
  const roles=allowedInvites[auction?.role] || [];
  roleSelect.disabled=!roles.length;
  for(const role of roles){
    const option=document.createElement('option');
    option.value=role;
    option.textContent=roleLabels[role] || role;
    roleSelect.appendChild(option);
  }
}

function invitationCard(invite,{incoming=false}={}){
  const article=document.createElement('article');
  article.className='invite-item';

  const head=document.createElement('div');
  head.className='invite-item-head';

  const copy=document.createElement('div');
  const title=document.createElement('h3');
  title.textContent=incoming
    ? 'Convite para leilão '+shortId(invite.auction_id)
    : invite.email;
  const meta=document.createElement('p');
  meta.className='invite-meta';
  const role=document.createElement('span');
  role.className='invite-role';
  role.textContent=roleLabels[invite.role] || invite.role;
  meta.append('Papel: ',role,' • Estado: '+invite.status+' • Prazo: '+formatDate(invite.expires_at));
  copy.append(title,meta);
  head.append(copy);
  article.append(head);

  if(incoming){
    const actions=document.createElement('div');
    actions.className='invite-actions';
    const accept=document.createElement('button');
    accept.type='button';
    accept.className='primary-btn';
    accept.textContent='Aceitar convite';
    accept.addEventListener('click',()=>acceptInvitation(invite.id,accept));
    actions.appendChild(accept);
    article.appendChild(actions);
  }
  return article;
}

async function loadIncoming(){
  incomingBox.replaceChildren(emptyNode('Carregando convites…'));
  const {data,error}=await client.from('invitations')
    .select('id,auction_id,email,role,status,expires_at,created_at')
    .ilike('email',String(user.email||'').trim())
    .eq('status','pending')
    .order('created_at',{ascending:false});
  if(error) throw error;
  incomingBox.innerHTML='';
  if(!data?.length){
    incomingBox.appendChild(emptyNode('Nenhum convite pendente para esta conta.'));
    return;
  }
  for(const invite of data) incomingBox.appendChild(invitationCard(invite,{incoming:true}));
}

async function loadOutgoing(){
  const auction=selectedAuction();
  outgoingBox.innerHTML='';
  if(!auction){
    outgoingBox.appendChild(emptyNode('Selecione um leilão administrável.'));
    return;
  }
  const {data,error}=await client.from('invitations')
    .select('id,auction_id,email,role,status,expires_at,created_at')
    .eq('auction_id',auction.id)
    .order('created_at',{ascending:false});
  if(error) throw error;
  if(!data?.length){
    outgoingBox.appendChild(emptyNode('Nenhum convite criado para este leilão.'));
    return;
  }
  for(const invite of data) outgoingBox.appendChild(invitationCard(invite));
}

async function createInvitation(event){
  event.preventDefault();
  clearStatus();
  const auction=selectedAuction();
  const email=String(emailInput.value||'').trim().toLowerCase();
  const role=roleSelect.value;
  if(!auction) return setStatus('Selecione um leilão administrável.','warn');
  if(!allowedInvites[auction.role]?.includes(role)) return setStatus('O papel escolhido não é permitido para sua autoridade atual.','error');
  if(!email) return setStatus('Informe o e-mail do convidado.','warn');
  if(email===String(user.email||'').trim().toLowerCase()) return setStatus('Sua própria conta já possui acesso; não é necessário convidá-la.','warn');

  submitButton.disabled=true;
  try{
    const {data:existing,error:existingError}=await client.from('invitations')
      .select('id')
      .eq('auction_id',auction.id)
      .eq('email',email)
      .eq('status','pending')
      .limit(1);
    if(existingError) throw existingError;
    if(existing?.length){
      setStatus('Já existe um convite pendente para esse e-mail neste leilão.','warn');
      return;
    }

    const {error}=await client.from('invitations').insert({
      auction_id:auction.id,
      email,
      role,
      status:'pending',
      invited_by:user.id
    });
    if(error) throw error;
    emailInput.value='';
    setStatus('Convite criado. O convidado poderá aceitá-lo quando entrar com esse e-mail confirmado.','ok');
    await loadOutgoing();
  }catch(error){
    console.error(error);
    setStatus('Não foi possível criar o convite: '+(error?.message||error),'error');
  }finally{
    submitButton.disabled=false;
  }
}

async function acceptInvitation(id,button){
  clearStatus();
  button.disabled=true;
  try{
    const {error}=await client.rpc('accept_auction_invitation',{p_invitation_id:id});
    if(error) throw error;
    setStatus('Convite aceito. O leilão já está disponível conforme o papel concedido.','ok');
    await loadManagedAuctions();
    await Promise.all([loadIncoming(),loadOutgoing()]);
  }catch(error){
    console.error(error);
    setStatus('Não foi possível aceitar o convite: '+(error?.message||error),'error');
    button.disabled=false;
  }
}

async function boot(){
  try{
    await loadIdentity();
    await loadManagedAuctions();
    await Promise.all([loadIncoming(),loadOutgoing()]);
  }catch(error){
    console.error(error);
    form?.querySelectorAll('input,select,button').forEach(el=>{el.disabled=true;});
    incomingBox?.replaceChildren(emptyNode('Entre com uma conta confirmada para visualizar convites.'));
    outgoingBox?.replaceChildren(emptyNode('Entre com uma conta confirmada para administrar participantes.'));
    setStatus(error?.message||String(error),'warn');
  }
}

auctionSelect?.addEventListener('change',async()=>{
  paintRoles();
  try{ await loadOutgoing(); }
  catch(error){ setStatus('Não foi possível carregar os convites enviados: '+(error?.message||error),'error'); }
});
form?.addEventListener('submit',createInvitation);

await boot();
