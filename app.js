const STORAGE_KEY = 'sistema-thiago-v3';
const LEGACY_KEY = 'sistema-thiago-leilao-v2';

const BASE_LOTS = [
  [15,'Ranger'],[18,'Kombi'],[20,'Renault Master'],[26,'Palio Weekend'],[27,'Palio Weekend'],
  [29,'Palio Weekend'],[30,'Palio Weekend'],[32,'Palio Weekend'],[48,'Palio Weekend'],[54,'Palio Weekend'],
  [55,'Palio Weekend'],[56,'Blazer'],[96,'Spin'],[101,'EcoSport'],[103,'HB20'],[104,'Duster'],
  [113,'Sprinter'],[120,'Citroën Jumper'],[121,'Ranger'],[125,'S10'],[126,'Sprinter'],[131,'Palio Weekend'],
  [138,'Spin'],[139,'Palio Weekend'],[170,'Sprinter'],[171,'Sprinter'],[172,'Sprinter'],[177,'Sprinter'],
  [180,'Honda XRE 300'],[202,'Scania'],[231,'Spin'],[243,'S10'],[245,'Ranger'],[259,'Duster'],
  [304,'Hilux'],[328,'Ranger'],[338,'S10']
];

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
  return {
    version: 3,
    currentUserId: 'thiago',
    users: [
      {
        id: 'thiago',
        name: 'Thiago',
        email: '',
        authMode: 'local_mvp',
        sourceType: 'user',
        note: 'Primeiro usuário operacional. Login verdadeiro ainda não ativado.'
      }
    ],
    currentAuctionId: 'thiago-base-inicial',
    auctions: [defaultAuction()]
  };
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
  merged.sourceType = merged.sourceType === 'official' ? 'official' : 'user';
  merged.sourceLabel = merged.sourceType === 'official' ? 'Fonte oficial' : 'Dados inseridos pelo usuário';
  delete merged.preference;
  return merged;
}

function migrateLegacy() {
  const state = defaultState();
  try {
    const legacy = JSON.parse(localStorage.getItem(LEGACY_KEY) || 'null');
    if (!legacy || typeof legacy !== 'object') return state;
    const auction = state.auctions[0];
    auction.lots = auction.lots.map(lot => {
      const saved = legacy[lot.n];
      return saved ? normalizeLot({ ...lot, ...saved }) : lot;
    });
  } catch {}
  return state;
}

function normalizeState(raw) {
  if (!raw || typeof raw !== 'object') return migrateLegacy();
  const base = defaultState();
  const next = {
    version: 3,
    currentUserId: raw.currentUserId || 'thiago',
    users: Array.isArray(raw.users) && raw.users.length ? raw.users : base.users,
    currentAuctionId: raw.currentAuctionId || base.currentAuctionId,
    auctions: Array.isArray(raw.auctions) && raw.auctions.length ? raw.auctions : base.auctions
  };

  next.auctions = next.auctions.map(a => ({
    id: a.id || crypto.randomUUID(),
    title: a.title || 'Leilão sem título',
    date: a.date || '',
    time: a.time || '',
    reference: a.reference || 'Sem referência',
    location: a.location || '',
    sourceType: a.sourceType === 'official' ? 'official' : 'user',
    sourceLabel: a.sourceType === 'official' ? 'Fonte oficial' : 'Dados inseridos pelo usuário',
    officialUrl: a.officialUrl || '',
    photoDataUrl: a.photoDataUrl || '',
    notes: a.notes || '',
    participants: Array.isArray(a.participants) ? a.participants : ['thiago'],
    createdBy: a.createdBy || 'thiago',
    createdAt: a.createdAt || new Date().toISOString(),
    lots: Array.isArray(a.lots) ? a.lots.map(normalizeLot).sort((x,y)=>x.n-y.n) : []
  }));

  if (!next.auctions.some(a => a.id === next.currentAuctionId)) {
    next.currentAuctionId = next.auctions[0]?.id || '';
  }
  return next;
}

function loadState() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    const state = raw ? normalizeState(raw) : migrateLegacy();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return state;
  } catch {
    return migrateLegacy();
  }
}

let state = loadState();
let filter = 'all';
let query = '';
const liveSkipped = new Set();

const $ = sel => document.querySelector(sel);
const list = $('#lotList');
const template = $('#lotCardTemplate');
const searchInput = $('#searchInput');
const chooseAuctionDialog = $('#chooseAuctionDialog');
const newAuctionDialog = $('#newAuctionDialog');
const newLotDialog = $('#newLotDialog');
const liveDialog = $('#liveDialog');

function saveState(showError = true) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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
  const unsold = auction.lots.filter(l => !l.sold);
  if (!unsold.length) return null;
  const candidate = unsold.find(l => !liveSkipped.has(`${auction.id}:${l.n}`));
  if (candidate) return candidate;
  for (const key of [...liveSkipped]) {
    if (key.startsWith(auction.id + ':')) liveSkipped.delete(key);
  }
  return unsold[0];
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
      <button class="secondary-btn agenda-open-btn" data-auction-id="${a.id}" type="button">Acompanhar</button>
    </article>`;
  }).join('');

  wrap.querySelectorAll('.agenda-open-btn').forEach(btn => btn.addEventListener('click', () => switchAuction(btn.dataset.auctionId)));
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
  const text = [
    lot.n, padLot(lot.n), lot.vehicle, lot.type, lot.plate, lot.brandModel, lot.chassis, lot.engine,
    lot.year, lot.color, lot.fuel, lot.minimumBid, lot.maxBid, lot.finalValue, lot.result, lot.note
  ].join(' ').toLowerCase();
  if (query && !text.includes(query)) return false;
  if (filter === 'waiting' && lot.sold) return false;
  if (filter === 'preference' && lot.preferenceLevel === 0) return false;
  if (filter === 'sold' && !lot.sold) return false;
  return true;
}

function bindLotText(card, selector, lot, field) {
  const input = card.querySelector(selector);
  if (!input) return;
  input.value = lot[field] || '';
  input.addEventListener('change', () => {
    lot[field] = input.value.trim();
    saveState();
    updateSummary();
    renderAgenda();
  });
}

function renderLots() {
  const a = activeAuction();
  list.innerHTML = '';
  if (!a) return;

  const next = nextPending(a);
  const visible = a.lots.filter(matches);
  $('#emptyState').hidden = visible.length !== 0;

  for (const lot of visible) {
    const card = template.content.firstElementChild.cloneNode(true);

    if (next?.n === lot.n) card.classList.add('is-next');
    if (lot.preferenceLevel > 0) card.classList.add('is-preference');
    if (lot.preferenceLevel >= 2) card.classList.add('is-priority');
    if (lot.sold) card.classList.add('is-sold');

    card.querySelector('.lot-number').textContent = `Lote ${padLot(lot.n)}`;
    card.querySelector('.vehicle-name').textContent = lot.vehicle;

    const badge = card.querySelector('.status-badge');
    badge.textContent = lot.sold ? 'Leiloado' : 'Aguardando';
    badge.className = `status-badge ${lot.sold ? 'sold' : 'waiting'}`;

    const lotSource = card.querySelector('.lot-source');
    lotSource.textContent = sourceLabel(lot);
    lotSource.className = `source-badge lot-source ${lot.sourceType === 'official' ? 'official-source' : 'user-source'}`;

    const extras = [lot.plate && `Placa ${lot.plate}`, lot.year, lot.color].filter(Boolean);
    card.querySelector('.lot-extra').textContent = extras.join(' • ');

    const resultChip = card.querySelector('.result-chip');
    if (lot.sold && lot.result) {
      resultChip.hidden = false;
      resultChip.textContent = lot.result;
    }

    const preferenceBtn = card.querySelector('.preference-btn');
    preferenceBtn.classList.toggle('on', lot.preferenceLevel > 0);
    preferenceBtn.classList.toggle('priority', lot.preferenceLevel >= 2);
    preferenceBtn.textContent = preferenceLabel(lot.preferenceLevel);
    preferenceBtn.addEventListener('click', () => {
      lot.preferenceLevel = (lot.preferenceLevel + 1) % 3;
      saveState();
      renderAll();
    });

    const statusBtn = card.querySelector('.status-btn');
    statusBtn.textContent = lot.sold ? '↶ Voltar para aguardando' : '✓ Marcar leiloado';
    statusBtn.classList.toggle('undo-action', lot.sold);
    statusBtn.addEventListener('click', () => {
      lot.sold = !lot.sold;
      if (!lot.sold) {
        lot.result = '';
        lot.finalValue = '';
      }
      liveSkipped.delete(`${a.id}:${lot.n}`);
      saveState();
      renderAll();
    });

    card.querySelector('.sold-details').hidden = !lot.sold;
    card.querySelector('.final-value-wrap').hidden = !lot.sold;

    const resultSelect = card.querySelector('.result-select');
    resultSelect.value = lot.result || '';
    resultSelect.addEventListener('change', () => {
      lot.result = resultSelect.value;
      saveState();
      renderAll();
    });

    bindLotText(card,'.minimum-bid-input',lot,'minimumBid');
    bindLotText(card,'.max-bid-input',lot,'maxBid');
    bindLotText(card,'.final-value-input',lot,'finalValue');
    bindLotText(card,'.note-input',lot,'note');
    bindLotText(card,'.lot-type-input',lot,'type');
    bindLotText(card,'.plate-input',lot,'plate');
    bindLotText(card,'.brand-model-input',lot,'brandModel');
    bindLotText(card,'.chassis-input',lot,'chassis');
    bindLotText(card,'.engine-input',lot,'engine');
    bindLotText(card,'.year-input',lot,'year');
    bindLotText(card,'.color-input',lot,'color');
    bindLotText(card,'.fuel-input',lot,'fuel');

    const vehicleLink = card.querySelector('.vehicle-data-link');
    vehicleLink.href = `fipe.html?q=${encodeURIComponent(lot.plate || lot.brandModel || lot.vehicle)}`;

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

  const next = nextPending(a);
  if (!next) {
    $('#liveLot').textContent = a.lots.length ? 'Concluído' : 'Sem lotes';
    $('#liveVehicle').textContent = a.lots.length ? 'Todos os lotes já foram acompanhados' : 'Cadastre lotes antes de iniciar';
    $('#livePreference').hidden = true;
    $('#liveMaxBid').hidden = true;
    $('#liveSoldBtn').disabled = true;
    $('#livePreferenceBtn').disabled = true;
    $('#liveSkipBtn').disabled = true;
    $('#liveVehicleLink').href = 'fipe.html';
    return;
  }

  $('#liveLot').textContent = `Lote ${padLot(next.n)}`;
  $('#liveVehicle').textContent = next.vehicle;
  $('#livePreference').hidden = next.preferenceLevel === 0;
  $('#livePreference').textContent = plainPreferenceLabel(next.preferenceLevel);
  $('#liveMaxBid').hidden = !next.maxBid;
  $('#liveMaxBid').textContent = next.maxBid ? `Nosso máximo: R$ ${next.maxBid}` : '';
  $('#livePreferenceBtn').disabled = false;
  $('#livePreferenceBtn').textContent = preferenceLabel(next.preferenceLevel);
  $('#liveSkipBtn').disabled = false;
  $('#liveSoldBtn').disabled = false;
  $('#liveSoldBtn').textContent = 'LEILOADO';
  $('#liveVehicleLink').href = `fipe.html?q=${encodeURIComponent(next.plate || next.brandModel || next.vehicle)}`;
}

function renderAll() {
  renderActiveAuctionHeader();
  renderAgenda();
  renderChooseAuctions();
  renderLots();
  updateSummary();
  updateLiveMode();
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
    id,
    title: data.title,
    date: data.date,
    time: data.time || '',
    reference: data.reference,
    location: data.location || '',
    sourceType: data.sourceType === 'official' ? 'official' : 'user',
    sourceLabel: data.sourceType === 'official' ? 'Fonte oficial' : 'Dados inseridos pelo usuário',
    officialUrl: data.officialUrl || '',
    photoDataUrl: data.photoDataUrl || '',
    notes: data.notes || '',
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
  a.lots.push(freshLot(n,data.vehicle,{
    type:data.type || '',
    plate:data.plate || '',
    brandModel:data.brandModel || '',
    chassis:data.chassis || '',
    engine:data.engine || '',
    year:data.year || '',
    color:data.color || '',
    fuel:data.fuel || '',
    minimumBid:data.minimumBid || '',
    sourceType:data.sourceType === 'official' ? 'official' : 'user',
    sourceLabel:data.sourceType === 'official' ? 'Fonte oficial' : 'Dados inseridos pelo usuário',
    officialUrl:data.officialUrl || ''
  }));
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
  liveSkipped.delete(`${a.id}:${next.n}`);
  saveState();
  renderAll();
}

function cycleLivePreference() {
  const next = nextPending();
  if (!next) return;
  next.preferenceLevel = (next.preferenceLevel + 1) % 3;
  saveState();
  renderAll();
}

function skipLiveLot() {
  const a = activeAuction();
  const next = nextPending(a);
  if (!a || !next) return;
  liveSkipped.add(`${a.id}:${next.n}`);
  updateLiveMode();
  updateSummary();
  renderLots();
}

function csvCell(value) {
  return `"${String(value ?? '').replaceAll('"','""')}"`;
}

function exportCsv() {
  const a = activeAuction();
  if (!a) return;
  const header = ['Leilão','Data','Referência','Lote','Tipo','Veículo/item','Placa','Marca/modelo','Chassi','Motor','Ano','Cor','Combustível','Lance mínimo','Nosso máximo','Status','Preferência','Resultado','Valor final','Observação','Fonte'];
  const rows = a.lots.map(l => [
    a.title,formatDate(a.date,a.time),a.reference,padLot(l.n),l.type,l.vehicle,l.plate,l.brandModel,l.chassis,l.engine,l.year,l.color,l.fuel,
    l.minimumBid,l.maxBid,l.sold?'Leiloado':'Aguardando',plainPreferenceLabel(l.preferenceLevel)||'Não',l.result,l.finalValue,l.note,sourceLabel(l)
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
  const rows = a.lots.map(l=>`<tr>
    <td>${padLot(l.n)}</td><td>${escapeHtml(l.vehicle)}</td><td>${escapeHtml(l.plate||'—')}</td>
    <td>${escapeHtml(l.minimumBid ? 'R$ '+l.minimumBid : '—')}</td><td>${escapeHtml(l.maxBid ? 'R$ '+l.maxBid : '—')}</td>
    <td>${l.sold?'Leiloado':'Aguardando'}</td><td>${escapeHtml(l.result||'—')}</td><td>${escapeHtml(l.finalValue ? 'R$ '+l.finalValue : '—')}</td>
  </tr>`).join('');
  const frame=document.createElement('iframe');
  Object.assign(frame.style,{position:'fixed',right:'0',bottom:'0',width:'0',height:'0',border:'0'});
  document.body.appendChild(frame);
  const doc=frame.contentDocument;
  doc.open();
  doc.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(a.title)}</title><style>
  body{font-family:Arial,sans-serif;margin:24px;color:#111}h1{margin-bottom:5px}.meta{color:#555}table{width:100%;border-collapse:collapse;font-size:11px;margin-top:20px}th,td{border:1px solid #bbb;padding:6px;text-align:left}th{background:#eee}.warning{margin-top:18px;font-size:10px;color:#666}
  </style></head><body><h1>${escapeHtml(a.title)}</h1><p class="meta">${escapeHtml(formatDate(a.date,a.time))} • ${escapeHtml(a.reference)} • ${a.lots.length} lotes • ${sold} leiloados</p>
  <table><thead><tr><th>Lote</th><th>Veículo</th><th>Placa</th><th>Lance mínimo</th><th>Nosso máximo</th><th>Status</th><th>Resultado</th><th>Valor final</th></tr></thead><tbody>${rows}</tbody></table>
  <p class="warning">MVP em validação. A origem de cada dado deve ser conferida antes de uso externo.</p></body></html>`);
  doc.close();
  setTimeout(()=>{frame.contentWindow.focus();frame.contentWindow.print();setTimeout(()=>frame.remove(),1000)},150);
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

$('#newLotForm').addEventListener('submit',e=>{
  e.preventDefault();
  const form=e.currentTarget;
  const fd=new FormData(form);
  const ok=addLotToActive({
    lotNumber:fd.get('lotNumber'),vehicle:String(fd.get('vehicle')||'').trim(),type:String(fd.get('type')||'').trim(),
    plate:String(fd.get('plate')||'').trim().toUpperCase(),brandModel:String(fd.get('brandModel')||'').trim(),
    chassis:String(fd.get('chassis')||'').trim(),engine:String(fd.get('engine')||'').trim(),year:String(fd.get('year')||'').trim(),
    color:String(fd.get('color')||'').trim(),fuel:String(fd.get('fuel')||'').trim(),minimumBid:String(fd.get('minimumBid')||'').trim(),
    sourceType:String(fd.get('sourceType')||'user'),officialUrl:String(fd.get('officialUrl')||'').trim()
  });
  if (ok) { form.reset(); closeDialog(newLotDialog); }
});

$('#markNextBtn').addEventListener('click',()=>{markNextSold();window.scrollTo({top:0,behavior:'smooth'})});
$('#liveModeBtn').addEventListener('click',()=>{updateLiveMode();openDialog(liveDialog)});
$('#closeLiveBtn').addEventListener('click',()=>closeDialog(liveDialog));
$('#liveSoldBtn').addEventListener('click',markNextSold);
$('#livePreferenceBtn').addEventListener('click',cycleLivePreference);
$('#liveSkipBtn').addEventListener('click',skipLiveLot);
$('#liveAuctionSelect').addEventListener('change',e=>{state.currentAuctionId=e.target.value;saveState();renderAll()});
$('#exportCsvBtn').addEventListener('click',exportCsv);
$('#printBtn').addEventListener('click',printSummary);

$('#resetBtn').addEventListener('click',()=>{
  if (!confirm('Reiniciar todos os dados locais do Sistema Thiago neste navegador? Esta ação remove leilões cadastrados, lotes, resultados e preferências locais.')) return;
  state=defaultState();
  localStorage.removeItem(STORAGE_KEY);
  localStorage.setItem(STORAGE_KEY,JSON.stringify(state));
  liveSkipped.clear();
  renderAll();
});

renderAll();
