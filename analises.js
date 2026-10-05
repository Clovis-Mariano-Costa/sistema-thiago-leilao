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
  return rows
    .map(row=>row?.[field])
    .filter(value=>value!==null && value!==undefined && String(value).trim()!=='')
    .map(Number)
    .filter(Number.isFinite);
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

function fipeCandidateValues(row){
  const candidates=Array.isArray(row?.extra_data?.fipe_candidates) ? row.extra_data.fipe_candidates : [];
  return candidates
    .map(candidate=>Number(candidate?.value_brl ?? candidate?.value ?? candidate?.fipe_value))
    .filter(Number.isFinite);
}

function fipeDisplay(row){
  const raw=row?.fipe_value;
  const definitive=(raw===null || raw===undefined || String(raw).trim()==='') ? NaN : Number(raw);
  if(Number.isFinite(definitive)) return money(definitive);
  const candidates=fipeCandidateValues(row);
  if(candidates.length===1) return '1 referência FIPE';
  if(candidates.length>1) return candidates.length+' referências FIPE';
  return '—';
}

function renderPreferences(items){
  preferenceRows.innerHTML='';
  const preferred=items.filter(item=>Number(item.preference_level)>0)
    .sort((a,b)=>Number(b.preference_level)-Number(a.preference_level)
      || Number(a.lot_number)-Number(b.lot_number)
      || Number(a.item_order)-Number(b.item_order));

  preferenceEmpty.hidden=preferred.length>0;
  for(const item of preferred.slice(0,100)){
    const tr=document.createElement('tr');
    const itemId=item.item_identifier || ('Item '+(item.item_order||1));
    const values=[
      String(item.lot_number||'—')+' • '+itemId,
      item.vehicle||item.brand_model||item.description||'—',
      fipeDisplay(item),
      money(item.minimum_bid),
      money(item.max_bid),
      item.sold ? (item.result||'Leiloado') : 'Aguardando'
    ];
    for(const value of values){
      const td=document.createElement('td');
      td.textContent=value;
      tr.appendChild(td);
    }
    preferenceRows.appendChild(tr);
  }
}

function renderMetrics(items){
  const total=items.length;
  const sold=items.filter(item=>Boolean(item.sold)).length;
  const waiting=total-sold;
  const preferences=items.filter(item=>Number(item.preference_level)>0).length;

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
    const values=finiteValues(items,field);
    const avg=average(values);
    setText(valueId,avg==null?'—':money(avg));
    setText(countId,values.length ? values.length+' item(ns) com valor definido' : 'nenhum valor definido');
  }

  renderBars('#statusBars',[
    {label:'Aguardando',value:waiting},
    {label:'Preferência/prioridade',value:preferences},
    {label:'Leiloados',value:sold}
  ],total);

  const fipeDefined=finiteValues(items,'fipe_value').length;
  const fipeToReview=items.filter(item=>{
    const raw=item?.fipe_value;
    const definitive=(raw===null || raw===undefined || String(raw).trim()==='') ? NaN : Number(raw);
    return !Number.isFinite(definitive) && fipeCandidateValues(item).length>0;
  }).length;
  renderBars('#coverageBars',[
    {label:'FIPE definida',value:fipeDefined},
    {label:'FIPE para revisar',value:fipeToReview},
    {label:'Lance mínimo',value:finiteValues(items,'minimum_bid').length},
    {label:'Nosso máximo',value:finiteValues(items,'max_bid').length},
    {label:'Valor final',value:finiteValues(items,'final_value').length}
  ],total);

  renderPreferences(items);
}

async function fetchItems(auctionId){
  const lots=[];
  const pageSize=500;
  let from=0;
  while(true){
    const {data,error}=await client.from('lots')
      .select('id,lot_number')
      .eq('auction_id',auctionId)
      .order('lot_number',{ascending:true})
      .range(from,from+pageSize-1);
    if(error) throw error;
    lots.push(...(data||[]));
    if(!data || data.length<pageSize) break;
    from+=pageSize;
  }

  const lotNumberById=new Map(lots.map(row=>[row.id,row.lot_number]));
  const lotIds=lots.map(row=>row.id).filter(Boolean);
  const items=[];
  const chunkSize=250;

  for(let i=0;i<lotIds.length;i+=chunkSize){
    const ids=lotIds.slice(i,i+chunkSize);
    const {data,error}=await client.from('lot_items')
      .select('lot_id,item_order,item_identifier,description,vehicle,brand_model,preference_level,sold,result,fipe_value,minimum_bid,max_bid,final_value,extra_data')
      .in('lot_id',ids)
      .order('item_order',{ascending:true});
    if(error) throw error;
    for(const row of data||[]){
      items.push({...row,lot_number:lotNumberById.get(row.lot_id)});
    }
  }

  return items.sort((a,b)=>Number(a.lot_number)-Number(b.lot_number)||Number(a.item_order)-Number(b.item_order));
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
    const items=await fetchItems(auction.id);
    renderMetrics(items);
    setStatus(items.length ? items.length+' item(ns) analisado(s) a partir do banco canônico.' : 'Este leilão ainda não possui itens relacionais.','ok');
  }catch(error){
    console.error(error);
    renderMetrics([]);
    setStatus('Não foi possível carregar os itens para análise: '+(error?.message||error),'error');
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
