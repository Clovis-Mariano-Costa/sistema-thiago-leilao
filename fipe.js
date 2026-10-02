const refs = Array.isArray(window.USER_VEHICLE_REFERENCES) ? window.USER_VEHICLE_REFERENCES : [];
const list = document.querySelector('#referenceList');
const input = document.querySelector('#referenceSearch');
const empty = document.querySelector('#referenceEmpty');
const count = document.querySelector('#referenceCount');

function esc(v){
  return String(v ?? '')
    .replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
    .replaceAll('"','&quot;').replaceAll("'",'&#039;');
}

function optionHtml(opt){
  return `<div class="fipe-option">
    <div>
      <strong>${esc(opt.brand || '')}</strong>
      <span>${esc(opt.model || '')}</span>
    </div>
    <div class="fipe-option-meta">
      <span>Código ${esc(opt.code || '—')}</span>
      <span>${esc(opt.year || '—')}</span>
      <span>${esc(opt.fuel || '—')}</span>
      <strong>${opt.value ? 'R$ ' + esc(opt.value) : 'Valor não legível'}</strong>
    </div>
  </div>`;
}

function cardHtml(item){
  const flags = [
    item.partialCapture ? '<span class="review-flag">Captura parcial</span>' : '',
    item.needsReview ? '<span class="review-flag">Revisar leitura</span>' : ''
  ].join('');

  return `<article class="reference-card">
    <div class="source-row">
      <span class="source-badge user-source">Dados inseridos pelo usuário</span>
      ${flags}
    </div>
    <div class="reference-title-row">
      <div>
        <h2>${esc(item.vehicle || 'Referência veicular')}</h2>
        <p class="muted">${esc(item.imageName || '')}</p>
      </div>
      ${item.plate ? `<span class="plate-chip">${esc(item.plate)}</span>` : ''}
    </div>

    <dl class="reference-data-grid">
      <div><dt>Município/UF</dt><dd>${esc(item.cityUf || '—')}</dd></div>
      <div><dt>Chassi exibido</dt><dd>${esc(item.chassis || '—')}</dd></div>
      <div><dt>Ano</dt><dd>${esc(item.year || '—')}</dd></div>
      <div><dt>Cor</dt><dd>${esc(item.color || '—')}</dd></div>
      <div><dt>Licenciamento</dt><dd>${esc(item.licensing || '—')}</dd></div>
      <div><dt>Referência mostrada</dt><dd>${esc(item.referenceMonth || '—')}</dd></div>
    </dl>

    <div class="reference-note">
      <strong>Importante:</strong> estes dados foram transcritos de imagem enviada pelo usuário. O sistema não afirma que placa, chassi ou opção FIPE tenham sido confirmados em fonte oficial.
    </div>

    <div class="fipe-options">
      <h3>Opções FIPE mostradas na captura</h3>
      ${(item.fipeOptions || []).map(optionHtml).join('') || '<p class="muted">Nenhuma opção legível nesta captura.</p>'}
    </div>
  </article>`;
}

function matches(item,q){
  if(!q) return true;
  const text = [
    item.vehicle,item.plate,item.cityUf,item.chassis,item.year,item.color,item.licensing,item.referenceMonth,item.imageName,
    ...(item.fipeOptions || []).flatMap(o => [o.brand,o.model,o.code,o.year,o.fuel,o.value])
  ].join(' ').toLowerCase();
  return text.includes(q);
}

function render(){
  const q = input.value.trim().toLowerCase();
  const filtered = refs.filter(item => matches(item,q));
  count.textContent = filtered.length;
  list.innerHTML = filtered.map(cardHtml).join('');
  empty.hidden = filtered.length !== 0;
}

const params = new URLSearchParams(location.search);
const initial = params.get('q') || '';
input.value = initial;
input.addEventListener('input',render);
render();
