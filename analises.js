import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const cfg=window.SUPABASE_CONFIG || {};
const select=document.querySelector('#analyticsAuction');
const statusBox=document.querySelector('#analyticsStatus');
const preferenceRows=document.querySelector('#preferenceRows');
const preferenceEmpty=document.querySelector('#preferenceEmpty');

let client=null;
let auctions=[];

function setStatus(message,kind='info'){
  statusBox.textContent=message;
  statusBox.className='sync-status '+kind;
  statusBox.hidden=false;
}

function hideStatus(){
  statusBox.hidden=true;
}

function money(value){
  const n=Number(value);
  return Number.isFinite(n)
    ? n.toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:2})
    : '—';
}

function finiteValues(rows,field){
  return rows.map(row=>Number(row?.[field])).filter(Number.isFinite);
}

function average(values){
  if(!values.length) return null;
  return values.reduce((sum,value)=>sum+value,0)/values.length;
}

function percent(value,total){
  if(!total) return 0;
  return Math.round((value/total)*100);
}

function setText(id,value){
  const node=document.querySelector(id);
  if(node) node.textContent=String(value);
}

function renderBars(targetId,items,total){
  const target=document.querySelector(targetId);
  target.innerHTML='';
  for(const item of items){
    const row=document.createElement('div');
    row.className='analytics-bar-row';

    const head=document.createElement('div');
    head.className='analytics-bar-head';
    const label=document.createElement('span');
    label.textContent=item.label;
    const value=document.createElement('strong');
    const pct=percent(item.value,total);
    value.textContent=item.value+' • '+pct+'%';
    head.append(label,value);

    const track=document.createElement('div');
    track.className='analytics-bar-track';
    const fill=document.createElement('div');
    fill.className='analytics-bar-fill';
    fill.style.width=pct+'%';
    track.appendChild(fill);

    row.append(head,track);
    target.appendChild(row);
  }
}

function renderSource(auction){
  const box=document.querySelector('#analyticsSource');
  box.hidden=!auction;
  if(!auction) return;

  setText('#analyticsTitle',auction.title||'Leilão');
  setText('#analyticsReference',auction.reference ? 'Referência: '+auction.reference : 'Referência não informada');

  const badge=document.querySelector('#analyticsSourceBadge');
  const official=auction.source_type==='official';
  badge.textContent=official ? 'Fonte oficial' : 'Dados inseridos pelo usuário';
  badge.className='source-badge '+(official?'official-source':'user-source');

  const link=document.querySelector('#analyticsOfficialLink');
  if(official && auction.official_url){
    link.href=auction.official_url;
    link.hidden=false;
  }else{
    link.hidden=true;
  }
}

function renderPreferences(lots){
  preferenceRows.innerHTML='';
  const preferred=lots.filter(lot=>Number(lot.preference_level)>0)
    .sort((a,b)=>Number(b.preference_level)-Number(a.preference_level) || Number(a.lot_number)-Number(b.lot_number));

  preferenceEmpty.hidden=preferred.length>0;
  for(const lot of preferred.slice(0,100)){
    const tr=document.createElement('tr');
    const values=[
      String(lot.lot_number||'—'),
      lot.vehicle||lot.brand_model||'—',
      money(lot.fipe_value),
      money(lot.minimum_bid),
      money(lot.max_bid),
      lot.sold ? (lot.result||'Leiloado') : 'Aguardando'
    ];
    for(const value of values){
      const td=document.createElement('td');
      td.textContent=value;
      tr.appendChild(td);
    }
    preferenceRows.appendChild(tr);
  }
}

function renderMetrics(lots){
  const total=lots.length;
  const sold=lots.filter(lot=>Boolean(lot.sold)).length;
  const waiting=total-sold;
  const preferences=lots.filter(lot=>Number(lot.preference_level)>0).length;

  setText('#metricTotal',total);
  setText('#metricWaiting',waiting);
  setText('#metricPreference',preferences);
  setText('#metricSold',sold);

  const sets=[
    ['fipe_value','#avgFipe','#countFipe'],
    ['minimum_bid','#avgMinimum','#countMinimum'],
    ['max_bid','#avgMax','#countMax'],
    ['final_value','#avgFinal','#countFinal']
  ];

  for(const [field,valueId,countId] of sets){
    const values=finiteValues(lots,field);
    const avg=average(values);
    setText(valueId,avg==null?'—':money(avg));
    setText(countId,values.length ? values.length+' lote(s) com valor' : 'nenhum valor informado');
  }

  renderBars('#statusBars',[
    {label:'Aguardando',value:waiting},
    {label:'Preferência/prioridade',value:preferences},
    {label:'Leiloados',value:sold}
  ],total);

  renderBars('#coverageBars',[
    {label:'FIPE',value:finiteValues(lots,'fipe_value').length},
    {label:'Lance mínimo',value:finiteValues(lots,'minimum_bid').length},
    {label:'Nosso máximo',value:finiteValues(lots,'max_bid').length},
    {label:'Valor final',value:finiteValues(lots,'final_value').length}
  ],total);

  renderPreferences(lots);
}

async function fetchLots(auctionId){
  const rows=[];
  const pageSize=500;
  let from=0;
  while(true){
    const {data,error}=await client.from('lots')
      .select('lot_number,vehicle,brand_model,preference_level,sold,result,fipe_value,minimum_bid,max_bid,final_value,source_type,source_evidence')
      .eq('auction_id',auctionId)
      .order('lot_number',{ascending:true})
      .range(from,from+pageSize-1);
    if(error) throw error;
    rows.push(...(data||[]));
    if(!data || data.length<pageSize) break;
    from+=pageSize;
  }
  return rows;
}

async function loadAuction(){
  hideStatus();
  const auction=auctions.find(item=>item.id===select.value);
  renderSource(auction);
  if(!auction){
    renderMetrics([]);
    return;
  }
  setStatus('Carregando dados relacionais protegidos pela sua conta…','info');
  try{
    const lots=await fetchLots(auction.id);
    renderMetrics(lots);
    setStatus(lots.length ? lots.length+' lote(s) analisado(s) a partir do banco canônico.' : 'Este leilão ainda não possui lotes relacionais.','ok');
  }catch(error){
    console.error(error);
    renderMetrics([]);
    setStatus('Não foi possível carregar os lotes para análise: '+(error?.message||error),'error');
  }
}

async function boot(){
  if(!cfg.url || !cfg.publishableKey) return setStatus('Configuração Supabase não encontrada.','error');
  client=createClient(cfg.url,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});

  const {data:{user},error:userError}=await client.auth.getUser();
  if(userError || !user?.id) return setStatus('Entre na sua conta para visualizar análises.','warn');
  if(!user.email_confirmed_at) return setStatus('Confirme seu e-mail antes de consultar as análises.','warn');

  const {data,error}=await client.from('auctions')
    .select('id,title,reference,source_type,source_label,official_url,source_evidence,auction_date')
    .order('created_at',{ascending:false});
  if(error) return setStatus('Não foi possível carregar seus leilões: '+(error.message||error),'error');

  auctions=data||[];
  select.innerHTML='';
  if(!auctions.length){
    const option=document.createElement('option');
    option.value='';
    option.textContent='Nenhum leilão disponível';
    select.appendChild(option);
    select.disabled=true;
    renderMetrics([]);
    return setStatus('Sua conta ainda não possui leilões relacionais visíveis.','warn');
  }

  for(const auction of auctions){
    const option=document.createElement('option');
    option.value=auction.id;
    option.textContent=auction.title || 'Leilão';
    select.appendChild(option);
  }
  select.disabled=false;
  await loadAuction();
}

select.addEventListener('change',loadAuction);
await boot();
