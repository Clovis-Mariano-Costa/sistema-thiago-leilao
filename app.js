const STORAGE_KEY_BASE = 'sistema-thiago-v4';
const LEGACY_STORAGE_KEY = 'sistema-thiago-v3';
const LEGACY_KEY = 'sistema-thiago-leilao-v2';
const AUTH_SESSION_KEY = 'sistema-thiago-auth-session';

function currentSessionIdentity() {
  try {
    const parsed = JSON.parse(localStorage.getItem(AUTH_SESSION_KEY) || 'null');
    if (parsed?.authenticated && parsed?.uid) return String(parsed.uid);
  } catch {}
  return 'guest';
}

function storageKey() {
  return `${STORAGE_KEY_BASE}:${currentSessionIdentity()}`;
}

const BASE_LOTS = [
  [15,'Ranger'],[18,'Kombi'],[20,'Renault Master'],[26,'Palio Weekend'],[27,'Palio Weekend'],
  [29,'Palio Weekend'],[30,'Palio Weekend'],[32,'Palio Weekend'],[48,'Palio Weekend'],[54,'Palio Weekend'],
  [55,'Palio Weekend'],[56,'Blazer'],[96,'Spin'],[101,'EcoSport'],[103,'HB20'],[104,'Duster'],
  [113,'Sprinter'],[120,'Citroën Jumper'],[121,'Ranger'],[125,'S10'],[126,'Sprinter'],[131,'Palio Weekend'],
  [138,'Spin'],[139,'Palio Weekend'],[170,'Sprinter'],[171,'Sprinter'],[172,'Sprinter'],[177,'Sprinter'],
  [180,'Honda XRE 300'],[202,'Scania'],[231,'Spin'],[243,'S10'],[245,'Ranger'],[259,'Duster'],
  [304,'Hilux'],[328,'Ranger'],[338,'S10']
];

function freshItem(data = {}) {
  const pref=Math.max(0,Math.min(2,Number(data.preferenceLevel ?? data.preference_level ?? 0)||0));
  return {
    itemOrder: Math.max(1,Number(data.itemOrder ?? data.item_order ?? 1)||1),
    itemIdentifier: String(data.itemIdentifier || data.item_identifier || data.identifier || '').trim(),
    description: String(data.description || data.vehicle || '').trim(),
    vehicle: String(data.vehicle || data.description || '').trim(),
    type: String(data.type || data.itemType || data.item_type || '').trim(),
    plate: String(data.plate || '').trim().toUpperCase(),
    brandModel: String(data.brandModel || data.brand_model || '').trim(),
    chassis: String(data.chassis || '').trim(),
    engine: String(data.engine || '').trim(),
    year: String(data.year || data.modelYear || data.model_year || '').trim(),
    color: String(data.color || '').trim(),
    fuel: String(data.fuel || '').trim(),
    licensing: String(data.licensing || '').trim(),
    city: String(data.city || '').trim(),
    state: String(data.state || '').trim(),
    fipeValue: String(data.fipeValue ?? data.fipe_value ?? '').trim(),
    minimumBid: String(data.minimumBid ?? data.minimum_bid ?? '').trim(),
    maxBid: String(data.maxBid ?? data.max_bid ?? '').trim(),
    finalValue: String(data.finalValue ?? data.final_value ?? '').trim(),
    preferenceLevel: pref,
    sold: Boolean(data.sold),
    result: String(data.result || '').trim(),
    note: String(data.note || '').trim(),
    fipeCandidates: Array.isArray(data.fipeCandidates) ? data.fipeCandidates : [],
    sourceMediaLabel: String(data.sourceMediaLabel || data.source_media_label || '').trim(),
    photoDataUrl: String(data.photoDataUrl || '').trim(),
    sourceType: data.sourceType === 'official' || data.source_type === 'official' ? 'official' : 'user',
    sourceEvidence: data.sourceEvidence && typeof data.sourceEvidence === 'object'
      ? data.sourceEvidence
      : (data.source_evidence && typeof data.source_evidence === 'object' ? data.source_evidence : {}),
    extraFields: data.extraFields && typeof data.extraFields === 'object'
      ? data.extraFields
      : (data.extra_data && typeof data.extra_data === 'object' ? data.extra_data : {})
  };
}

function freshLot(n, vehicle, extra = {}) {
  return {
    n: Number(n),
    vehicle: vehicle || '',
    type: '',
    plate: '',
    brandModel: '',
    chassis: '',
    engine: '',
    year: '',
    color: '',
    fuel: '',
    fipeValue: '',
    minimumBid: '',
    maxBid: '',
    finalValue: '',
    preferenceLevel: 0,
    sold: false,
    result: '',
    note: '',
    sourceType: 'user',
    sourceLabel: 'Dados inseridos pelo usuário',
    officialUrl: '',
    photoDataUrl: '',
    items: vehicle ? [freshItem({ vehicle, ...extra })] : [],
    ...extra
  };
}

function defaultAuction() {
  return {
    id: 'thiago-base-inicial',
    title: 'Leilão Thiago — Base inicial',
    date: '',
    time: '',
    reference: 'Conversas e imagens enviadas pelo usuário — outubro/2026',
    location: '',
    sourceType: 'user',
    sourceLabel: 'Dados inseridos pelo usuário',
    officialUrl: '',
    photoDataUrl: '',
    notes: 'Base inicial criada a partir das informações fornecidas pelo usuário.',
    participants: ['thiago'],
    createdBy: 'thiago',
    createdAt: new Date().toISOString(),
    lots: BASE_LOTS.map(([n, vehicle]) => freshLot(n, vehicle))
  };
}

function defaultState() {
  const identity = currentSessionIdentity();
  return {
    version: 4,
    currentUserId: identity === 'guest' ? '' : identity,
    users: [],
    currentAuctionId: '',
    auctions: []
  };
}

function generatedItemIdentifier(lotNumber,itemOrder){
  return `ST-L${String(lotNumber).padStart(3,'0')}-I${String(itemOrder).padStart(2,'0')}`;
}

function normalizeLot(lot) {
  const n = Number(lot?.n ?? lot?.lotNumber ?? 0);
  const base = freshLot(n, lot?.vehicle || '');
  const merged = { ...base, ...(lot || {}) };
  if (typeof lot?.preference === 'boolean' && lot.preferenceLevel == null) {
    merged.preferenceLevel = lot.preference ? 1 : 0;
  }
  merged.preferenceLevel = Math.max(0, Math.min(2, Number(merged.preferenceLevel) || 0));
  merged.n = n;

  const rawItems = Array.isArray(lot?.items) ? lot.items : [];
  const fallbackItems = rawItems.length
    ? rawItems
    : (merged.vehicle || merged.plate || merged.brandModel || merged.chassis
      ? [{
          itemIdentifier: merged.itemIdentifier || '',
          vehicle: merged.vehicle,
          type: merged.type,
          plate: merged.plate,
          brandModel: merged.brandModel,
          chassis: merged.chassis,
          engine: merged.engine,
          year: merged.year,
          color: merged.color,
          fuel: merged.fuel,
          fipeValue: merged.fipeValue,
          minimumBid: merged.minimumBid,
          maxBid: merged.maxBid,
          finalValue: merged.finalValue,
          preferenceLevel: merged.preferenceLevel,
          sold: merged.sold,
          result: merged.result,
          note: merged.note
        }]
      : []);

  merged.items = fallbackItems.map((raw,index)=>{
    const item=freshItem({...raw,itemOrder:raw?.itemOrder ?? raw?.item_order ?? index+1});
    if(!item.itemIdentifier){
      item.itemIdentifier=generatedItemIdentifier(n,item.itemOrder);
      item.extraFields={
        ...(item.extraFields||{}),
        generatedIdentifier:true,
        generatedIdentifierOrigin:'sistema_thiago'
      };
    }
    item.sourceType=raw?.sourceType==='official' || raw?.source_type==='official' || merged.sourceType==='official' ? 'official' : 'user';
    return item;
  }).sort((a,b)=>a.itemOrder-b.itemOrder);

  if(merged.items.length===1){
    const primary=merged.items[0];
    primary.vehicle=primary.vehicle || merged.vehicle || '';
    primary.description=primary.description || primary.vehicle;
    primary.type=primary.type || merged.type || '';
    primary.plate=primary.plate || merged.plate || '';
    primary.brandModel=primary.brandModel || merged.brandModel || '';
    primary.chassis=primary.chassis || merged.chassis || '';
    primary.engine=primary.engine || merged.engine || '';
    primary.year=primary.year || merged.year || '';
    primary.color=primary.color || merged.color || '';
    primary.fuel=primary.fuel || merged.fuel || '';
    primary.fipeValue=primary.fipeValue || merged.fipeValue || '';
    primary.minimumBid=primary.minimumBid || merged.minimumBid || '';
    primary.maxBid=primary.maxBid || merged.maxBid || '';
    primary.finalValue=primary.finalValue || merged.finalValue || '';
    primary.preferenceLevel=Math.max(primary.preferenceLevel,merged.preferenceLevel);
    primary.sold=primary.sold || Boolean(merged.sold);
    primary.result=primary.result || merged.result || '';
    primary.note=primary.note || merged.note || '';

    merged.vehicle=primary.vehicle || primary.description || merged.vehicle;
    merged.type=primary.type || merged.type;
    merged.plate=primary.plate || merged.plate;
    merged.brandModel=primary.brandModel || merged.brandModel;
    merged.chassis=primary.chassis || merged.chassis;
    merged.engine=primary.engine || merged.engine;
    merged.year=primary.year || merged.year;
    merged.color=primary.color || merged.color;
    merged.fuel=primary.fuel || merged.fuel;
    merged.fipeValue=primary.fipeValue || merged.fipeValue;
    merged.minimumBid=primary.minimumBid || merged.minimumBid;
    merged.maxBid=primary.maxBid || merged.maxBid;
    merged.finalValue=primary.finalValue || merged.finalValue;
    merged.preferenceLevel=primary.preferenceLevel;
    merged.sold=primary.sold;
    merged.result=primary.result;
    merged.note=primary.note;
  } else if(merged.items.length>1){
    merged.preferenceLevel=Math.max(merged.preferenceLevel,...merged.items.map(item=>item.preferenceLevel||0));
    merged.sold=merged.items.every(item=>item.sold);
  }

  merged.sourceType = merged.sourceType === 'official' ? 'official' : 'user';
  merged.sourceLabel = merged.sourceType === 'official' ? 'Fonte oficial' : 'Dados inseridos pelo usuário';
  delete merged.preference;
  return merged;
}

function migrateLegacy() {
  // Migração automática entre contas foi desativada por segurança.
  // Os dados legados continuam preservados nas chaves antigas e só devem
  // ser importados por uma ação explícita do titular correto.
  return defaultState();
}

const OFFICIAL_RESULTS = Array.isArray(window.SISTEMA_THIAGO_OFFICIAL_RESULTS) ? window.SISTEMA_THIAGO_OFFICIAL_RESULTS : [];

function officialResultForAuction(auction) {
  if (!auction || auction.sourceType !== 'official') return null;
  const resultId = auction.sourceEvidence?.officialResultId;
  return OFFICIAL_RESULTS.find(item =>
    (resultId && item.id === resultId) ||
    (auction.reference && item.reference === auction.reference && (!auction.date || item.date === auction.date)) ||
    (auction.title && item.title === auction.title && (!auction.date || item.date === auction.date))
  ) || null;
}

function officialLotsFromResult(result) {
  if (!result || !Array.isArray(result.lots)) return [];
  return result.lots.map((lot,index) => normalizeLot({
    n: Number(lot.n ?? lot.lot ?? lot.numero ?? index + 1),
    vehicle: lot.vehicle || lot.item || lot.description || lot.descricao || lot.brandModel || lot.marcaModelo || '',
    type: lot.type || lot.tipo || '',
    plate: lot.plate || lot.placa || '',
    brandModel: lot.brandModel || lot.marcaModelo || lot['marca/modelo'] || '',
    chassis: lot.chassis || lot.chassi || '',
    engine: lot.engine || lot.motor || '',
    year: lot.year || lot.ano || '',
    color: lot.color || lot.cor || '',
    fuel: lot.fuel || lot.combustivel || '',
    minimumBid: lot.minimumBid || lot.lanceMinimo || lot.valorMinimo || '',
    fipeValue: lot.fipeValue || lot.valorFipe || '',
    sourceType: 'official',
    sourceLabel: 'Fonte oficial',
    officialUrl: result.officialUrl || '',
    extraFields: lot.extraFields || {}
  })).filter(lot => lot.n > 0);
}

function normalizeState(raw) {
  if (!raw || typeof raw !== 'object') return defaultState();
  const base = defaultState();
  const next = {
    version: 4,
    currentUserId: raw.currentUserId || (currentSessionIdentity() === 'guest' ? '' : currentSessionIdentity()),
    users: Array.isArray(raw.users) && raw.users.length ? raw.users : base.users,
    currentAuctionId: raw.currentAuctionId || base.currentAuctionId,
    auctions: Array.isArray(raw.auctions) ? raw.auctions : base.auctions
  };

  next.auctions = next.auctions.map(a => {
    const original = a || {};
    const official = original.sourceType === 'official' ? officialResultForAuction(original) : null;
    const existingLots = Array.isArray(original.lots) ? original.lots.map(normalizeLot).sort((x,y)=>x.n-y.n) : [];
    const importedLots = existingLots.length ? existingLots : officialLotsFromResult(official);
    const evidence = original.sourceEvidence || (official ? {
      officialResultId: official.id,
      sourceId: official.sourceId || '',
      sourceName: official.sourceName || '',
      agency: official.agency || '',
      foundAt: official.foundAt || '',
      officialUrl: official.officialUrl || '',
      queriedAt: new Date().toISOString(),
      lastVerified: official.lastChecked || ''
    } : null);

    return {
      ...original,
      id: original.id || crypto.randomUUID(),
      title: original.title || official?.title || 'Leilão sem título',
      date: original.date || official?.date || '',
      time: original.time || official?.time || '',
      reference: original.reference || official?.reference || 'Sem referência',
      location: original.location || official?.location || official?.scope || '',
      sourceType: original.sourceType === 'official' ? 'official' : 'user',
      sourceLabel: original.sourceType === 'official' ? 'Fonte oficial' : 'Dados inseridos pelo usuário',
      officialUrl: original.officialUrl || official?.officialUrl || '',
      officialPayload: original.officialPayload || official || null,
      sourceEvidence: evidence,
      extraFields: {
        ...((official?.extraFields && typeof official.extraFields === 'object') ? official.extraFields : {}),
        ...((original.extraFields && typeof original.extraFields === 'object') ? original.extraFields : {})
      },
      photoDataUrl: original.photoDataUrl || '',
      notes: original.notes || official?.object || '',
      participants: Array.isArray(original.participants) ? original.participants : (currentSessionIdentity() === 'guest' ? [] : [currentSessionIdentity()]),
      createdBy: original.createdBy || (currentSessionIdentity() === 'guest' ? '' : currentSessionIdentity()),
      createdAt: original.createdAt || new Date().toISOString(),
      lots: importedLots
    };
  });

  if (!next.auctions.some(a => a.id === next.currentAuctionId)) {
    next.currentAuctionId = next.auctions[0]?.id || '';
  }
  return next;
}

function loadState() {
  try {
    const key = storageKey();
    const raw = JSON.parse(localStorage.getItem(key) || 'null');
    const state = raw ? normalizeState(raw) : defaultState();
    localStorage.setItem(key, JSON.stringify(state));
    return state;
  } catch {
    return defaultState();
  }
}

let state = loadState();
let filter = 'all';
let query = '';
const liveCursorByAuction = new Map();
const itemCursorByLot = new Map();

const $ = sel => document.querySelector(sel);
const list = $('#lotList');
const template = $('#lotCardTemplate');
const searchInput = $('#searchInput');
const chooseAuctionDialog = $('#chooseAuctionDialog');
const newAuctionDialog = $('#newAuctionDialog');
const newLotDialog = $('#newLotDialog');
const bulkLotsDialog = $('#bulkLotsDialog');
const liveDialog = $('#liveDialog');
const photoViewerDialog = $('#photoViewerDialog');
const photoViewerImage = $('#photoViewerImage');
const photoViewerCaption = $('#photoViewerCaption');
const livePhotoButton = $('#livePhotoButton');
const livePhoto = $('#livePhoto');
const liveMaxBidInput = $('#liveMaxBidInput');

function syncLotRollupFromItems(lot) {
  if (!lot || !Array.isArray(lot.items) || !lot.items.length) return;
  const items=lot.items;
  lot.preferenceLevel=Math.max(...items.map(item=>Number(item.preferenceLevel)||0));
  lot.sold=items.every(item=>Boolean(item.sold));

  if(items.length!==1) return;
  const item=items[0];
  lot.vehicle=item.vehicle || item.description || lot.vehicle || '';
  lot.type=item.type || '';
  lot.plate=item.plate || '';
  lot.brandModel=item.brandModel || '';
  lot.chassis=item.chassis || '';
  lot.engine=item.engine || '';
  lot.year=item.year || '';
  lot.color=item.color || '';
  lot.fuel=item.fuel || '';
  lot.fipeValue=item.fipeValue || '';
  lot.minimumBid=item.minimumBid || '';
  lot.maxBid=item.maxBid || '';
  lot.finalValue=item.finalValue || '';
  lot.preferenceLevel=item.preferenceLevel || 0;
  lot.sold=Boolean(item.sold);
  lot.result=item.result || '';
  lot.note=item.note || '';
}

function saveState(showError = true) {
  try {
    state.auctions.forEach(a => (a.lots || []).forEach(syncLotRollupFromItems));
    const serialized = JSON.stringify(state);
    localStorage.setItem(storageKey(), serialized);
    window.dispatchEvent(new CustomEvent('sistema-thiago:state-saved',{detail:{key:storageKey(),state}}));
    return true;
  } catch (err) {
    if (showError) alert('Não foi possível salvar todos os dados neste navegador. A foto pode estar grande demais para o armazenamento local.');
    return false;
  }
}

function activeAuction() {
  return state.auctions.find(a => a.id === state.currentAuctionId) || state.auctions[0] || null;
}

function auctionLots(auction = activeAuction()) {
  return auction?.lots || [];
}

function padLot(n) {
  return String(n).padStart(3, '0');
}

function lotItems(lot){
  return Array.isArray(lot?.items) ? lot.items : [];
}

function itemCursorKey(lot){
  return String(lot?.n ?? '');
}

function activeItemIndex(lot){
  const items=lotItems(lot);
  if(!items.length) return -1;
  const key=itemCursorKey(lot);
  const current=itemCursorByLot.get(key);
  if(Number.isInteger(current) && current>=0 && current<items.length) return current;
  itemCursorByLot.set(key,0);
  return 0;
}

function activeItemContext(lot){
  const index=activeItemIndex(lot);
  const items=lotItems(lot);
  return index>=0 ? {item:items[index],index,total:items.length} : {item:null,index:-1,total:0};
}

function setActiveItemIndex(lot,index){
  const total=lotItems(lot).length;
  if(!total) return;
  itemCursorByLot.set(itemCursorKey(lot),Math.max(0,Math.min(total-1,index)));
}

function itemIdentifier(lot,item,index=0){
  return String(item?.itemIdentifier || generatedItemIdentifier(lot?.n||0,item?.itemOrder||index+1));
}

function operationalEntries(auction=activeAuction()){
  const entries=[];
  for(const lot of auction?.lots||[]){
    const items=lotItems(lot);
    if(items.length){
      items.forEach((item,index)=>entries.push({lot,item,index,total:items.length}));
    }
  }
  return entries;
}

function nextPendingItem(auction=activeAuction()){
  return operationalEntries(auction).find(entry=>!entry.item.sold) || null;
}

function itemPhotoUrl(lot,item){
  if(item?.photoDataUrl) return item.photoDataUrl;
  const keyed=window.SISTEMA_THIAGO_ITEM_MEDIA_URLS;
  if(keyed){
    const byId=keyed[itemIdentifier(lot,item)];
    if(byId) return byId;
  }
  return lotPhotoUrl(lot);
}

function preferenceLabel(level) {
  if (level >= 2) return '★★ Prioridade';
  if (level === 1) return '★ Preferência';
  return '☆ Preferência';
}

function plainPreferenceLabel(level) {
  if (level >= 2) return 'Prioridade';
  if (level === 1) return 'Preferência';
  return '';
}

function sourceLabel(item) {
  return item?.sourceType === 'official' ? 'Fonte oficial' : 'Dados inseridos pelo usuário';
}

function fipeCandidatePairLabel(candidate = {}) {
  const code = String(candidate.code || candidate.fipe_code || '').trim();
  const rawValue = String(candidate.value ?? candidate.value_brl ?? candidate.fipe_value ?? '').trim();
  const value = rawValue.replace(/,00$/, '');
  if (code && value) return `${code} → R$ ${value}`;
  if (code) return `${code} → valor não informado`;
  if (value) return `R$ ${value}`;
  return 'Referência FIPE sem código/valor';
}

function lotFipeCandidates(lot) {
  const items = Array.isArray(lot?.items) ? lot.items : [];
  return items.flatMap(item => {
    const candidates = Array.isArray(item?.fipeCandidates) ? item.fipeCandidates : [];
    return candidates.map(candidate => ({ item, candidate }));
  });
}

function formatDate(date, time = '') {
  if (!date) return 'Data não informada';
  const d = new Date(date + 'T12:00:00');
  const formatted = new Intl.DateTimeFormat('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric' }).format(d);
  return time ? `${formatted} • ${time}` : formatted;
}

function auctionStatus(auction) {
  const lots = auction.lots || [];
  if (lots.length && lots.every(l => l.sold)) return { label:'Encerrado', cls:'sold' };
  if (!auction.date) return { label:'Sem data', cls:'waiting' };
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
  if (auction.date === todayKey) return { label:'Hoje', cls:'live-status' };
  if (auction.date > todayKey) return { label:'Agendado', cls:'waiting' };
  return { label:'Em acompanhamento', cls:'live-status' };
}

function nextPending(auction = activeAuction()) {
  if (!auction) return null;
  return auction.lots.find(l => !l.sold) || null;
}

function ensureLiveCursor(auction = activeAuction()) {
  if (!auction || !auction.lots.length) return -1;
  let index = liveCursorByAuction.get(auction.id);
  if (!Number.isInteger(index) || index < 0 || index >= auction.lots.length) {
    index = auction.lots.findIndex(l => !l.sold);
    if (index < 0) index = Math.max(0, auction.lots.length - 1);
    liveCursorByAuction.set(auction.id,index);
  }
  return index;
}

function liveCurrentLot(auction = activeAuction()) {
  const index = ensureLiveCursor(auction);
  return index >= 0 ? auction.lots[index] : null;
}

function openDialog(dialog) {
  if (!dialog) return;
  if (typeof dialog.showModal === 'function') dialog.showModal();
  else dialog.setAttribute('open','');
}

function closeDialog(dialog) {
  if (!dialog) return;
  if (typeof dialog.close === 'function') {
    try { dialog.close(); } catch {}
  } else dialog.removeAttribute('open');
}

function lotPhotoUrl(lot) {
  if (!lot) return '';
  return window.SISTEMA_THIAGO_MEDIA_URLS?.[String(lot.n)] || lot.photoDataUrl || '';
}

function openLotPhoto(url, caption='Foto do lote') {
  if (!url || !photoViewerDialog || !photoViewerImage) return;
  photoViewerImage.src = url;
  photoViewerImage.alt = caption;
  if (photoViewerCaption) photoViewerCaption.textContent = caption;
  openDialog(photoViewerDialog);
}

function sourceBadgeHtml(item) {
  const cls = item.sourceType === 'official' ? 'official-source' : 'user-source';
  return `<span class="source-badge ${cls}">${sourceLabel(item)}</span>`;
}

function renderAgenda() {
  const wrap = $('#auctionAgenda');
  const sorted = [...state.auctions].sort((a,b) => {
    if (!a.date && !b.date) return a.title.localeCompare(b.title);
    if (!a.date) return 1;
    if (!b.date) return -1;
    return a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || '');
  });
  $('#auctionCountBadge').textContent = sorted.length;
  wrap.innerHTML = sorted.map(a => {
    const st = auctionStatus(a);
    const active = a.id === state.currentAuctionId ? ' active' : '';
    return `<article class="auction-agenda-card${active}">
      <div class="auction-agenda-date">
        <strong>${a.date ? a.date.slice(8,10) : '—'}</strong>
        <span>${a.date ? new Intl.DateTimeFormat('pt-BR',{month:'short'}).format(new Date(a.date+'T12:00:00')).replace('.','') : 'sem data'}</span>
      </div>
      <div class="auction-agenda-copy">
        <div class="source-row">${sourceBadgeHtml(a)}<span class="status-badge ${st.cls}">${st.label}</span></div>
        <h3>${escapeHtml(a.title)}</h3>
        <p>${escapeHtml(formatDate(a.date,a.time))} • ${escapeHtml(a.reference)}</p>
        <small>${a.lots.length} lote(s)</small>
      </div>
      <div class="agenda-actions">
        <button class="secondary-btn agenda-open-btn" data-auction-id="${a.id}" type="button">Acompanhar</button>
        <button class="danger-btn agenda-delete-btn" data-auction-id="${a.id}" type="button">Apagar</button>
      </div>
    </article>`;
  }).join('');

  wrap.querySelectorAll('.agenda-open-btn').forEach(btn => btn.addEventListener('click', () => switchAuction(btn.dataset.auctionId)));
  wrap.querySelectorAll('.agenda-delete-btn').forEach(btn => btn.addEventListener('click', () => deleteAuction(btn.dataset.auctionId)));
}

function renderChooseAuctions() {
  const wrap = $('#chooseAuctionList');
  const sorted = [...state.auctions].sort((a,b) => (a.date || '9999').localeCompare(b.date || '9999'));
  if (!sorted.length) {
    wrap.innerHTML = '<p class="empty-state">Nenhum leilão cadastrado.</p>';
    return;
  }
  wrap.innerHTML = sorted.map(a => {
    const st = auctionStatus(a);
    return `<button class="choose-auction-card" data-auction-id="${a.id}" type="button">
      <span class="choose-auction-main">
        <strong>${escapeHtml(a.title)}</strong>
        <span>${escapeHtml(formatDate(a.date,a.time))}</span>
        <span>Referência: ${escapeHtml(a.reference)}</span>
      </span>
      <span class="choose-auction-side">
        <span class="status-badge ${st.cls}">${st.label}</span>
        <small>${a.lots.length} lote(s)</small>
      </span>
    </button>`;
  }).join('');

  wrap.querySelectorAll('.choose-auction-card').forEach(btn => btn.addEventListener('click', () => {
    switchAuction(btn.dataset.auctionId);
    closeDialog(chooseAuctionDialog);
  }));
}

function renderActiveAuctionHeader() {
  const a = activeAuction();
  const panel = $('#activeAuctionPanel');
  if (!a) {
    panel.hidden = true;
    return;
  }
  panel.hidden = false;
  const officialNoLotsNotice = $('#officialNoLotsNotice');
  if (officialNoLotsNotice) officialNoLotsNotice.hidden = !(a.sourceType === 'official' && a.lots.length === 0);

  const officialDetails = $('#officialAuctionDetails');
  const officialData = $('#officialAuctionData');
  if (officialDetails && officialData) {
    if (a.sourceType === 'official') {
      const p = a.officialPayload || {};
      const evidence = a.sourceEvidence || {};
      const rows = [
        ['Órgão', p.agency || evidence.agency],
        ['Processo', p.process],
        ['Modalidade', p.modality],
        ['Critério', p.criterion],
        ['Objeto', p.object || a.notes],
        ['Abrangência', p.scope],
        ['Plataforma', p.platform],
        ['Publicado em', p.publishedAt],
        ['Encontrado em', p.foundAt || evidence.foundAt],
        ['Última verificação', p.lastChecked || evidence.lastVerified]
      ].filter(([,value]) => value);
      Object.entries(a.extraFields || {}).forEach(([key,value]) => rows.push([key,value]));
      officialData.innerHTML = rows.map(([key,value]) => {
        const display = Array.isArray(value) ? value.join(', ') : (typeof value === 'object' ? JSON.stringify(value) : value);
        return `<div><dt>${escapeHtml(key)}</dt><dd>${escapeHtml(display)}</dd></div>`;
      }).join('');
      officialDetails.hidden = rows.length === 0;
      if (rows.length && a.lots.length === 0) officialDetails.open = true;
    } else {
      officialDetails.hidden = true;
      officialData.innerHTML = '';
    }
  }

  $('#auctionTitle').textContent = a.title;
  $('#auctionDateRef').textContent = `${formatDate(a.date,a.time)} • Referência: ${a.reference}`;
  $('#auctionLocation').textContent = a.location || 'Local não informado';

  const sourceBadge = $('#auctionSourceBadge');
  sourceBadge.textContent = sourceLabel(a);
  sourceBadge.className = `source-badge ${a.sourceType === 'official' ? 'official-source' : 'user-source'}`;

  const st = auctionStatus(a);
  const statusBadge = $('#auctionStatusBadge');
  statusBadge.textContent = st.label;
  statusBadge.className = `status-badge ${st.cls}`;

  const img = $('#auctionCover');
  const placeholder = $('#auctionCoverPlaceholder');
  if (a.photoDataUrl) {
    img.src = a.photoDataUrl;
    img.alt = `Capa do leilão ${a.title}`;
    img.hidden = false;
    placeholder.hidden = true;
  } else {
    img.hidden = true;
    placeholder.hidden = false;
    placeholder.textContent = a.title.slice(0,1).toUpperCase();
  }

  const officialLink = $('#officialSourceLink');
  if (a.sourceType === 'official' && a.officialUrl) {
    officialLink.href = a.officialUrl;
    officialLink.hidden = false;
  } else {
    officialLink.hidden = true;
  }
}

function matches(lot) {
  const items=lotItems(lot);
  const itemSearch = items.flatMap(item => [
    item.itemIdentifier, item.description, item.vehicle, item.plate, item.brandModel, item.chassis,
    item.year, item.color, item.fuel, item.fipeValue, item.minimumBid, item.maxBid, item.finalValue,
    item.result,item.note
  ]);
  const fipeSearch = lotFipeCandidates(lot).flatMap(({candidate}) => [
    candidate.code, candidate.fipe_code, candidate.value, candidate.value_brl, candidate.fipe_value,
    candidate.model, candidate.description, candidate.year, candidate.model_year, candidate.fuel, candidate.brand
  ]);
  const text = [
    lot.n, padLot(lot.n), lot.vehicle, lot.type, lot.plate, lot.brandModel, lot.chassis, lot.engine,
    lot.year, lot.color, lot.fuel, lot.fipeValue, lot.minimumBid, lot.maxBid, lot.finalValue, lot.result, lot.note,
    ...itemSearch, ...fipeSearch
  ].join(' ').toLowerCase();
  if (query && !text.includes(query)) return false;

  const anyWaiting=items.length ? items.some(item=>!item.sold) : !lot.sold;
  const anyPreference=items.length ? items.some(item=>Number(item.preferenceLevel)>0) : Number(lot.preferenceLevel)>0;
  const allSold=items.length ? items.every(item=>item.sold) : Boolean(lot.sold);
  if (filter === 'waiting' && !anyWaiting) return false;
  if (filter === 'preference' && !anyPreference) return false;
  if (filter === 'sold' && !allSold) return false;
  return true;
}

const HUMAN_CONFIRMABLE_LOT_FIELDS = new Set(['type','plate','brandModel','chassis','engine','year','color','fuel']);
const HUMAN_CONFIRMABLE_ITEM_FIELDS = new Set(['type','plate','brandModel','chassis','engine','year','color','fuel']);

function markHumanConfirmedItemField(item,field) {
  if (!item || !HUMAN_CONFIRMABLE_ITEM_FIELDS.has(field)) return;
  item.extraFields = item.extraFields && typeof item.extraFields === 'object' ? item.extraFields : {};
  const current = Array.isArray(item.extraFields.humanConfirmedFields) ? item.extraFields.humanConfirmedFields : [];
  item.extraFields.humanConfirmedFields = [...new Set([...current,field])];
  item.extraFields.humanConfirmedAt = new Date().toISOString();
}

function bindItemText(card, selector, lot, item, field) {
  const input = card.querySelector(selector);
  if (!input || !item) return;
  input.value = item[field] || '';
  input.addEventListener('change', () => {
    const next = input.value.trim();
    const changed = String(item[field] || '') !== next;
    item[field] = next;
    if (changed && HUMAN_CONFIRMABLE_ITEM_FIELDS.has(field)) markHumanConfirmedItemField(item,field);
    syncLotRollupFromItems(lot);
    saveState();
    updateSummary();
    renderAgenda();
  });
}
;


function renderLots() {
  const a = activeAuction();
  list.innerHTML = '';
  if (!a) return;

  const nextEntry = nextPendingItem(a);
  const visible = a.lots.filter(matches);
  $('#emptyState').hidden = visible.length !== 0;

  for (const lot of visible) {
    const card = template.content.firstElementChild.cloneNode(true);
    const context=activeItemContext(lot);
    const item=context.item;
    if(!item) continue;

    if (nextEntry?.lot?.n === lot.n) card.classList.add('is-next');
    if (lotItems(lot).some(x=>Number(x.preferenceLevel)>0)) card.classList.add('is-preference');
    if (lotItems(lot).some(x=>Number(x.preferenceLevel)>=2)) card.classList.add('is-priority');
    if (lotItems(lot).every(x=>x.sold)) card.classList.add('is-sold');

    card.querySelector('.lot-number').textContent = `Lote ${padLot(lot.n)}`;
    const itemIdentity=card.querySelector('.item-identity');
    itemIdentity.textContent=`Item ${context.index+1}/${context.total} • ${itemIdentifier(lot,item,context.index)}`;

    const prev=card.querySelector('.item-prev-btn');
    const next=card.querySelector('.item-next-btn');
    prev.disabled=context.index<=0;
    next.disabled=context.index>=context.total-1;
    prev.hidden=context.total<=1;
    next.hidden=context.total<=1;
    prev.addEventListener('click',()=>{
      setActiveItemIndex(lot,context.index-1);
      renderLots();
    });
    next.addEventListener('click',()=>{
      setActiveItemIndex(lot,context.index+1);
      renderLots();
    });

    card.querySelector('.vehicle-name').textContent =
      item.vehicle || item.description || item.brandModel || 'Item não descrito';

    const badge = card.querySelector('.status-badge');
    badge.textContent = item.sold ? 'Leiloado' : 'Aguardando';
    badge.className = `status-badge ${item.sold ? 'sold' : 'waiting'}`;

    const lotSource = card.querySelector('.lot-source');
    lotSource.textContent = sourceLabel(item.sourceType==='official'?item:lot);
    lotSource.className = `source-badge lot-source ${item.sourceType === 'official' || lot.sourceType==='official' ? 'official-source' : 'user-source'}`;

    const extras = [item.plate && `Placa ${item.plate}`, item.year, item.color].filter(Boolean);
    card.querySelector('.lot-extra').textContent = extras.join(' • ');
    const reviewFlag = card.querySelector('.lot-review');
    if (reviewFlag) reviewFlag.hidden = !(item.extraFields?.reviewRequired || lot.needsReview || lot.extraFields?.needsReview);

    const itemCandidates=Array.isArray(item.fipeCandidates)?item.fipeCandidates:[];
    if(itemCandidates.length){
      const visibleFipe=document.createElement('div');
      visibleFipe.className='lot-fipe-candidates lot-fipe-visible';
      visibleFipe.innerHTML='<span>FIPE deste item • revisar a opção correta</span>'+
        itemCandidates.map(candidate=>{
          const desc=[candidate.model||candidate.description||'',candidate.year||candidate.model_year||'',candidate.fuel||''].filter(Boolean).join(' • ');
          return '<div><strong>'+escapeHtml(fipeCandidatePairLabel(candidate))+'</strong>'+
            (desc?'<small>'+escapeHtml(desc)+'</small>':'')+'</div>';
        }).join('');
      card.querySelector('.lot-meta-row')?.insertAdjacentElement('afterend',visibleFipe);
    }

    const itemsSummary = card.querySelector('.lot-items-summary');
    if(itemsSummary){
      const items=lotItems(lot);
      itemsSummary.innerHTML='<div class="lot-items-heading"><strong>Itens deste lote</strong><span>'+items.length+'</span></div>'+
        '<div class="lot-item-tabs">'+items.map((entry,index)=>{
          const label=entry.vehicle||entry.description||entry.brandModel||'Item';
          const active=index===context.index?' active':'';
          return '<button type="button" class="lot-item-tab'+active+'" data-item-index="'+index+'">'+
            '<strong>Item '+(index+1)+' • '+escapeHtml(itemIdentifier(lot,entry,index))+'</strong>'+
            '<span>'+escapeHtml(label)+'</span></button>';
        }).join('')+'</div>';
      itemsSummary.querySelectorAll('[data-item-index]').forEach(button=>button.addEventListener('click',()=>{
        setActiveItemIndex(lot,Number(button.dataset.itemIndex)||0);
        renderLots();
      }));
    }

    const photo = card.querySelector('.lot-photo');
    const photoUrl = itemPhotoUrl(lot,item);
    if (photoUrl) {
      const caption = `Lote ${padLot(lot.n)} • Item ${context.index+1} — ${item.vehicle || item.description || 'foto do item'}`;
      photo.src = photoUrl;
      photo.alt = `Imagem do item ${context.index+1} do lote ${padLot(lot.n)}. Clique para ampliar.`;
      photo.title = 'Clique para ampliar';
      photo.tabIndex = 0;
      photo.setAttribute('role','button');
      photo.hidden = false;
      photo.addEventListener('click',()=>openLotPhoto(photoUrl,caption));
      photo.addEventListener('keydown',event=>{
        if(event.key==='Enter' || event.key===' '){
          event.preventDefault();
          openLotPhoto(photoUrl,caption);
        }
      });
    } else {
      photo.hidden = true;
      photo.removeAttribute('src');
      photo.removeAttribute('role');
      photo.removeAttribute('tabindex');
    }

    const resultChip = card.querySelector('.result-chip');
    if (item.sold && item.result) {
      resultChip.hidden = false;
      resultChip.textContent = item.result;
    }

    const preferenceBtn = card.querySelector('.preference-btn');
    preferenceBtn.classList.toggle('on', item.preferenceLevel > 0);
    preferenceBtn.classList.toggle('priority', item.preferenceLevel >= 2);
    preferenceBtn.textContent = preferenceLabel(item.preferenceLevel);
    preferenceBtn.addEventListener('click', () => {
      item.preferenceLevel = (item.preferenceLevel + 1) % 3;
      syncLotRollupFromItems(lot);
      saveState();
      renderAll();
    });

    const statusBtn = card.querySelector('.status-btn');
    statusBtn.textContent = item.sold ? '↶ Voltar item para aguardando' : '✓ Marcar item leiloado';
    statusBtn.classList.toggle('undo-action', item.sold);
    statusBtn.addEventListener('click', () => {
      item.sold = !item.sold;
      if (!item.sold) {
        item.result = '';
        item.finalValue = '';
      }
      syncLotRollupFromItems(lot);
      liveCursorByAuction.delete(a.id);
      saveState();
      renderAll();
    });

    card.querySelector('.sold-details').hidden = !item.sold;
    card.querySelector('.final-value-wrap').hidden = !item.sold;

    const resultSelect = card.querySelector('.result-select');
    resultSelect.value = item.result || '';
    resultSelect.addEventListener('change', () => {
      item.result = resultSelect.value;
      syncLotRollupFromItems(lot);
      saveState();
      renderAll();
    });

    bindItemText(card,'.fipe-value-input',lot,item,'fipeValue');
    bindItemText(card,'.minimum-bid-input',lot,item,'minimumBid');
    bindItemText(card,'.max-bid-input',lot,item,'maxBid');
    bindItemText(card,'.final-value-input',lot,item,'finalValue');
    bindItemText(card,'.note-input',lot,item,'note');
    bindItemText(card,'.lot-type-input',lot,item,'type');
    bindItemText(card,'.plate-input',lot,item,'plate');
    bindItemText(card,'.brand-model-input',lot,item,'brandModel');
    bindItemText(card,'.chassis-input',lot,item,'chassis');
    bindItemText(card,'.engine-input',lot,item,'engine');
    bindItemText(card,'.year-input',lot,item,'year');
    bindItemText(card,'.color-input',lot,item,'color');
    bindItemText(card,'.fuel-input',lot,item,'fuel');

    const vehicleLink = card.querySelector('.vehicle-data-link');
    vehicleLink.href = `fipe.html?q=${encodeURIComponent(item.plate || item.brandModel || item.vehicle || item.itemIdentifier)}`;

    const saveBtn = card.querySelector('.save-lot-btn');
    saveBtn.addEventListener('click',()=>{
      syncLotRollupFromItems(lot);
      saveState();
      const old = saveBtn.textContent;
      saveBtn.textContent = 'Salvo ✓';
      setTimeout(()=>{ saveBtn.textContent = old; },900);
    });

    const deleteBtn = card.querySelector('.delete-lot-btn');
    deleteBtn.addEventListener('click',()=>{
      if(!confirm(`Apagar o lote ${padLot(lot.n)} e todos os seus ${context.total} item(ns)?`)) return;
      a.lots = a.lots.filter(entry=>entry !== lot);
      itemCursorByLot.delete(itemCursorKey(lot));
      liveCursorByAuction.delete(a.id);
      saveState();
      renderAll();
    });

    list.appendChild(card);
  }
}

function updateSummary() {
  const a = activeAuction();
  const lots = auctionLots(a);
  const sold = lots.filter(l => l.sold).length;
  const waiting = lots.length - sold;
  const prefs = lots.filter(l => l.preferenceLevel > 0).length;

  $('#totalCount').textContent = lots.length;
  $('#waitingCount').textContent = waiting;
  $('#preferenceCount').textContent = prefs;
  $('#soldCount').textContent = sold;

  const pct = lots.length ? Math.round((sold / lots.length) * 100) : 0;
  $('#progressText').textContent = `${pct}%`;
  $('#progressBar').style.width = `${pct}%`;

  const next = nextPending(a);
  if (next) {
    $('#nextLot').textContent = `Lote ${padLot(next.n)}`;
    $('#nextVehicle').textContent = next.vehicle;
    $('#nextPreference').hidden = next.preferenceLevel === 0;
    $('#nextPreference').textContent = plainPreferenceLabel(next.preferenceLevel);
    $('#nextMaxBid').hidden = !next.maxBid;
    $('#nextMaxBid').textContent = next.maxBid ? `Nosso máximo: R$ ${next.maxBid}` : '';
    $('#markNextBtn').disabled = false;
    $('#markNextBtn').textContent = `Leiloado • lote ${padLot(next.n)}`;
  } else if (lots.length) {
    $('#nextLot').textContent = 'Concluído';
    $('#nextVehicle').textContent = 'Todos os lotes cadastrados já foram acompanhados';
    $('#nextPreference').hidden = true;
    $('#nextMaxBid').hidden = true;
    $('#markNextBtn').disabled = true;
    $('#markNextBtn').textContent = 'Acompanhamento concluído';
  } else {
    $('#nextLot').textContent = 'Sem lotes';
    $('#nextVehicle').textContent = 'Cadastre o primeiro lote deste leilão';
    $('#nextPreference').hidden = true;
    $('#nextMaxBid').hidden = true;
    $('#markNextBtn').disabled = true;
    $('#markNextBtn').textContent = 'Nenhum lote cadastrado';
  }
}

function updateLiveMode() {
  const a = activeAuction();
  const select = $('#liveAuctionSelect');
  select.innerHTML = state.auctions.map(x => `<option value="${x.id}">${escapeHtml(x.title)}</option>`).join('');
  if (a) select.value = a.id;

  if (!a) return;
  $('#liveAuctionMeta').textContent = `${formatDate(a.date,a.time)} • ${a.reference}`;

  const current = liveCurrentLot(a);
  const index = ensureLiveCursor(a);
  if (!current) {
    $('#liveLot').textContent = 'Sem lotes';
    $('#liveVehicle').textContent = 'Cadastre lotes antes de iniciar';
    $('#livePreference').hidden = true;
    if (liveMaxBidInput) {
      liveMaxBidInput.value = '';
      liveMaxBidInput.disabled = true;
    }
    $('#liveSoldBtn').disabled = true;
    $('#livePreferenceBtn').disabled = true;
    $('#liveSkipBtn').disabled = true;
    $('#liveBackBtn').disabled = true;
    $('#liveVehicleLink').href = 'fipe.html';
    if (livePhotoButton) livePhotoButton.hidden = true;
    if (livePhoto) livePhoto.removeAttribute('src');
    return;
  }

  $('#liveLot').textContent = `Lote ${padLot(current.n)}`;
  $('#liveVehicle').textContent = current.vehicle;
  $('#livePreference').hidden = current.preferenceLevel === 0;
  $('#livePreference').textContent = plainPreferenceLabel(current.preferenceLevel);
  if (liveMaxBidInput) {
    liveMaxBidInput.disabled = false;
    if (document.activeElement !== liveMaxBidInput) liveMaxBidInput.value = current.maxBid || '';
  }

  const currentPhotoUrl = lotPhotoUrl(current);
  if (livePhotoButton && livePhoto) {
    if (currentPhotoUrl) {
      const caption = `Lote ${padLot(current.n)} — ${current.vehicle || current.items?.[0]?.description || 'foto do lote'}`;
      livePhoto.src = currentPhotoUrl;
      livePhoto.alt = `Foto do lote ${padLot(current.n)}`;
      livePhotoButton.hidden = false;
      livePhotoButton.onclick = ()=>openLotPhoto(currentPhotoUrl,caption);
    } else {
      livePhotoButton.hidden = true;
      livePhotoButton.onclick = null;
      livePhoto.removeAttribute('src');
    }
  }

  $('#livePreferenceBtn').disabled = false;
  $('#livePreferenceBtn').textContent = preferenceLabel(current.preferenceLevel);
  $('#liveBackBtn').disabled = index <= 0;
  $('#liveSkipBtn').disabled = index >= a.lots.length - 1;
  $('#liveSoldBtn').disabled = false;
  $('#liveSoldBtn').textContent = current.sold ? 'DESMARCAR LEILOADO' : 'LEILOADO';
  $('#liveSoldBtn').classList.toggle('undo-live',current.sold);
  $('#liveVehicleLink').href = `fipe.html?q=${encodeURIComponent(current.plate || current.brandModel || current.vehicle)}`;
}

function renderAll() {
  renderActiveAuctionHeader();
  renderAgenda();
  renderChooseAuctions();
  renderLots();
  updateSummary();
  updateLiveMode();
}

function deleteAuction(id) {
  const auction = state.auctions.find(a=>a.id===id);
  if (!auction) return;
  const warning = auction.lots?.length ? ` Ele possui ${auction.lots.length} lote(s) cadastrados.` : '';
  if (!confirm(`Apagar o leilão "${auction.title}"?${warning} Esta ação remove os dados locais deste leilão.`)) return;
  state.auctions = state.auctions.filter(a=>a.id!==id);
  liveCursorByAuction.delete(id);
  if (state.currentAuctionId===id) state.currentAuctionId=state.auctions[0]?.id || '';
  saveState();
  renderAll();
}

function switchAuction(id) {
  if (!state.auctions.some(a => a.id === id)) return;
  state.currentAuctionId = id;
  query = '';
  filter = 'all';
  searchInput.value = '';
  document.querySelectorAll('.chip').forEach(b => b.classList.toggle('active', b.dataset.filter === 'all'));
  saveState();
  renderAll();
  $('#activeAuctionPanel').scrollIntoView({behavior:'smooth',block:'start'});
}

async function compressImage(file) {
  if (!file) return '';
  const dataUrl = await new Promise((resolve,reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const img = await new Promise((resolve,reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = dataUrl;
  });

  const maxW = 1000;
  const maxH = 600;
  const scale = Math.min(1, maxW / img.width, maxH / img.height);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img,0,0,canvas.width,canvas.height);
  return canvas.toDataURL('image/jpeg',0.78);
}

function addAuction(data) {
  const id = 'leilao-' + Date.now().toString(36);
  const auction = {
    ...(data || {}),
    id,
    title: data.title || 'Leilão sem título',
    date: data.date || '',
    time: data.time || '',
    reference: data.reference || 'Sem referência',
    location: data.location || '',
    sourceType: data.sourceType === 'official' ? 'official' : 'user',
    sourceLabel: data.sourceType === 'official' ? 'Fonte oficial' : 'Dados inseridos pelo usuário',
    officialUrl: data.officialUrl || '',
    photoDataUrl: data.photoDataUrl || '',
    notes: data.notes || '',
    officialPayload: data.officialPayload || null,
    sourceEvidence: data.sourceEvidence || null,
    extraFields: data.extraFields && typeof data.extraFields === 'object' ? data.extraFields : {},
    participants: [state.currentUserId],
    createdBy: state.currentUserId,
    createdAt: new Date().toISOString(),
    lots: []
  };
  state.auctions.push(auction);
  state.currentAuctionId = id;
  saveState();
  renderAll();
  return auction;
}

function addLotToActive(data) {
  const a = activeAuction();
  if (!a) return false;
  const n = Number(data.lotNumber);
  if (a.lots.some(l => l.n === n)) {
    alert(`O lote ${padLot(n)} já existe neste leilão.`);
    return false;
  }
  const lot = freshLot(n,data.vehicle,{
    type:data.type || '',
    plate:data.plate || '',
    brandModel:data.brandModel || '',
    chassis:data.chassis || '',
    engine:data.engine || '',
    year:data.year || '',
    color:data.color || '',
    fuel:data.fuel || '',
    minimumBid:data.minimumBid || '',
    fipeValue:data.fipeValue || '',
    photoDataUrl:data.photoDataUrl || '',
    sourceType:data.sourceType === 'official' ? 'official' : 'user',
    sourceLabel:data.sourceType === 'official' ? 'Fonte oficial' : 'Dados inseridos pelo usuário',
    officialUrl:data.officialUrl || ''
  });
  const primary = freshItem({
    itemIdentifier:data.itemIdentifier || '',
    vehicle:data.vehicle || '',
    type:data.type || '',
    plate:data.plate || '',
    brandModel:data.brandModel || '',
    chassis:data.chassis || '',
    engine:data.engine || '',
    year:data.year || '',
    color:data.color || '',
    fuel:data.fuel || '',
    fipeValue:data.fipeValue || ''
  });
  lot.items = [primary, ...(Array.isArray(data.additionalItems) ? data.additionalItems.map(freshItem) : [])];
  a.lots.push(lot);
  a.lots.sort((x,y)=>x.n-y.n);
  saveState();
  renderAll();
  return true;
}

function markNextSold() {
  const a = activeAuction();
  const next = nextPending(a);
  if (!next) return;
  next.sold = true;
  saveState();
  renderAll();
}

function cycleLivePreference() {
  const current = liveCurrentLot();
  if (!current) return;
  current.preferenceLevel = (current.preferenceLevel + 1) % 3;
  saveState();
  renderAll();
}

function saveLiveMaxBid() {
  const current = liveCurrentLot();
  if (!current || !liveMaxBidInput) return;
  const nextValue = String(liveMaxBidInput.value || '').trim();
  if (nextValue === current.maxBid) return;
  current.maxBid = nextValue;
  saveState();
  renderAll();
}

function toggleLiveSold() {
  const a = activeAuction();
  const current = liveCurrentLot(a);
  if (!a || !current) return;
  const index = ensureLiveCursor(a);
  current.sold = !current.sold;
  if (!current.sold) {
    current.result = '';
    current.finalValue = '';
  } else if (index < a.lots.length - 1) {
    liveCursorByAuction.set(a.id,index + 1);
  }
  saveState();
  renderAll();
}

function skipLiveLot() {
  const a = activeAuction();
  if (!a || !a.lots.length) return;
  const index = ensureLiveCursor(a);
  if (index < a.lots.length - 1) liveCursorByAuction.set(a.id,index + 1);
  updateLiveMode();
}

function backLiveLot() {
  const a = activeAuction();
  if (!a || !a.lots.length) return;
  const index = ensureLiveCursor(a);
  if (index > 0) liveCursorByAuction.set(a.id,index - 1);
  updateLiveMode();
}

function csvCell(value) {
  return `"${String(value ?? '').replaceAll('"','""')}"`;
}

function exportCsv() {
  const a = activeAuction();
  if (!a) return;
  const header = ['Leilão','Data','Referência','Lote','Tipo','Veículo/item','Placa','Marca/modelo','Chassi','Motor','Ano','Cor','Combustível','Valor FIPE','Lance mínimo','Nosso máximo','Status','Preferência','Resultado','Valor final','Observação','Fonte'];
  const rows = a.lots.map(l => [
    a.title,formatDate(a.date,a.time),a.reference,padLot(l.n),l.type,l.vehicle,l.plate,l.brandModel,l.chassis,l.engine,l.year,l.color,l.fuel,
    l.fipeValue,l.minimumBid,l.maxBid,l.sold?'Leiloado':'Aguardando',plainPreferenceLabel(l.preferenceLevel)||'Não',l.result,l.finalValue,l.note,sourceLabel(l)
  ]);
  const csv = '\uFEFF' + [header,...rows].map(r=>r.map(csvCell).join(';')).join('\r\n');
  const blob = new Blob([csv],{type:'text/csv;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const el = document.createElement('a');
  el.href = url;
  el.download = `leilao-${slugify(a.title)}-${a.date || 'sem-data'}.csv`;
  document.body.appendChild(el);
  el.click();
  el.remove();
  URL.revokeObjectURL(url);
}

function printSummary() {
  const a = activeAuction();
  if (!a) return;

  const sold = a.lots.filter(l=>l.sold).length;
  const waiting = Math.max(0,a.lots.length-sold);
  const generatedAt = new Date().toLocaleString('pt-BR');
  const logoUrl = new URL('assets/sistema-thiago-logo.svg',location.href).href;

  const rows = a.lots.map(l=>`<tr>
    <td class="lot-col">${padLot(l.n)}</td>
    <td><strong>${escapeHtml(l.vehicle||'—')}</strong></td>
    <td>${escapeHtml(l.plate||'—')}</td>
    <td class="money">${escapeHtml(l.fipeValue ? 'R$ '+l.fipeValue : '—')}</td>
    <td class="money">${escapeHtml(l.minimumBid ? 'R$ '+l.minimumBid : '—')}</td>
    <td class="money">${escapeHtml(l.maxBid ? 'R$ '+l.maxBid : '—')}</td>
    <td><span class="status ${l.sold?'sold':'waiting'}">${l.sold?'Leiloado':'Aguardando'}</span></td>
    <td>${escapeHtml(l.result||'—')}</td>
    <td class="money">${escapeHtml(l.finalValue ? 'R$ '+l.finalValue : '—')}</td>
  </tr>`).join('');

  const frame=document.createElement('iframe');
  Object.assign(frame.style,{position:'fixed',right:'0',bottom:'0',width:'0',height:'0',border:'0'});
  frame.setAttribute('aria-hidden','true');
  document.body.appendChild(frame);

  const doc=frame.contentDocument;
  doc.open();
  doc.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
  <title>${escapeHtml(a.title)} • Sistema Thiago</title>
  <style>
    @page{size:A4 landscape;margin:11mm 10mm 12mm}
    *{box-sizing:border-box}
    body{font-family:Arial,Helvetica,sans-serif;margin:0;color:#14212b;background:#fff;font-size:10.5px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .report-header{display:flex;align-items:center;justify-content:space-between;gap:18px;border-bottom:3px solid #d8a62a;padding:0 0 10px;margin-bottom:12px}
    .brand{display:flex;align-items:center;gap:12px}
    .report-logo{width:56px;height:56px;object-fit:contain}
    .brand-kicker{margin:0 0 2px;text-transform:uppercase;letter-spacing:.08em;font-size:9px;color:#5f7080}
    h1{margin:0;color:#09293f;font-size:22px;line-height:1.08}
    .company{font-weight:700;color:#0d5a46;font-size:11px;text-align:right}
    .company small{display:block;font-weight:400;color:#687783;margin-top:3px}
    .meta{display:grid;grid-template-columns:2fr 1.1fr 1.1fr 1.1fr;gap:8px;margin-bottom:12px}
    .meta-card{border:1px solid #dfe6eb;border-radius:8px;padding:8px 10px;background:#f8fafb;min-height:48px}
    .meta-card span{display:block;color:#71808c;font-size:8.5px;text-transform:uppercase;letter-spacing:.06em;margin-bottom:3px}
    .meta-card strong{display:block;color:#162f41;font-size:11px;line-height:1.25}
    .summary{display:flex;gap:8px;margin:0 0 12px}
    .summary-badge{border-radius:999px;padding:5px 9px;background:#edf3f6;color:#17384d;font-weight:700;font-size:9px}
    .summary-badge.gold{background:#fff3cf;color:#765600}
    table{width:100%;border-collapse:separate;border-spacing:0;font-size:9px;border:1px solid #ccd7de;border-radius:8px;overflow:hidden}
    thead{display:table-header-group}
    th{background:#09293f;color:#fff;text-align:left;padding:7px 6px;font-size:8.4px;text-transform:uppercase;letter-spacing:.025em}
    td{border-top:1px solid #e2e8ec;padding:6px;vertical-align:middle}
    tbody tr:nth-child(even){background:#f8fafb}
    tr{break-inside:avoid;page-break-inside:avoid}
    .lot-col{font-weight:800;color:#09293f;text-align:center;width:42px}
    .money{white-space:nowrap}
    .status{display:inline-block;border-radius:999px;padding:3px 6px;font-weight:700;font-size:8px;white-space:nowrap}
    .status.sold{background:#e4f4ec;color:#176642}
    .status.waiting{background:#eef2f5;color:#536674}
    .report-footer{display:grid;grid-template-columns:1.5fr 1fr;gap:18px;margin-top:14px;padding-top:10px;border-top:1px solid #dce4e9}
    .notice{font-size:8.5px;line-height:1.45;color:#61717e}
    .signature{justify-self:end;text-align:right;min-width:230px}
    .signature-line{border-top:1px solid #82919c;padding-top:7px;margin-top:10px}
    .signature strong{display:block;color:#09293f;font-size:11px}
    .signature span{display:block;color:#0d5a46;font-size:9px;margin-top:2px}
    .signature small{display:block;color:#71808c;font-size:8px;margin-top:3px}
  </style></head><body>
    <header class="report-header">
      <div class="brand">
        <img class="report-logo" src="${escapeHtml(logoUrl)}" alt="Logo do Sistema Thiago">
        <div>
          <p class="brand-kicker">Jus 9 • acompanhamento de leilões</p>
          <h1>Sistema Thiago</h1>
        </div>
      </div>
      <div class="company">Jus 9 Tecnologia Jurídica
        <small>Documento gerado pelo Sistema Thiago</small>
      </div>
    </header>

    <section class="meta">
      <div class="meta-card"><span>Leilão</span><strong>${escapeHtml(a.title)}</strong></div>
      <div class="meta-card"><span>Data / hora</span><strong>${escapeHtml(formatDate(a.date,a.time)||'Não informada')}</strong></div>
      <div class="meta-card"><span>Referência</span><strong>${escapeHtml(a.reference||'Não informada')}</strong></div>
      <div class="meta-card"><span>Gerado em</span><strong>${escapeHtml(generatedAt)}</strong></div>
    </section>

    <div class="summary">
      <span class="summary-badge">Total: ${a.lots.length} lotes</span>
      <span class="summary-badge gold">Aguardando: ${waiting}</span>
      <span class="summary-badge">Leiloados: ${sold}</span>
    </div>

    <table>
      <thead><tr>
        <th>Lote</th><th>Veículo</th><th>Placa</th><th>FIPE</th><th>Lance mínimo</th><th>Nosso máximo</th><th>Status</th><th>Resultado</th><th>Valor final</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>

    <footer class="report-footer">
      <div class="notice">
        <strong>Nota de conferência:</strong> este relatório organiza os dados disponíveis no Sistema Thiago. Antes de lance, compra, venda ou uso externo, confira edital, documento oficial e dados de origem correspondentes.
      </div>
      <div class="signature">
        <div class="signature-line">
          <strong>Jus 9 Tecnologia Jurídica</strong>
          <span>Assinatura institucional do relatório</span>
          <small>jus9tecnologia.com.br</small>
        </div>
      </div>
    </footer>
  </body></html>`);
  doc.close();

  let printed=false;
  const launchPrint=()=>{
    if(printed) return;
    printed=true;
    frame.contentWindow.focus();
    frame.contentWindow.print();
    setTimeout(()=>frame.remove(),1200);
  };
  const logo=doc.querySelector('.report-logo');
  if(logo && !logo.complete){
    logo.addEventListener('load',launchPrint,{once:true});
    logo.addEventListener('error',launchPrint,{once:true});
    setTimeout(launchPrint,1200);
  }else{
    setTimeout(launchPrint,180);
  }
}

const FIPE_USER_KEY = 'sistema-thiago-fipe-user-v1';

function buildBackupPayload() {
  let fipeUserRefs = [];
  try {
    const parsed = JSON.parse(localStorage.getItem(FIPE_USER_KEY) || '[]');
    if (Array.isArray(parsed)) fipeUserRefs = parsed;
  } catch {}
  return {
    format: 'sistema-thiago-backup',
    backupVersion: 1,
    generatedAt: new Date().toISOString(),
    origin: location.origin,
    state: JSON.parse(JSON.stringify(state)),
    fipeUserRefs
  };
}

function downloadJsonPayload(payload, prefix='sistema-thiago-backup') {
  const blob = new Blob([JSON.stringify(payload,null,2)], {type:'application/json;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = new Date().toISOString().replace(/[:.]/g,'-');
  a.href = url;
  a.download = `${prefix}-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function exportBackupJson() {
  saveState();
  downloadJsonPayload(buildBackupPayload());
}

async function restoreBackupJson(file) {
  if (!file) return;
  let parsed;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    alert('O arquivo selecionado não é um JSON válido.');
    return;
  }

  const incomingState = parsed?.format === 'sistema-thiago-backup' ? parsed.state : parsed;
  if (!incomingState || typeof incomingState !== 'object' || !Array.isArray(incomingState.auctions)) {
    alert('Este arquivo não parece ser um backup válido do Sistema Thiago.');
    return;
  }

  const auctions = incomingState.auctions.length;
  const lots = incomingState.auctions.reduce((sum,a)=>sum + (Array.isArray(a?.lots) ? a.lots.length : 0),0);
  if (!confirm(`Restaurar este backup com ${auctions} leilão(ões) e ${lots} lote(s)? O estado atual será substituído. Antes disso, o sistema baixará um backup do estado atual.`)) return;

  try { downloadJsonPayload(buildBackupPayload(),'sistema-thiago-antes-restaurar'); } catch {}

  try {
    state = normalizeState(incomingState);
    localStorage.setItem(storageKey(),JSON.stringify(state));
    if (parsed?.format === 'sistema-thiago-backup' && Array.isArray(parsed.fipeUserRefs)) {
      localStorage.setItem(FIPE_USER_KEY,JSON.stringify(parsed.fipeUserRefs));
    }
    liveCursorByAuction.clear();
    alert('Backup restaurado com sucesso.');
    location.href='app.html';
  } catch (error) {
    alert('Não foi possível restaurar o backup neste navegador. ' + (error?.message || error));
  }
}

function showImportFeedback() {
  const box = $('#importFeedback');
  if (!box) return;
  const params = new URLSearchParams(location.search);
  const importedId = params.get('imported');
  if (!importedId) return;

  const auction = state.auctions.find(a=>a.sourceEvidence?.officialResultId === importedId) || activeAuction();
  const fieldCount = Number(params.get('fields') || 0);
  const lotCount = auction?.lots?.length || Number(params.get('lots') || 0);
  const pncpAttempted = params.get('pncp') === '1';
  const pncpError = params.get('pncp_error') || '';
  const pncpDocument = params.get('pncp_document') || '';
  const importSync = params.get('sync') || '';
  const importSyncError = params.get('sync_error') || '';
  const relationalSync = params.get('relational') || '';
  const relationalError = params.get('relational_error') || '';
  const relationalLots = Number(params.get('relational_lots') || 0);
  const relationalItems = Number(params.get('relational_items') || 0);
  const relationalAuctionId = params.get('relational_auction_id') || '';
  const sourceRunId = params.get('source_run_id') || '';
  const sourceDocumentId = params.get('source_document_id') || '';

  const detail = pncpError
    ? `A busca automática dos lotes no PNCP foi tentada, mas não concluiu: ${escapeHtml(pncpError)}`
    : lotCount
      ? `Os lotes disponíveis foram carregados${pncpDocument ? ' a partir de ' + escapeHtml(pncpDocument) : ''}.`
      : pncpAttempted
        ? 'O sistema consultou o PNCP e os documentos do edital, mas não conseguiu extrair lotes individualizados nesta tentativa. Os diagnósticos da pesquisa foram preservados nos dados oficiais.'
        : 'Esta fonte ainda possui apenas dados gerais no catálogo; os campos oficiais importados aparecem logo abaixo.';

  const syncDetail = importSync === 'online'
    ? '<br><strong>Backup online:</strong> atualizado antes de abrir o painel.'
    : importSync === 'local'
      ? '<br><strong>Backup online:</strong> não confirmado nesta importação; os dados continuam preservados neste navegador.' +
        (importSyncError ? ' ' + escapeHtml(importSyncError) : '')
      : '';

  const relationalDetail = relationalSync === 'online'
    ? '<br><strong>Banco canônico:</strong> ' + relationalLots + ' lote(s) e ' + relationalItems + ' item(ns) reconciliados no Supabase.' +
      (relationalAuctionId ? '<br><strong>ID canônico do leilão:</strong> <code>' + escapeHtml(relationalAuctionId) + '</code>' : '')
    : relationalSync === 'pending'
      ? '<br><strong>Banco canônico:</strong> reconciliação pendente; o snapshot/local continua preservado.' +
        (relationalError ? ' ' + escapeHtml(relationalError) : '')
      : '';

  const evidenceDetail = (sourceRunId || sourceDocumentId)
    ? '<br><strong>Recibo de proveniência:</strong>' +
      (sourceRunId ? ' execução <code>' + escapeHtml(sourceRunId) + '</code>' : '') +
      (sourceDocumentId ? ' • documento <code>' + escapeHtml(sourceDocumentId) + '</code>' : '') +
      ' • <a href="integridade.html">verificar integridade</a>'
    : '<br><strong>Recibo de proveniência:</strong> ainda não confirmado nesta importação.';

  box.innerHTML = `<strong>Cadastro oficial importado.</strong>
    ${auction ? escapeHtml(auction.title) + ' • ' : ''}
    ${fieldCount ? fieldCount + ' campo(s) de origem processados • ' : ''}
    ${lotCount} lote(s) disponível(is). ${detail}
    ${syncDetail}
    ${relationalDetail}
    ${evidenceDetail}
    <br><strong>Confira os dados no edital/documento oficial antes de dar lance ou tomar decisão.</strong>`;
  box.hidden = false;

  const details = $('#officialAuctionDetails');
  if (details && auction?.sourceType === 'official') details.open = true;

  try { history.replaceState({},'',location.pathname + location.hash); } catch {}
}

function escapeHtml(value) {
  return String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
}

function slugify(value) {
  return String(value || 'leilao').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
}

searchInput.addEventListener('input',e=>{
  query=e.target.value.trim().toLowerCase();
  renderLots();
});

document.querySelectorAll('.chip').forEach(btn=>btn.addEventListener('click',()=>{
  document.querySelectorAll('.chip').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  filter=btn.dataset.filter;
  renderLots();
}));

$('#chooseAuctionBtn').addEventListener('click',()=>{renderChooseAuctions();openDialog(chooseAuctionDialog)});
$('#switchAuctionBtn').addEventListener('click',()=>{renderChooseAuctions();openDialog(chooseAuctionDialog)});
$('#newAuctionBtn').addEventListener('click',()=>openDialog(newAuctionDialog));
$('#newLotBtn').addEventListener('click',()=>openDialog(newLotDialog));
$('#bulkLotsBtn')?.addEventListener('click',()=>openDialog(bulkLotsDialog));

document.querySelectorAll('[data-close-dialog]').forEach(btn=>btn.addEventListener('click',()=>closeDialog(document.getElementById(btn.dataset.closeDialog))));

$('#newAuctionForm').addEventListener('submit',async e=>{
  e.preventDefault();
  const form=e.currentTarget;
  const fd=new FormData(form);
  const file=fd.get('photo');
  let photoDataUrl='';
  if (file && file.size) {
    try { photoDataUrl=await compressImage(file); }
    catch { alert('Não foi possível preparar a foto. O leilão será salvo sem imagem.'); }
  }
  addAuction({
    title:String(fd.get('title')||'').trim(),
    date:String(fd.get('date')||''),
    time:String(fd.get('time')||''),
    reference:String(fd.get('reference')||'').trim(),
    location:String(fd.get('location')||'').trim(),
    sourceType:String(fd.get('sourceType')||'user'),
    officialUrl:String(fd.get('officialUrl')||'').trim(),
    photoDataUrl,
    notes:String(fd.get('notes')||'').trim()
  });
  form.reset();
  closeDialog(newAuctionDialog);
  $('#activeAuctionPanel').scrollIntoView({behavior:'smooth'});
});

$('#newLotForm').addEventListener('submit',async e=>{
  e.preventDefault();
  const form=e.currentTarget;
  const fd=new FormData(form);
  const photoFile=fd.get('photo');
  let photoDataUrl='';
  if(photoFile && photoFile.size){
    try{ photoDataUrl=await compressImage(photoFile); }
    catch{ alert('Não foi possível preparar a imagem do lote. O lote será salvo sem foto.'); }
  }
  const ok=addLotToActive({
    lotNumber:fd.get('lotNumber'),vehicle:String(fd.get('vehicle')||'').trim(),itemIdentifier:String(fd.get('itemIdentifier')||'').trim(),type:String(fd.get('type')||'').trim(),
    plate:String(fd.get('plate')||'').trim().toUpperCase(),brandModel:String(fd.get('brandModel')||'').trim(),
    chassis:String(fd.get('chassis')||'').trim(),engine:String(fd.get('engine')||'').trim(),year:String(fd.get('year')||'').trim(),
    color:String(fd.get('color')||'').trim(),fuel:String(fd.get('fuel')||'').trim(),
    fipeValue:String(fd.get('fipeValue')||'').trim(),minimumBid:String(fd.get('minimumBid')||'').trim(),photoDataUrl,
    sourceType:String(fd.get('sourceType')||'user'),officialUrl:String(fd.get('officialUrl')||'').trim(),
    additionalItems:String(fd.get('additionalItems')||'').split(/\r?\n/).map(line=>line.trim()).filter(Boolean).map(line=>{
      const [itemIdentifier='',description='',plate='',fipeValue='']=line.split('|').map(x=>x.trim());
      return {itemIdentifier,description,vehicle:description,plate,fipeValue};
    })
  });
  if (ok) { form.reset(); closeDialog(newLotDialog); }
});

$('#bulkLotsForm')?.addEventListener('submit',e=>{
  e.preventDefault();
  const a=activeAuction();
  if(!a) return;
  const fd=new FormData(e.currentTarget);
  const lines=String(fd.get('lotsBulk')||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  let added=0, skipped=0;
  for(const line of lines){
    const [rawNumber='',description='']=line.split('|').map(x=>x.trim());
    const n=Number(rawNumber.replace(/\D/g,''));
    if(!n || a.lots.some(l=>l.n===n)){ skipped++; continue; }
    const lot=freshLot(n,description);
    lot.items=description ? [freshItem({description,vehicle:description})] : [];
    a.lots.push(lot);
    added++;
  }
  a.lots.sort((x,y)=>x.n-y.n);
  saveState();
  renderAll();
  e.currentTarget.reset();
  closeDialog(bulkLotsDialog);
  alert(`${added} lote(s) cadastrado(s).${skipped ? ' ' + skipped + ' linha(s) ignorada(s) por número inválido ou lote já existente.' : ''}`);
});

$('#markNextBtn').addEventListener('click',()=>{markNextSold();window.scrollTo({top:0,behavior:'smooth'})});
$('#liveModeBtn').addEventListener('click',()=>{updateLiveMode();openDialog(liveDialog)});
$('#closeLiveBtn').addEventListener('click',()=>closeDialog(liveDialog));
$('#liveSoldBtn').addEventListener('click',toggleLiveSold);
$('#livePreferenceBtn').addEventListener('click',cycleLivePreference);
liveMaxBidInput?.addEventListener('change',saveLiveMaxBid);
liveMaxBidInput?.addEventListener('blur',saveLiveMaxBid);
$('#liveSkipBtn').addEventListener('click',skipLiveLot);
$('#liveBackBtn').addEventListener('click',backLiveLot);
$('#liveAuctionSelect').addEventListener('change',e=>{
  state.currentAuctionId=e.target.value;
  liveCursorByAuction.delete(e.target.value);
  saveState();
  renderAll();
});
$('#exportCsvBtn').addEventListener('click',exportCsv);
$('#printBtn').addEventListener('click',printSummary);
$('#backupJsonBtn').addEventListener('click',exportBackupJson);
$('#restoreJsonBtn').addEventListener('click',()=>$('#restoreJsonInput').click());
$('#restoreJsonInput').addEventListener('change',async e=>{
  const file=e.target.files?.[0];
  await restoreBackupJson(file);
  e.target.value='';
});

$('#resetBtn').addEventListener('click',()=>{
  if (!confirm('Reiniciar todos os dados locais do Sistema Thiago neste navegador? Esta ação remove leilões cadastrados, lotes, resultados e preferências locais.')) return;
  state=defaultState();
  localStorage.removeItem(storageKey());
  localStorage.setItem(storageKey(),JSON.stringify(state));
  liveCursorByAuction.clear();
  renderAll();
});

window.SISTEMA_THIAGO_APP = {
  getState:()=>JSON.parse(JSON.stringify(state)),
  replaceState:(nextState,{save=true}={})=>{
    state=normalizeState(nextState);
    liveCursorByAuction.clear();
    if(save) saveState();
    renderAll();
    return JSON.parse(JSON.stringify(state));
  },
  storageKey,
  currentSessionIdentity,
  renderAll,
  buildBackupPayload
};

renderAll();
showImportFeedback();
window.dispatchEvent(new CustomEvent('sistema-thiago:app-ready'));

window.addEventListener('storage',event=>{
  if(event.key!==storageKey() || !event.newValue) return;
  try{
    state=normalizeState(JSON.parse(event.newValue));
    liveCursorByAuction.clear();
    renderAll();
  }catch{}
});

$('#closePhotoViewerBtn')?.addEventListener('click',()=>closeDialog(photoViewerDialog));
photoViewerDialog?.addEventListener('click',event=>{
  if(event.target===photoViewerDialog) closeDialog(photoViewerDialog);
});
