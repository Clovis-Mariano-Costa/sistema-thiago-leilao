const BASE_REFS = Array.isArray(window.USER_VEHICLE_REFERENCES) ? window.USER_VEHICLE_REFERENCES : [];
const USER_FIPE_KEY = 'sistema-thiago-fipe-user-v1';

const list = document.querySelector('#referenceList');
const input = document.querySelector('#referenceSearch');
const empty = document.querySelector('#referenceEmpty');
const count = document.querySelector('#referenceCount');
const dialog = document.querySelector('#fipeDataDialog');
const singleForm = document.querySelector('#singleFipeForm');
const bulkForm = document.querySelector('#bulkFipeForm');
const bulkFile = document.querySelector('#bulkFipeFile');
const bulkText = document.querySelector('#bulkFipeText');
const bulkStatus = document.querySelector('#bulkFipeStatus');

function esc(v){
  return String(v ?? '')
    .replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
    .replaceAll('"','&quot;').replaceAll("'",'&#039;');
}

function loadUserRefs(){
  try{
    const value = JSON.parse(localStorage.getItem(USER_FIPE_KEY) || '[]');
    return Array.isArray(value) ? value : [];
  }catch{return []}
}

let userRefs = loadUserRefs();

function saveUserRefs(){
  localStorage.setItem(USER_FIPE_KEY,JSON.stringify(userRefs));
}

function allRefs(){
  return [...BASE_REFS.map(x=>({...x,userCreated:false})), ...userRefs.map(x=>({...x,userCreated:true}))];
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
      <strong>${opt.value ? 'R$ ' + esc(opt.value) : 'Valor não informado'}</strong>
    </div>
  </div>`;
}

function cardHtml(item){
  const flags = [
    item.partialCapture ? '<span class="review-flag">Captura parcial</span>' : '',
    item.needsReview ? '<span class="review-flag">Revisar leitura</span>' : '',
    item.consultedOfficial ? '<span class="review-flag">Usuário informou consulta na FIPE oficial</span>' : ''
  ].join('');

  const extras = Object.entries(item.extraFields || {});
  const sourceLink = item.sourceUrl
    ? `<a class="secondary-link compact" href="${esc(item.sourceUrl)}" target="_blank" rel="noopener">Abrir URL informada</a>`
    : '';

  const mediaRuntime=window.SISTEMA_THIAGO_FIPE_MEDIA_URLS || {};
  const imageKey=String(item.imageName||'').trim();
  const imageUrl=imageKey ? (mediaRuntime[imageKey] || mediaRuntime[imageKey.split(/[\\/]/).pop()] || '') : '';
  const imageHtml=imageUrl
    ? `<figure class="fipe-reference-media">
        <img src="${esc(imageUrl)}" alt="Imagem de referência de ${esc(item.vehicle || item.plate || 'veículo')}" loading="lazy" />
        <figcaption>${esc(imageKey)}</figcaption>
      </figure>`
    : '';

  return `<article class="reference-card">
    <div class="source-row">
      <span class="source-badge user-source">Dados inseridos pelo usuário</span>
      ${flags}
    </div>
    ${imageHtml}
    <div class="reference-title-row">
      <div>
        <h2>${esc(item.vehicle || 'Referência veicular')}</h2>
        <p class="muted">${esc(item.imageName || (item.userCreated ? 'Cadastro manual/importado' : ''))}</p>
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
      <strong>Proveniência:</strong> cadastro manual ou dado transcrito pelo usuário não é promovido automaticamente a dado oficial.
      ${item.consultedOfficial ? ' O usuário declarou que realizou consulta no canal oficial da FIPE.' : ''}
    </div>

    <div class="fipe-options">
      <h3>Dados / opções FIPE</h3>
      ${(item.fipeOptions || []).map(optionHtml).join('') || '<p class="muted">Nenhuma opção FIPE cadastrada.</p>'}
    </div>

    ${item.note ? `<p class="reference-note">${esc(item.note)}</p>` : ''}
    ${extras.length ? `<details class="official-extra"><summary>Campos adicionais (${extras.length})</summary><div>${extras.map(([k,v])=>`<p><strong>${esc(k)}:</strong> ${esc(typeof v==='object'?JSON.stringify(v):v)}</p>`).join('')}</div></details>` : ''}

    <div class="official-card-actions">
      ${sourceLink}
      ${item.userCreated ? `<button class="danger-btn delete-user-fipe-btn" data-id="${esc(item.id)}" type="button">Apagar dado</button>` : ''}
    </div>
  </article>`;
}

function matches(item,q){
  if(!q) return true;
  const text = [
    item.vehicle,item.plate,item.cityUf,item.chassis,item.year,item.color,item.licensing,item.referenceMonth,item.imageName,item.note,item.sourceUrl,
    ...(item.fipeOptions || []).flatMap(o => [o.brand,o.model,o.code,o.year,o.fuel,o.value]),
    ...Object.entries(item.extraFields || {}).flat()
  ].join(' ').toLowerCase();
  return text.includes(q);
}

function render(){
  const q = input.value.trim().toLowerCase();
  const filtered = allRefs().filter(item => matches(item,q));
  count.textContent = filtered.length;
  list.innerHTML = filtered.map(cardHtml).join('');
  empty.hidden = filtered.length !== 0;

  list.querySelectorAll('.delete-user-fipe-btn').forEach(btn=>btn.addEventListener('click',()=>{
    const item = userRefs.find(x=>x.id===btn.dataset.id);
    if(!item) return;
    if(!confirm(`Apagar o dado FIPE de "${item.vehicle || item.plate || 'registro selecionado'}"?`)) return;
    userRefs = userRefs.filter(x=>x.id!==btn.dataset.id);
    saveUserRefs();
    render();
  }));
}

function makeId(){
  return 'fipe-user-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,7);
}

function cleanKey(value){
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'');
}

const KEY_MAP = {
  veiculo:'vehicle',vehicle:'vehicle',identificacao:'vehicle',
  placa:'plate',municipiouf:'cityUf',cidadeuf:'cityUf',cityuf:'cityUf',
  chassi:'chassis',chassis:'chassis',ano:'year',anoveiculo:'year',
  cor:'color',color:'color',licenciamento:'licensing',
  referencia:'referenceMonth',mesreferencia:'referenceMonth',mesdereferencia:'referenceMonth',referencemonth:'referenceMonth',
  marca:'brand',brand:'brand',modelo:'model',model:'model',
  codigo:'code',codigofipe:'code',code:'code',
  anomodelo:'fipeYear',anofipe:'fipeYear',fipeyear:'fipeYear',
  combustivel:'fuel',fuel:'fuel',valor:'value',valorfipe:'value',preco:'value',value:'value',
  url:'sourceUrl',fonte:'sourceUrl',sourceurl:'sourceUrl',
  observacao:'note',observacoes:'note',nota:'note',note:'note'
};

function normalizeRaw(raw, consultedOfficial=false){
  const known = {};
  const extraFields = {};
  Object.entries(raw || {}).forEach(([key,value])=>{
    if(key==='fipeOptions' || key==='extraFields' || key==='consultedOfficial') return;
    const mapped = KEY_MAP[cleanKey(key)] || (['vehicle','plate','cityUf','chassis','year','color','licensing','referenceMonth','brand','model','code','fipeYear','fuel','value','sourceUrl','note'].includes(key) ? key : '');
    if(mapped) known[mapped] = value == null ? '' : String(value).trim();
    else extraFields[key] = value;
  });

  const existingOptions = Array.isArray(raw?.fipeOptions) ? raw.fipeOptions : [];
  const option = {
    brand:known.brand || '',
    model:known.model || '',
    code:known.code || '',
    year:known.fipeYear || '',
    fuel:known.fuel || '',
    value:known.value || ''
  };
  const hasOption = Object.values(option).some(Boolean);

  return {
    id: raw?.id && String(raw.id).startsWith('fipe-user-') ? raw.id : makeId(),
    imageName:'',
    vehicle:known.vehicle || raw?.vehicle || '',
    plate:(known.plate || raw?.plate || '').toUpperCase(),
    cityUf:known.cityUf || raw?.cityUf || '',
    chassis:known.chassis || raw?.chassis || '',
    year:known.year || raw?.year || '',
    color:known.color || raw?.color || '',
    licensing:known.licensing || raw?.licensing || '',
    referenceMonth:known.referenceMonth || raw?.referenceMonth || '',
    fipeOptions: existingOptions.length ? existingOptions : (hasOption ? [option] : []),
    sourceUrl:known.sourceUrl || raw?.sourceUrl || '',
    note:known.note || raw?.note || '',
    consultedOfficial:Boolean(raw?.consultedOfficial || consultedOfficial),
    extraFields:{...(raw?.extraFields || {}),...extraFields},
    createdAt:new Date().toISOString()
  };
}

function parseCsv(text){
  const lines = String(text || '').replace(/^\uFEFF/,'').split(/\r?\n/).filter(line=>line.trim());
  if(lines.length < 2) return [];
  const delimiter = (lines[0].match(/;/g)||[]).length >= (lines[0].match(/,/g)||[]).length ? ';' : ',';

  const splitLine = line => {
    const out=[]; let cur=''; let quoted=false;
    for(let i=0;i<line.length;i++){
      const ch=line[i];
      if(ch==='"'){
        if(quoted && line[i+1]==='"'){cur+='"';i++;}
        else quoted=!quoted;
      }else if(ch===delimiter && !quoted){out.push(cur);cur='';}
      else cur+=ch;
    }
    out.push(cur);
    return out.map(v=>v.trim());
  };

  const headers=splitLine(lines[0]);
  return lines.slice(1).map(line=>{
    const values=splitLine(line);
    return Object.fromEntries(headers.map((h,i)=>[h,values[i] ?? '']));
  });
}

function parseBulk(text){
  const trimmed=String(text || '').trim();
  if(!trimmed) return [];
  if(trimmed.startsWith('[') || trimmed.startsWith('{')){
    const parsed=JSON.parse(trimmed);
    return Array.isArray(parsed) ? parsed : [parsed];
  }
  return parseCsv(trimmed);
}

function openDialog(){
  if(typeof dialog.showModal==='function') dialog.showModal();
  else dialog.setAttribute('open','');
}
function closeDialog(){
  if(typeof dialog.close==='function'){try{dialog.close()}catch{}}
  else dialog.removeAttribute('open');
}

function setMode(mode){
  document.querySelectorAll('[data-fipe-mode]').forEach(b=>b.classList.toggle('active',b.dataset.fipeMode===mode));
  singleForm.hidden = mode !== 'single';
  bulkForm.hidden = mode !== 'bulk';
}

document.querySelector('#openFipeInsertBtn').addEventListener('click',()=>{setMode('single');openDialog()});
document.querySelector('#closeFipeDialogBtn').addEventListener('click',closeDialog);
document.querySelector('#cancelSingleFipeBtn').addEventListener('click',closeDialog);
document.querySelector('#cancelBulkFipeBtn').addEventListener('click',closeDialog);
document.querySelectorAll('[data-fipe-mode]').forEach(btn=>btn.addEventListener('click',()=>setMode(btn.dataset.fipeMode)));

singleForm.addEventListener('submit',e=>{
  e.preventDefault();
  const fd=new FormData(singleForm);
  const raw=Object.fromEntries([...fd.entries()].filter(([k])=>k!=='consultedOfficial'));
  const item=normalizeRaw(raw,fd.get('consultedOfficial')==='on');
  if(!item.vehicle && !item.plate && !(item.fipeOptions||[]).length){
    alert('Informe ao menos o veículo, a placa ou algum dado FIPE.');
    return;
  }
  userRefs.unshift(item);
  saveUserRefs();
  singleForm.reset();
  closeDialog();
  render();
});

bulkFile.addEventListener('change',async()=>{
  const file=bulkFile.files?.[0];
  if(!file) return;
  try{
    bulkText.value=await file.text();
    bulkStatus.textContent=`Arquivo carregado: ${file.name}`;
    bulkStatus.className='auth-status success';
  }catch{
    bulkStatus.textContent='Não foi possível ler o arquivo.';
    bulkStatus.className='auth-status error';
  }
});

bulkForm.addEventListener('submit',e=>{
  e.preventDefault();
  try{
    const rows=parseBulk(bulkText.value);
    if(!rows.length) throw new Error('Nenhum registro encontrado.');
    const consulted=document.querySelector('#bulkConsultedOfficial').checked;
    const normalized=rows.map(row=>normalizeRaw(row,consulted));
    userRefs=[...normalized,...userRefs];
    saveUserRefs();
    bulkStatus.textContent=`${normalized.length} registro(s) importado(s).`;
    bulkStatus.className='auth-status success';
    bulkForm.reset();
    setTimeout(()=>{closeDialog();render()},500);
  }catch(error){
    bulkStatus.textContent='Não foi possível importar: '+(error?.message || error);
    bulkStatus.className='auth-status error';
  }
});

const params = new URLSearchParams(location.search);
const initial = params.get('q') || '';
input.value = initial;
input.addEventListener('input',render);
render();


window.addEventListener('sistema-thiago:media-ready',()=>{
  render();
});
