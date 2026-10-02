const STORAGE_KEY = 'sistema-thiago-leilao-v2';

const lots = [
  { n: 15, vehicle: 'Ranger' },
  { n: 18, vehicle: 'Kombi' },
  { n: 20, vehicle: 'Renault Master' },
  { n: 26, vehicle: 'Palio Weekend' },
  { n: 27, vehicle: 'Palio Weekend' },
  { n: 29, vehicle: 'Palio Weekend' },
  { n: 30, vehicle: 'Palio Weekend' },
  { n: 32, vehicle: 'Palio Weekend' },
  { n: 48, vehicle: 'Palio Weekend' },
  { n: 54, vehicle: 'Palio Weekend' },
  { n: 55, vehicle: 'Palio Weekend' },
  { n: 56, vehicle: 'Blazer' },
  { n: 96, vehicle: 'Spin' },
  { n: 101, vehicle: 'EcoSport' },
  { n: 103, vehicle: 'HB20' },
  { n: 104, vehicle: 'Duster' },
  { n: 113, vehicle: 'Sprinter' },
  { n: 120, vehicle: 'Citroën Jumper' },
  { n: 121, vehicle: 'Ranger' },
  { n: 125, vehicle: 'S10' },
  { n: 126, vehicle: 'Sprinter' },
  { n: 131, vehicle: 'Palio Weekend' },
  { n: 138, vehicle: 'Spin' },
  { n: 139, vehicle: 'Palio Weekend' },
  { n: 170, vehicle: 'Sprinter' },
  { n: 171, vehicle: 'Sprinter' },
  { n: 172, vehicle: 'Sprinter' },
  { n: 177, vehicle: 'Sprinter' },
  { n: 180, vehicle: 'Honda XRE 300' },
  { n: 202, vehicle: 'Scania' },
  { n: 231, vehicle: 'Spin' },
  { n: 243, vehicle: 'S10' },
  { n: 245, vehicle: 'Ranger' },
  { n: 259, vehicle: 'Duster' },
  { n: 304, vehicle: 'Hilux' },
  { n: 328, vehicle: 'Ranger' },
  { n: 338, vehicle: 'S10' }
].sort((a, b) => a.n - b.n);

function freshLotState() {
  return {
    preferenceLevel: 0,
    sold: false,
    result: '',
    note: '',
    maxBid: '',
    finalValue: ''
  };
}

function initialState() {
  return Object.fromEntries(lots.map(lot => [lot.n, freshLotState()]));
}

function normalizeSavedLot(savedLot) {
  const next = { ...freshLotState(), ...(savedLot || {}) };
  if (typeof savedLot?.preference === 'boolean' && savedLot.preferenceLevel == null) {
    next.preferenceLevel = savedLot.preference ? 1 : 0;
  }
  next.preferenceLevel = Math.max(0, Math.min(2, Number(next.preferenceLevel) || 0));
  delete next.preference;
  return next;
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    const base = initialState();
    if (!saved || typeof saved !== 'object') return base;
    for (const lot of lots) {
      if (saved[lot.n]) base[lot.n] = normalizeSavedLot(saved[lot.n]);
    }
    return base;
  } catch {
    return initialState();
  }
}

let state = loadState();
let filter = 'all';
let query = '';

const list = document.querySelector('#lotList');
const template = document.querySelector('#lotCardTemplate');
const searchInput = document.querySelector('#searchInput');
const nextLot = document.querySelector('#nextLot');
const nextVehicle = document.querySelector('#nextVehicle');
const nextPreference = document.querySelector('#nextPreference');
const nextMaxBid = document.querySelector('#nextMaxBid');
const markNextBtn = document.querySelector('#markNextBtn');
const liveDialog = document.querySelector('#liveDialog');
const liveLot = document.querySelector('#liveLot');
const liveVehicle = document.querySelector('#liveVehicle');
const livePreference = document.querySelector('#livePreference');
const liveMaxBid = document.querySelector('#liveMaxBid');
const liveSoldBtn = document.querySelector('#liveSoldBtn');

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function padLot(n) {
  return String(n).padStart(3, '0');
}

function current(lot) {
  return state[lot.n] || freshLotState();
}

function nextPending() {
  return lots.find(lot => !current(lot).sold);
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

function updateLiveMode() {
  const next = nextPending();
  if (!next) {
    liveLot.textContent = 'Concluído';
    liveVehicle.textContent = 'Todos os lotes já foram acompanhados';
    livePreference.hidden = true;
    liveMaxBid.hidden = true;
    liveSoldBtn.disabled = true;
    liveSoldBtn.textContent = 'CONCLUÍDO';
    return;
  }

  const s = current(next);
  liveLot.textContent = `Lote ${padLot(next.n)}`;
  liveVehicle.textContent = next.vehicle;

  livePreference.hidden = s.preferenceLevel === 0;
  livePreference.textContent = plainPreferenceLabel(s.preferenceLevel);

  liveMaxBid.hidden = !s.maxBid;
  liveMaxBid.textContent = s.maxBid ? `Máximo: R$ ${s.maxBid}` : '';

  liveSoldBtn.disabled = false;
  liveSoldBtn.textContent = 'LEILOADO';
}

function updateSummary() {
  const sold = lots.filter(l => current(l).sold).length;
  const waiting = lots.length - sold;
  const preferences = lots.filter(l => current(l).preferenceLevel > 0).length;

  document.querySelector('#totalCount').textContent = lots.length;
  document.querySelector('#waitingCount').textContent = waiting;
  document.querySelector('#preferenceCount').textContent = preferences;
  document.querySelector('#soldCount').textContent = sold;

  const pct = lots.length ? Math.round((sold / lots.length) * 100) : 0;
  document.querySelector('#progressText').textContent = `${pct}%`;
  document.querySelector('#progressBar').style.width = `${pct}%`;

  const next = nextPending();
  if (next) {
    const s = current(next);
    nextLot.textContent = `Lote ${padLot(next.n)}`;
    nextVehicle.textContent = next.vehicle;
    nextPreference.hidden = s.preferenceLevel === 0;
    nextPreference.textContent = plainPreferenceLabel(s.preferenceLevel);
    nextMaxBid.hidden = !s.maxBid;
    nextMaxBid.textContent = s.maxBid ? `Máximo: R$ ${s.maxBid}` : '';
    markNextBtn.disabled = false;
    markNextBtn.textContent = `Leiloado • lote ${padLot(next.n)}`;
  } else {
    nextLot.textContent = 'Concluído';
    nextVehicle.textContent = 'Todos os lotes cadastrados já foram acompanhados';
    nextPreference.hidden = true;
    nextMaxBid.hidden = true;
    markNextBtn.disabled = true;
    markNextBtn.textContent = 'Acompanhamento concluído';
  }

  updateLiveMode();
}

function matches(lot) {
  const s = current(lot);
  const text = `${lot.n} ${padLot(lot.n)} ${lot.vehicle} ${s.result || ''} ${s.note || ''} ${s.maxBid || ''} ${s.finalValue || ''}`.toLowerCase();
  if (query && !text.includes(query)) return false;
  if (filter === 'waiting' && s.sold) return false;
  if (filter === 'preference' && s.preferenceLevel === 0) return false;
  if (filter === 'sold' && !s.sold) return false;
  return true;
}

function bindTextField(card, selector, lot, field) {
  const input = card.querySelector(selector);
  input.value = current(lot)[field] || '';
  input.addEventListener('change', () => {
    state[lot.n][field] = input.value.trim();
    save();
    updateSummary();
  });
}

function render() {
  const next = nextPending();
  list.innerHTML = '';
  const visible = lots.filter(matches);
  document.querySelector('#emptyState').hidden = visible.length !== 0;

  for (const lot of visible) {
    const s = current(lot);
    const card = template.content.firstElementChild.cloneNode(true);

    if (next?.n === lot.n) card.classList.add('is-next');
    if (s.preferenceLevel > 0) card.classList.add('is-preference');
    if (s.preferenceLevel >= 2) card.classList.add('is-priority');
    if (s.sold) card.classList.add('is-sold');

    card.querySelector('.lot-number').textContent = `Lote ${padLot(lot.n)}`;
    card.querySelector('.vehicle-name').textContent = lot.vehicle;

    const badge = card.querySelector('.status-badge');
    badge.textContent = s.sold ? 'Leiloado' : 'Aguardando';
    badge.className = `status-badge ${s.sold ? 'sold' : 'waiting'}`;

    const resultChip = card.querySelector('.result-chip');
    if (s.sold && s.result) {
      resultChip.hidden = false;
      resultChip.textContent = s.result;
    }

    const preferenceBtn = card.querySelector('.preference-btn');
    preferenceBtn.classList.toggle('on', s.preferenceLevel > 0);
    preferenceBtn.classList.toggle('priority', s.preferenceLevel >= 2);
    preferenceBtn.setAttribute('aria-pressed', String(s.preferenceLevel > 0));
    preferenceBtn.textContent = preferenceLabel(s.preferenceLevel);
    preferenceBtn.title = 'Toque para alternar: sem preferência → preferência → prioridade';
    preferenceBtn.addEventListener('click', () => {
      state[lot.n].preferenceLevel = (state[lot.n].preferenceLevel + 1) % 3;
      save();
      render();
    });

    const statusBtn = card.querySelector('.status-btn');
    statusBtn.textContent = s.sold ? '↶ Voltar para aguardando' : '✓ Marcar leiloado';
    statusBtn.classList.toggle('undo-action', s.sold);
    statusBtn.addEventListener('click', () => {
      state[lot.n].sold = !state[lot.n].sold;
      if (!state[lot.n].sold) {
        state[lot.n].result = '';
        state[lot.n].finalValue = '';
      }
      save();
      render();
    });

    const soldDetails = card.querySelector('.sold-details');
    soldDetails.hidden = !s.sold;

    const finalValueWrap = card.querySelector('.final-value-wrap');
    finalValueWrap.hidden = !s.sold;

    const resultSelect = card.querySelector('.result-select');
    resultSelect.value = s.result || '';
    resultSelect.addEventListener('change', () => {
      state[lot.n].result = resultSelect.value;
      save();
      render();
    });

    bindTextField(card, '.max-bid-input', lot, 'maxBid');
    bindTextField(card, '.final-value-input', lot, 'finalValue');
    bindTextField(card, '.note-input', lot, 'note');

    list.appendChild(card);
  }

  updateSummary();
}

function csvCell(value) {
  const text = String(value ?? '');
  return `"${text.replaceAll('"', '""')}"`;
}

function exportCsv() {
  const header = ['Lote', 'Veículo', 'Status', 'Preferência', 'Resultado', 'Valor máximo', 'Valor final', 'Observação'];
  const rows = lots.map(lot => {
    const s = current(lot);
    return [
      padLot(lot.n),
      lot.vehicle,
      s.sold ? 'Leiloado' : 'Aguardando',
      plainPreferenceLabel(s.preferenceLevel) || 'Não',
      s.result || '',
      s.maxBid || '',
      s.finalValue || '',
      s.note || ''
    ];
  });

  const csv = '\uFEFF' + [header, ...rows].map(row => row.map(csvCell).join(';')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `resultado-leilao-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function printSummary() {
  const sold = lots.filter(l => current(l).sold).length;
  const prefs = lots.filter(l => current(l).preferenceLevel > 0).length;
  const rows = lots.map(lot => {
    const s = current(lot);
    return `<tr>
      <td>${padLot(lot.n)}</td>
      <td>${escapeHtml(lot.vehicle)}</td>
      <td>${s.sold ? 'Leiloado' : 'Aguardando'}</td>
      <td>${escapeHtml(plainPreferenceLabel(s.preferenceLevel) || '—')}</td>
      <td>${escapeHtml(s.result || '—')}</td>
      <td>${escapeHtml(s.maxBid ? 'R$ ' + s.maxBid : '—')}</td>
      <td>${escapeHtml(s.finalValue ? 'R$ ' + s.finalValue : '—')}</td>
      <td>${escapeHtml(s.note || '—')}</td>
    </tr>`;
  }).join('');

  const frame = document.createElement('iframe');
  frame.style.position = 'fixed';
  frame.style.right = '0';
  frame.style.bottom = '0';
  frame.style.width = '0';
  frame.style.height = '0';
  frame.style.border = '0';
  document.body.appendChild(frame);

  const doc = frame.contentDocument;
  doc.open();
  doc.write(`<!doctype html><html><head><meta charset="utf-8"><title>Resultado do leilão</title>
    <style>
      body{font-family:Arial,sans-serif;color:#111;margin:24px}h1{margin:0 0 6px}.meta{color:#555;margin:0 0 20px}
      table{width:100%;border-collapse:collapse;font-size:11px}th,td{border:1px solid #bbb;padding:6px;text-align:left;vertical-align:top}
      th{background:#eee}small{color:#666}
    </style></head><body>
    <h1>Sistema Thiago — Resultado do leilão</h1>
    <p class="meta">${lots.length} lotes • ${sold} leiloados • ${prefs} preferências • gerado em ${new Date().toLocaleString('pt-BR')}</p>
    <table><thead><tr><th>Lote</th><th>Veículo</th><th>Status</th><th>Preferência</th><th>Resultado</th><th>Máximo</th><th>Final</th><th>Observação</th></tr></thead><tbody>${rows}</tbody></table>
    <p><small>MVP sem garantia de segurança. Relatório gerado a partir dos dados salvos neste navegador.</small></p>
    </body></html>`);
  doc.close();

  setTimeout(() => {
    frame.contentWindow.focus();
    frame.contentWindow.print();
    setTimeout(() => frame.remove(), 1000);
  }, 150);
}

searchInput.addEventListener('input', e => {
  query = e.target.value.trim().toLowerCase();
  render();
});

document.querySelectorAll('.chip').forEach(btn => btn.addEventListener('click', () => {
  document.querySelectorAll('.chip').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  filter = btn.dataset.filter;
  render();
}));

function markNextSold() {
  const next = nextPending();
  if (!next) return;
  state[next.n].sold = true;
  save();
  render();
}

markNextBtn.addEventListener('click', () => {
  markNextSold();
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

document.querySelector('#liveModeBtn').addEventListener('click', () => {
  updateLiveMode();
  if (typeof liveDialog.showModal === 'function') liveDialog.showModal();
  else liveDialog.setAttribute('open', '');
});

document.querySelector('#closeLiveBtn').addEventListener('click', () => liveDialog.close());
liveSoldBtn.addEventListener('click', markNextSold);

document.querySelector('#exportCsvBtn').addEventListener('click', exportCsv);
document.querySelector('#printBtn').addEventListener('click', printSummary);

document.querySelector('#resetBtn').addEventListener('click', () => {
  if (!confirm('Reiniciar todo o acompanhamento? Isso apaga status, preferências, valores, resultados e observações salvos neste navegador.')) return;
  state = initialState();
  save();
  render();
});

render();
