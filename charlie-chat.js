(()=>{
const launcher=document.querySelector('[data-system-chat-launcher]');
const panel=document.querySelector('[data-system-chat-panel]');
const closeBtn=document.querySelector('[data-system-chat-close]');
const form=document.querySelector('[data-system-chat-form]');
const input=document.querySelector('[data-system-chat-input]');
const body=document.querySelector('[data-system-chat-body]');
if(!launcher||!panel||!form||!input||!body) return;

const messages=[];
function esc(s){return String(s||'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
function addMessage(text,role='assistant'){
  const div=document.createElement('div');
  div.className='charlie-msg '+(role==='user'?'user':'assistant');
  div.innerHTML=esc(text).replace(/https:\/\/[^\s<>"']+/g,u=>'<a href="'+u+'" target="_blank" rel="noopener noreferrer">'+u+'</a>').replace(/\n/g,'<br>');
  body.appendChild(div);
  body.scrollTop=body.scrollHeight;
}
function openChat(open){
  panel.hidden=!open;
  if(open) setTimeout(()=>input.focus(),40);
}
function auctionContext(){
  const state=window.SISTEMA_THIAGO_APP?.getState?.();
  const auction=(state?.auctions||[]).find(a=>a.id===state.currentAuctionId) || state?.auctions?.[0];
  if(!auction) return 'Nenhum leilão está aberto neste momento.';
  const lots=Array.isArray(auction.lots)?auction.lots:[];
  const pending=lots.find(l=>!l.sold);
  return [
    'Leilão atual: '+String(auction.title||'Sem título').slice(0,160),
    auction.date?'Data: '+auction.date:'',
    auction.reference?'Referência: '+String(auction.reference).slice(0,180):'',
    'Lotes cadastrados: '+lots.length,
    pending?'Próximo lote pendente: '+String(pending.n||'')+' — '+String(pending.vehicle||'item').slice(0,120):'Sem lote pendente'
  ].filter(Boolean).join('\n');
}

launcher.addEventListener('click',()=>openChat(true));
closeBtn?.addEventListener('click',()=>openChat(false));
form.addEventListener('submit',async e=>{
  e.preventDefault();
  const text=input.value.trim();
  if(!text) return;
  addMessage(text,'user');
  messages.push({role:'user',content:text});
  if(messages.length>12) messages.splice(0,messages.length-12);
  input.value='';
  const wait=document.createElement('div');
  wait.className='charlie-msg assistant';
  wait.textContent='Consultando a Charlie Echo…';
  body.appendChild(wait);
  body.scrollTop=body.scrollHeight;

  try{
    const response=await fetch('https://charlieecho.jus9tecnologia.com.br/api/ia',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        message:text,
        mode:'profissional',
        room:{
          title:'Sistema Thiago — ambiente autenticado',
          summary:'Apoio operacional para acompanhamento de leilões. Não decidir lance pelo usuário. Não presumir dado ausente.',
          currentTopic:auctionContext(),
          lastUserIntent:text,
          messages:messages.slice(-10)
        }
      })
    });
    const data=await response.json().catch(()=>null);
    wait.remove();
    const answer=response.ok && data?.answer ? String(data.answer) : 'Não consegui acessar a Charlie Echo agora. Seus dados do leilão continuam preservados.';
    addMessage(answer,'assistant');
    messages.push({role:'assistant',content:answer});
    if(messages.length>12) messages.splice(0,messages.length-12);
  }catch{
    wait.remove();
    addMessage('A Charlie Echo está temporariamente indisponível. O Sistema Thiago continua funcionando normalmente.','assistant');
  }
});
input.addEventListener('keydown',e=>{
  if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();form.requestSubmit();}
});
})();