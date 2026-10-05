import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const cfg=window.SUPABASE_CONFIG || {};
const statusBox=document.querySelector('#integrityStatus');
const gateBox=document.querySelector('#integrityGates');
const rowsBox=document.querySelector('#integrityAuctionRows');
const emptyBox=document.querySelector('#integrityAuctionEmpty');
const refreshBtn=document.querySelector('#refreshIntegrity');

let client=null;

function setStatus(message,kind='info'){
  statusBox.textContent=message;
  statusBox.className='sync-status '+kind;
  statusBox.hidden=false;
}

function setText(id,value){
  const node=document.querySelector(id);
  if(node) node.textContent=String(value);
}

function gate(label,state,detail){
  const row=document.createElement('div');
  row.className='integrity-gate '+state;
  const strong=document.createElement('strong');
  strong.textContent=label;
  const span=document.createElement('span');
  span.textContent=detail;
  row.append(strong,span);
  return row;
}

async function countVisible(table,apply){
  let query=client.from(table).select('*',{count:'exact',head:true});
  if(apply) query=apply(query);
  const {count,error}=await query;
  if(error) throw error;
  return Number(count)||0;
}

async function fetchAllLots(){
  const rows=[];
  let from=0;
  const size=500;
  while(true){
    const {data,error}=await client.from('lots')
      .select('id,auction_id,lot_number,source_type')
      .order('lot_number',{ascending:true})
      .range(from,from+size-1);
    if(error) throw error;
    rows.push(...(data||[]));
    if(!data || data.length<size) break;
    from+=size;
  }
  return rows;
}

async function fetchAllItems(){
  const rows=[];
  let from=0;
  const size=500;
  while(true){
    const {data,error}=await client.from('lot_items')
      .select('id,lot_id,source_type')
      .range(from,from+size-1);
    if(error) throw error;
    rows.push(...(data||[]));
    if(!data || data.length<size) break;
    from+=size;
  }
  return rows;
}

function renderTable(auctions,lots,items){
  rowsBox.innerHTML='';
  const lotsByAuction=new Map();
  for(const lot of lots){
    if(!lotsByAuction.has(lot.auction_id)) lotsByAuction.set(lot.auction_id,[]);
    lotsByAuction.get(lot.auction_id).push(lot);
  }
  const lotToAuction=new Map(lots.map(lot=>[lot.id,lot.auction_id]));
  const itemsByAuction=new Map();
  for(const item of items){
    const auctionId=lotToAuction.get(item.lot_id);
    if(!auctionId) continue;
    itemsByAuction.set(auctionId,(itemsByAuction.get(auctionId)||0)+1);
  }

  emptyBox.hidden=auctions.length>0;
  for(const auction of auctions){
    const tr=document.createElement('tr');
    const source=auction.source_type==='official'?'Fonte oficial':'Dados do usuário';
    const values=[
      auction.title||'Leilão',
      source,
      String((lotsByAuction.get(auction.id)||[]).length),
      String(itemsByAuction.get(auction.id)||0),
      auction.reference||'—'
    ];
    for(const value of values){
      const td=document.createElement('td');
      td.textContent=value;
      tr.appendChild(td);
    }
    rowsBox.appendChild(tr);
  }
}

async function loadIntegrity(){
  refreshBtn.disabled=true;
  setStatus('Verificando estado relacional e evidências visíveis pela sua sessão…','info');
  gateBox.innerHTML='';

  try{
    const {data:{user},error:userError}=await client.auth.getUser();
    if(userError || !user?.id){
      setStatus('Entre na sua conta para executar a verificação de integridade.','warn');
      return;
    }
    if(!user.email_confirmed_at){
      setStatus('Confirme seu e-mail antes de consultar o estado protegido.','warn');
      return;
    }

    const [auctionResult,lots,items,snapshotResult,runCount,docCount,memberCount,inviteCount]=await Promise.all([
      client.from('auctions')
        .select('id,title,reference,source_type,source_label,official_url,created_at')
        .order('created_at',{ascending:false}),
      fetchAllLots(),
      fetchAllItems(),
      client.from('user_state_snapshots')
        .select('state_version,last_client_change,source_origin')
        .eq('user_id',user.id)
        .maybeSingle(),
      countVisible('source_search_runs'),
      countVisible('source_documents'),
      countVisible('auction_members'),
      countVisible('invitations')
    ]);

    if(auctionResult.error) throw auctionResult.error;
    if(snapshotResult.error) throw snapshotResult.error;

    const auctions=auctionResult.data||[];
    const officialIds=new Set(auctions.filter(a=>a.source_type==='official').map(a=>a.id));
    const officialLotRows=lots.filter(lot=>officialIds.has(lot.auction_id));
    const officialLotIds=new Set(officialLotRows.map(lot=>lot.id));
    const officialItemRows=items.filter(item=>officialLotIds.has(item.lot_id));

    const snapshot=snapshotResult.data||null;
    setText('#snapshotState',snapshot?'OK':'—');
    setText('#snapshotMeta',snapshot
      ? 'versão '+(snapshot.state_version||'—')+' • '+(snapshot.last_client_change||'sem data')
      : 'nenhum snapshot visível');

    setText('#officialAuctions',officialIds.size);
    setText('#officialLots',officialLotRows.length);
    setText('#officialItems',officialItemRows.length);
    setText('#sourceRuns',runCount);
    setText('#sourceDocuments',docCount);
    setText('#memberships',memberCount);
    setText('#invitations',inviteCount);

    renderTable(auctions,lots,items);

    gateBox.append(
      gate('Backup online',snapshot?'ok':'pending',snapshot?'Snapshot próprio encontrado.':'Ainda não há snapshot próprio visível.'),
      gate('Canonização relacional oficial',officialIds.size?'ok':'pending',officialIds.size
        ? officialIds.size+' leilão(ões) oficial(is), '+officialLotRows.length+' lote(s) e '+officialItemRows.length+' item(ns) no banco canônico.'
        : 'Nenhum leilão source_type=official visível. Uma nova importação oficial é necessária para demonstrar o POST do ST-MNM-22.'),
      gate('Observabilidade de fonte',(runCount&&docCount)?'ok':'pending',(runCount&&docCount)
        ? runCount+' execução(ões) e '+docCount+' documento(s) visíveis.'
        : 'Ainda faltam run/documento observáveis após uma importação executada com ST-MNM-23B publicado.'),
      gate('Participantes / convites',(memberCount||inviteCount)?'partial':'pending',(memberCount||inviteCount)
        ? 'Há registros visíveis; o smoke de papéis ainda depende da conferência humana completa.'
        : 'Nenhuma participação/convite visível nesta sessão; ST-MNM-24B continua sem prova humana.'),
      gate('Modo ao Vivo','pending','ST-MNM-25B depende de smoke humano no celular e confirmação após refresh.')
    );

    const pending=[
      !snapshot,
      officialIds.size===0,
      runCount===0 || docCount===0,
      memberCount===0 && inviteCount===0
    ].filter(Boolean).length;

    setStatus(pending
      ? 'Verificação concluída: '+pending+' grupo(s) de evidência ainda precisam de POST/gate humano.'
      : 'Verificação concluída: camadas automáticas observáveis estão presentes; permanecem apenas gates humanos específicos.','ok');
  }catch(error){
    console.error(error);
    setStatus('Falha na verificação de integridade: '+(error?.message||error),'error');
  }finally{
    refreshBtn.disabled=false;
  }
}

async function boot(){
  if(!cfg.url || !cfg.publishableKey) return setStatus('Configuração Supabase não encontrada.','error');
  client=createClient(cfg.url,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  await loadIntegrity();
}

refreshBtn.addEventListener('click',loadIntegrity);
await boot();
