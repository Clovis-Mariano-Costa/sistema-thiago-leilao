import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const cfg=window.SUPABASE_CONFIG || {};
const statusBox=document.querySelector('#integrityStatus');
const gateBox=document.querySelector('#integrityGates');
const rowsBox=document.querySelector('#integrityAuctionRows');
const emptyBox=document.querySelector('#integrityAuctionEmpty');
const parityRowsBox=document.querySelector('#integrityParityRows');
const parityEmptyBox=document.querySelector('#integrityParityEmpty');
const sourceRowsBox=document.querySelector('#integritySourceRows');
const sourceEmptyBox=document.querySelector('#integritySourceEmpty');
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

function latestIso(rows,field){
  let latest='';
  for(const row of rows){
    const value=String(row?.[field]||'');
    if(value && (!latest || value>latest)) latest=value;
  }
  return latest;
}

const sourceCatalogById=new Map(
  (window.SISTEMA_THIAGO_OFFICIAL_SOURCES||[]).map(source=>[source.id,source])
);

function sourceCapability(source){
  const declared=sourceCatalogById.get(source.id)||{};
  const backendConnector=String(source?.extra_data?.lotsConnector||'').trim();
  const catalogConnector=String(declared.lotsConnector||'').trim();

  if(backendConnector && catalogConnector && backendConnector!==catalogConnector){
    return {
      key:'drift',
      label:'Divergência de capability',
      detail:'backend '+backendConnector+' ≠ catálogo '+catalogConnector,
      next:'Não executar automaticamente. Reconciliar backend e catálogo antes de nova importação.'
    };
  }

  const connector=backendConnector||catalogConnector;
  if(connector){
    return {
      key:'connector',
      label:'Conector comprovado',
      detail:connector+(backendConnector?' • backend':' • catálogo'),
      next:'Executar pela tela Fontes oficiais com sessão autenticada e conferir run + documento + paridade.'
    };
  }

  const status=String(source.status||declared.status||'').toUpperCase();
  if(status==='VALIDAR_ROTA'){
    return {
      key:'validate',
      label:'Rota a validar',
      detail:'sem conector',
      next:'Validar a rota oficial antes de qualquer automação; manter consulta assistida até haver adaptador comprovado.'
    };
  }

  if(status==='MONITORAR'){
    return {
      key:'monitor',
      label:'Monitoramento assistido',
      detail:'sem conector',
      next:'Rever publicação oficial manualmente; só automatizar após caso real, parser específico e proveniência.'
    };
  }

  return {
    key:'assisted',
    label:'Consulta assistida',
    detail:'sem conector',
    next:'Consultar a fonte oficial pela interface; não promover dado sem evidência backend e origem preservada.'
  };
}

function runLifecycle(rows){
  const sourceRuns=Array.isArray(rows)?rows:[];
  const ordered=[...sourceRuns].sort((a,b)=>
    String(a?.started_at||'').localeCompare(String(b?.started_at||'')));
  const latest=ordered.at(-1)||null;
  return {
    latest,
    success:sourceRuns.filter(row=>row.status==='success').length,
    active:sourceRuns.filter(row=>row.status==='started' && !row.finished_at).length,
    error:sourceRuns.filter(row=>row.status==='error').length,
    partial:sourceRuns.filter(row=>row.status==='partial').length
  };
}

function renderSourceObservability(sources,runs,documents){
  sourceRowsBox.innerHTML='';
  const active=(sources||[]).filter(source=>source.active!==false);
  sourceEmptyBox.hidden=active.length>0;
  const coverage=new Set();
  let connectorPending=0;
  let capabilityDrift=0;
  let activeRuns=0;
  let sourcesWithErrors=0;

  for(const source of active){
    const sourceRuns=(runs||[]).filter(row=>row.source_id===source.id);
    const sourceDocs=(documents||[]).filter(row=>row.source_id===source.id);
    const lifecycle=runLifecycle(sourceRuns);
    const complete=lifecycle.success>0 && sourceDocs.length>0;
    const capability=sourceCapability(source);
    if(complete) coverage.add(source.id);
    if(!complete && capability.key==='connector') connectorPending++;
    if(capability.key==='drift') capabilityDrift++;
    activeRuns+=lifecycle.active;
    if(lifecycle.error>0) sourcesWithErrors++;
    const latest=[latestIso(sourceRuns,'started_at'),latestIso(sourceDocs,'created_at')]
      .filter(Boolean)
      .sort()
      .at(-1)||'—';
    const tr=document.createElement('tr');
    const runSummary=String(sourceRuns.length)
      +' • ok '+lifecycle.success
      +' • ativos '+lifecycle.active
      +(lifecycle.error ? ' • erro '+lifecycle.error : '')
      +(lifecycle.partial ? ' • parcial '+lifecycle.partial : '');
    const state=lifecycle.active
      ? (complete?'Com prova backend • execução em andamento':'Execução em andamento')
      : complete
        ? 'Com prova backend'
        : lifecycle.error
          ? 'Sem prova backend • houve erro'
          : 'Sem telemetria';
    const next=lifecycle.active
      ? 'Aguardar finalizar a execução em andamento; não iniciar outra para a mesma fonte.'
      : complete
        ? 'Manter evidência atualizada quando houver nova execução oficial.'
        : capability.next;
    const values=[
      source.name||source.id,
      source.status||'—',
      capability.label+(capability.detail ? ' • '+capability.detail : ''),
      runSummary,
      String(sourceDocs.length),
      latest,
      state,
      next
    ];
    for(const value of values){
      const td=document.createElement('td');
      td.textContent=value;
      tr.appendChild(td);
    }
    sourceRowsBox.appendChild(tr);
  }

  return {
    active:active.length,
    covered:coverage.size,
    connectorPending,
    capabilityDrift,
    activeRuns,
    sourcesWithErrors
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
      auditRows,
      sourceRows,
      sourceRunRows,
      sourceDocumentRows
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
      fetchVisibleRows('audit_log','auction_id,entity_type,action,created_at','created_at'),
      fetchVisibleRows('official_sources','id,name,status,last_verified,active,extra_data','id'),
      fetchVisibleRows('source_search_runs','source_id,status,found_count,started_at,finished_at','started_at'),
      fetchVisibleRows('source_documents','source_id,created_at,document_url','created_at')
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

    const sourceCoverage=renderSourceObservability(sourceRows,sourceRunRows,sourceDocumentRows);
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
      gate('Observabilidade de fonte',
        sourceCoverage.active>0 && sourceCoverage.covered===sourceCoverage.active
          ? 'ok'
          : (sourceCoverage.covered?'partial':'pending'),
        sourceCoverage.active
          ? sourceCoverage.covered+'/'+sourceCoverage.active+' fonte(s) ativa(s) possuem run + documento visíveis. '
            +sourceCoverage.connectorPending+' fonte(s) com conector comprovado ainda aguardam nova execução governada. '
            +sourceCoverage.capabilityDrift+' divergência(s) backend ↔ catálogo. '
            +sourceCoverage.activeRuns+' execução(ões) em andamento; '
            +sourceCoverage.sourcesWithErrors+' fonte(s) com erro histórico. '
            +'Totais: '+runCount+' execução(ões), '+docCount+' documento(s).'
          : 'Nenhuma fonte ativa visível para medir telemetria.'),
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
      sourceCoverage.active===0 || sourceCoverage.covered<sourceCoverage.active,
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
