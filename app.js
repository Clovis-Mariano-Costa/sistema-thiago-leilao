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
  return { preference: false, sold: false, result: '', note: '' };
}

function initialState() {
  return Object.fromEntries(lots.map(lot => [lot.n, freshLotState()]));
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    const base = initialState();
    if (!saved || typeof saved !== 'object') return base;
    for (const lot of lots) {
      if (saved[lot.n]) base[lot.n] = { ...freshLotState(), ...saved[lot.n] };
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
const markNextBtn = document.querySelector('#markNextBtn');

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

function updateSummary() {
  const sold = lots.filter(l => current(l).sold).length;
  const waiting = lots.length - sold;
  const preferences = lots.filter(l => current(l).preference).length;

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
    nextPreference.hidden = !s.preference;
    markNextBtn.disabled = false;
    markNextBtn.textContent = `Leiloado • lote ${padLot(next.n)}`;
  } else {
    nextLot.textContent = 'Concluído';
    nextVehicle.textContent = 'Todos os lotes cadastrados já foram acompanhados';
    nextPreference.hidden = true;
    markNextBtn.disabled = true;
    markNextBtn.textContent = 'Acompanhamento concluído';
  }
}

function matches(lot) {
  const s = current(lot);
  const text = `${lot.n} ${padLot(lot.n)} ${lot.vehicle} ${s.result || ''} ${s.note || ''}`.toLowerCase();
  if (query && !text.includes(query)) return false;
  if (filter === 'waiting' && s.sold) return false;
  if (filter === 'preference' && !s.preference) return false;
  if (filter === 'sold' && !s.sold) return false;
  return true;
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
    if (s.preference) card.classList.add('is-preference');
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
    preferenceBtn.classList.toggle('on', s.preference);
    preferenceBtn.setAttribute('aria-pressed', String(s.preference));
    preferenceBtn.textContent = s.preference ? '★ Preferência' : '☆ Preferência';
    preferenceBtn.addEventListener('click', () => {
      state[lot.n].preference = !state[lot.n].preference;
      save();
      render();
    });

    const statusBtn = card.querySelector('.status-btn');
    statusBtn.textContent = s.sold ? '↶ Voltar para aguardando' : '✓ Marcar leiloado';
    statusBtn.classList.toggle('undo-action', s.sold);
    statusBtn.addEventListener('click', () => {
      state[lot.n].sold = !state[lot.n].sold;
      if (!state[lot.n].sold) state[lot.n].result = '';
      save();
      render();
    });

    const soldDetails = card.querySelector('.sold-details');
    soldDetails.hidden = !s.sold;

    const resultSelect = card.querySelector('.result-select');
    resultSelect.value = s.result || '';
    resultSelect.addEventListener('change', () => {
      state[lot.n].result = resultSelect.value;
      save();
      render();
    });

    const note = card.querySelector('.note-input');
    note.value = s.note || '';
    note.addEventListener('change', () => {
      state[lot.n].note = note.value.trim();
      save();
    });

    list.appendChild(card);
  }

  updateSummary();
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

markNextBtn.addEventListener('click', () => {
  const next = nextPending();
  if (!next) return;
  state[next.n].sold = true;
  save();
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

document.querySelector('#resetBtn').addEventListener('click', () => {
  if (!confirm('Reiniciar todo o acompanhamento? Isso apaga status, preferências, resultados e observações salvos neste navegador.')) return;
  state = initialState();
  save();
  render();
});

render();
