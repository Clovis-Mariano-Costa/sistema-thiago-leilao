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
function hideStatus(){ statusBox.hidden=true; }

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
function percent(value,total){ return total ? Math.round((value/total)*100) : 0; }
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

function itemIdentifier(row){
  return String(row?.item_identifier || ('ST-L'+String(row?.lot_number||0).padStart(3,'0')+'-I'+String(row?.item_order||1).padStart(2,'0')));
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
    const values=[
      String(item.lot_number||'—'),
      'Item '+String(item.item_order||1)+' • '+itemIdentifier(item),
      item.vehicle||item.description||item.brand_model||'—',
      money(item.fipe_value),
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
    ['fipe_value','#avgFipe','#countFipe','item(ns) com FIPE'],
    ['minimum_bid','#avgMinimum','#countMinimum','item(ns) com mínimo'],
    ['max_bid','#avgMax','#countMax','item(ns) com nosso máximo'],
    ['final_value','#avgFinal','#countFinal','item(ns) com valor final']
  ];
  for(const [field,valueId,countId,label] of sets){
    const values=finiteValues(items,field);
    const avg=average(values);
    setText(valueId,avg==null?'—':money(avg));
    setText(countId,values.length ? values.length+' '+label : 'nenhum valor informado');
  }

  renderBars('#statusBars',[
    {label:'Aguardando',value:waiting},
    {label:'Preferência/prioridade',value:preferences},
    {label:'Leiloados',value:sold}
  ],total);

  renderBars('#coverageBars',[
    {label:'FIPE',value:finiteValues(items,'fipe_value').length},
    {label:'Lance mínimo',value:finiteValues(items,'minimum_bid').length},
    {label:'Nosso máximo',value:finiteValues(items,'max_bid').length},
    {label:'Valor final',value:finiteValues(items,'final_value').length}
  ],total);

  renderPreferences(items);
}

function normalizeMapLocation(auction,items){
  const direct=String(auction?.location||'').trim();
  if(direct && !/^(brasil|santa catarina|sc)$/i.test(direct)) return direct;

  const counts=new Map();
  for(const item of items){
    const city=String(item?.city||'').trim();
    const state=String(item?.state||'').trim();
    const label=[city,state].filter(Boolean).join(', ');
    if(!city || !label) continue;
    counts.set(label,(counts.get(label)||0)+1);
  }
  const common=[...counts.entries()].sort((a,b)=>b[1]-a[1])[0]?.[0]||'';
  return common || direct;
}

function renderMap(auction,items){
  const label=document.querySelector('#analyticsMapLabel');
  const wrap=document.querySelector('#analyticsMapWrap');
  const frame=document.querySelector('#analyticsMapFrame');
  const link=document.querySelector('#analyticsMapLink');
  const empty=document.querySelector('#analyticsMapEmpty');
  const locationLabel=normalizeMapLocation(auction,items);

  if(!locationLabel){
    label.textContent='A fonte ainda não trouxe cidade, pátio ou endereço suficiente para localizar este leilão.';
    wrap.hidden=true;
    empty.hidden=false;
    frame.removeAttribute('src');
    return;
  }

  label.textContent='Localização informada/derivada dos dados do leilão: '+locationLabel;
  const query=encodeURIComponent(locationLabel);
  frame.src='https://www.google.com/maps?q='+query+'&output=embed';
  link.href='https://www.google.com/maps/search/?api=1&query='+query;
  wrap.hidden=false;
  empty.hidden=true;
}

async function fetchLots(auctionId){
  const rows=[];
  const pageSize=500;
  let from=0;
  while(true){
    const {data,error}=await client.from('lots')
      .select('id,lot_number')
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

async function fetchItems(auctionId){
  const lots=await fetchLots(auctionId);
  const lotById=new Map(lots.map(row=>[row.id,Number(row.lot_number)]));
  const ids=lots.map(row=>row.id);
  const items=[];
  const chunkSize=180;

  for(let i=0;i<ids.length;i+=chunkSize){
    const chunk=ids.slice(i,i+chunkSize);
    const {data,error}=await client.from('lot_items')
      .select('id,lot_id,item_order,item_identifier,description,vehicle,brand_model,city,state,preference_level,sold,result,fipe_value,minimum_bid,max_bid,final_value')
      .in('lot_id',chunk)
      .order('item_order',{ascending:true});
    if(error) throw error;
    for(const row of data||[]){
      items.push({...row,lot_number:lotById.get(row.lot_id)||0});
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
    renderMap(null,[]);
    return;
  }

  setStatus('Carregando itens relacionais protegidos pela sua conta…','info');
  try{
    const items=await fetchItems(auction.id);
    renderMetrics(items);
    renderMap(auction,items);
    setStatus(items.length ? items.length+' item(ns) analisado(s) a partir do banco canônico.' : 'Este leilão ainda não possui itens relacionais.','ok');
  }catch(error){
    console.error(error);
    renderMetrics([]);
    renderMap(auction,[]);
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
    .select('id,title,reference,location,source_type,source_label,official_url,source_evidence,auction_date,extra_data')
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
    renderMap(null,[]);
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
