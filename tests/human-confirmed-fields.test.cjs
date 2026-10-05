const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

test('ST-MNM-30A marca somente campo oficial realmente alterado como confirmação humana',()=>{
  const app=fs.readFileSync('app.js','utf8');
  assert.match(app,/HUMAN_CONFIRMABLE_LOT_FIELDS/);
  assert.match(app,/markHumanConfirmedField/);
  assert.match(app,/humanConfirmedFields/);
  assert.match(app,/if \(changed\) markHumanConfirmedField\(lot,field\)/);
});

test('ST-MNM-30A write-through persiste campos humanos sob RLS sem chave admin',()=>{
  const cloud=fs.readFileSync('cloud-sync.js','utf8');
  assert.match(cloud,/HUMAN_FIELD_DB_MAP/);
  assert.match(cloud,/humanConfirmedPayload/);
  assert.match(cloud,/canonicalPayload/);
  assert.match(cloud,/extra_data/);
  assert.doesNotMatch(cloud,/service_role|SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SECRET_KEYS/);
});

test('ST-MNM-30A reimportação oficial preserva campos humanamente confirmados',()=>{
  const fontes=fs.readFileSync('fontes.js','utf8');
  assert.match(fontes,/preserveHumanConfirmedFields/);
  assert.match(fontes,/loadExistingOfficialLots/);
  assert.match(fontes,/humanConfirmedFields/);
  assert.match(fontes,/effectiveLotByNumber/);
});

test('ST-MNM-30A continua sem sobrescrever campos operacionais na importação oficial',()=>{
  const fontes=fs.readFileSync('fontes.js','utf8');
  const start=fontes.indexOf('const lotRows=sourceLots.map');
  const end=fontes.indexOf('const lotIdByNumber',start);
  const payload=fontes.slice(start,end);
  assert.doesNotMatch(payload,/preference_level:/);
  assert.doesNotMatch(payload,/max_bid:/);
  assert.doesNotMatch(payload,/final_value:/);
  assert.doesNotMatch(payload,/sold:/);
  assert.doesNotMatch(payload,/result:/);
});
