import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const cfg=window.SUPABASE_CONFIG || {};
const statusBox=document.querySelector('#integrityStatus');
const gateBox=document.querySelector('#integrityGates');
const rowsBox=document.querySelector('#integrityAuctionRows');
const emptyBox=document.querySelector('#integrityAuctionEmpty');
const parityRowsBox=document.querySelector('#integrityParityRows');
const parityEmptyBox=document.querySelector('#integrityParityEmpty');
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

async function fetchVisibleRows(table,columns,orderColumn){
  const rows=[];
  let from=0;
  const size=500;
  while(true){
    let query=client.from(table).select(columns);
    if(orderColumn) query=query.order(orderColumn,{ascending:true});
    const {data,error}=await query.range(from,from+size-1);
    if(error) throw error;
    rows.push(...(data||[]));
    if(!data || data.length<size) break;
    from+=size;
  }
  return rows;
}

async function fetchAllLots(){
  return fetchVisibleRows('lots','id,auction_id,lot_number,source_type','lot_number');
}

async function fetchAllItems(){
  return fetchVisibleRows('lot_items','id,lot_id,source_type');
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

function normalizedSignature(value){
  return String(value||'').trim().toLowerCase();
}

function snapshotLotCount(state){
  return (state?.auctions||[]).reduce((total,auction)=>
    total+(Array.isArray(auction?.lots)?auction.lots.length:0),0);
}

function renderSnapshotParity(snapshotState,auctions,lots){
  parityRowsBox.innerHTML='';
  const snapshotAuctions=Array.isArray(snapshotState?.auctions)?snapshotState.auctions:[];
  const lotsByAuction=new Map();
  for(const lot of lots){
    lotsByAuction.set(lot.auction_id,(lotsByAuction.get(lot.auction_id)||0)+1);
  }

  const byId=new Map(auctions.map(auction=>[auction.id,auction]));
  const byOfficialResult=new Map();
  const bySignature=new Map();
  for(const auction of auctions){
    const resultId=String(auction?.source_evidence?.officialResultId||'').trim();
    if(resultId) byOfficialResult.set(resultId,auction);
    const signature=normalizedSignature(auction.title)+'|'+normalizedSignature(auction.reference);
    if(signature!=='|') bySignature.set(signature,auction);
  }

  let gaps=0;
  const matchedRelationalIds=new Set();
  parityEmptyBox.hidden=snapshotAuctions.length===0 && auctions.length===0;

  for(const snapshotAuction of snapshotAuctions){
    const hinted=String(snapshotAuction?.extraFields?.relationalAuctionId||'').trim();
    const resultId=String(snapshotAuction?.sourceEvidence?.officialResultId||'').trim();
    const signature=normalizedSignature(snapshotAuction?.title)+'|'+normalizedSignature(snapshotAuction?.reference);
    const relational=(hinted && byId.get(hinted))
      || (resultId && byOfficialResult.get(resultId))
      || bySignature.get(signature)
      || null;

    const snapshotLots=Array.isArray(snapshotAuction?.lots)?snapshotAuction.lots.length:0;
    const relationalLots=relational ? (lotsByAuction.get(relational.id)||0) : null;
    const aligned=relational && relationalLots===snapshotLots;
    if(relational?.id) matchedRelationalIds.add(relational.id);
    if(!aligned) gaps++;

    const tr=document.createElement('tr');
    const values=[
      snapshotAuction?.title||snapshotAuction?.reference||'Leilão',
      String(snapshotLots),
      relational ? String(relationalLots) : '—',
      aligned ? 'Alinhado' : (relational ? 'Divergente' : 'Somente snapshot')
    ];
    for(const value of values){
      const td=document.createElement('td');
      td.textContent=value;
      tr.appendChild(td);
    }
    parityRowsBox.appendChild(tr);
  }

  for(const relational of auctions){
    if(matchedRelationalIds.has(relational.id)) continue;
    gaps++;
    const tr=document.createElement('tr');
    const values=[
      relational.title||relational.reference||'Leilão',
      '—',
      String(lotsByAuction.get(relational.id)||0),
      'Somente relacional'
    ];
    for(const value of values){
      const td=document.createElement('td');
      td.textContent=value;
      tr.appendChild(td);
    }
    parityRowsBox.appendChild(tr);
  }

  return {
    snapshotAuctions:snapshotAuctions.length,
    snapshotLots:snapshotLotCount(snapshotState),
    gaps
  };
}

function roleReadiness(userId,auctions,memberships){
  const expected=['owner','admin','participant','observer'];
  const demonstrated=new Set();
  if(auctions.some(a=>a.owner_id===userId)) demonstrated.add('owner');
  for(const row of memberships){
    if(expected.includes(row.role)) demonstrated.add(row.role);
  }
  return {
    demonstrated:expected.filter(role=>demonstrated.has(role)),
    missing:expected.filter(role=>!demonstrated.has(role))
  };
}

function countBy(rows,key){
  const counts={};
  for(const row of rows){
    const value=row?.[key]||'desconhecido';
    counts[value]=(counts[value]||0)+1;
  }
  return counts;
}

function formatCounts(counts){
  const entries=Object.entries(counts);
  return entries.length?entries.map(([key,value])=>key+': '+value).join(' • '):'nenhum';
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

    const [
      auctionResult,
      lots,
      items,
      snapshotResult,
      runCount,
      docCount,
      memberships,
      invitations,
      auditRows
    ]=await Promise.all([
      client.from('auctions')
        .select('id,owner_id,title,reference,source_type,source_label,official_url,source_evidence,created_at')
        .order('created_at',{ascending:false}),
      fetchAllLots(),
      fetchAllItems(),
      client.from('user_state_snapshots')
        .select('state,state_version,last_client_change,source_origin')
        .eq('user_id',user.id)
        .maybeSingle(),
      countVisible('source_search_runs'),
      countVisible('source_documents'),
      fetchVisibleRows('auction_members','auction_id,user_id,role,created_at','created_at'),
      fetchVisibleRows('invitations','auction_id,role,status,expires_at,created_at','created_at'),
      fetchVisibleRows('audit_log','auction_id,entity_type,action,created_at','created_at')
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
    setText('#memberships',memberships.length);
    setText('#invitations',invitations.length);
    setText('#accessAudit',auditRows.length);

    renderTable(auctions,lots,items);
    const parity=renderSnapshotParity(snapshot?.state||null,auctions,lots);
    setText('#snapshotAuctions',parity.snapshotAuctions);
    setText('#snapshotLots',parity.snapshotLots);

    const roles=roleReadiness(user.id,auctions,memberships);
    const invitationStatuses=countBy(invitations,'status');
    const auditActions=countBy(auditRows,'action');
    const requiredAuditActions=['invitation.created','invitation.accepted','invitation.revoked'];
    const missingAuditActions=requiredAuditActions.filter(action=>!auditActions[action]);

    gateBox.append(
      gate('Backup online',snapshot?'ok':'pending',snapshot?'Snapshot próprio encontrado.':'Ainda não há snapshot próprio visível.'),
      gate('Paridade snapshot ↔ relacional',!snapshot?'pending':(parity.gaps?'partial':'ok'),!snapshot
        ? 'Sem snapshot próprio para comparar.'
        : parity.gaps
          ? parity.gaps+' leilão(ões) do snapshot ainda não coincidem com a camada relacional.'
          : 'Todos os leilões do snapshot coincidem com as contagens relacionais visíveis.'),
      gate('Canonização relacional oficial',officialIds.size?'ok':'pending',officialIds.size
        ? officialIds.size+' leilão(ões) oficial(is), '+officialLotRows.length+' lote(s) e '+officialItemRows.length+' item(ns) no banco canônico.'
        : 'Nenhum leilão source_type=official visível. Uma nova importação oficial é necessária para demonstrar o POST do ST-MNM-22.'),
      gate('Observabilidade de fonte',(runCount&&docCount)?'ok':'pending',(runCount&&docCount)
        ? runCount+' execução(ões) e '+docCount+' documento(s) visíveis.'
        : 'Ainda faltam run/documento observáveis após uma importação executada com ST-MNM-23B publicado.'),
      gate('Matriz de papéis do P2',roles.missing.length===0?'ok':(roles.demonstrated.length?'partial':'pending'),
        'Demonstrados nesta sessão: '+(roles.demonstrated.join(', ')||'nenhum')+
        '. Faltam: '+(roles.missing.join(', ')||'nenhum')+
        '. A presença automática não substitui o smoke humano de permissões.'),
      gate('Convites / auditoria do P2',
        invitations.length && auditRows.length && missingAuditActions.length===0?'ok':(invitations.length||auditRows.length?'partial':'pending'),
        'Convites por estado: '+formatCounts(invitationStatuses)+
        '. Auditoria visível: '+auditRows.length+' evento(s). Ações faltantes para a trilha mínima: '+
        (missingAuditActions.join(', ')||'nenhuma')+'.'),
      gate('Modo ao Vivo','pending','ST-MNM-25B depende de smoke humano no celular e confirmação após refresh.')
    );

    const pending=[
      !snapshot,
      parity.gaps>0,
      officialIds.size===0,
      runCount===0 || docCount===0,
      roles.missing.length>0,
      invitations.length===0 || auditRows.length===0 || missingAuditActions.length>0
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
