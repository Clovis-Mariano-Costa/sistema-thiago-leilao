const fs=require('node:fs');
const test=require('node:test');
const assert=require('node:assert/strict');

const html=fs.readFileSync('app.html','utf8');
const js=fs.readFileSync('whatsapp-import.js','utf8');
const build=fs.readFileSync('scripts/build-pages.cjs','utf8');

test('painel expõe gateway Importar Pacote sem IDs duplicados',()=>{
  assert.match(html,/data-import-package/);
  assert.match(html,/id="importPackageInput"/);
  assert.equal((html.match(/id="importPackageInput"/g)||[]).length,1);
  assert.equal((html.match(/data-import-package/g)||[]).length,2);
  const dashboardIndex=html.indexOf('data-import-package');
  const activePanelIndex=html.indexOf('id="activeAuctionPanel"');
  assert.ok(dashboardIndex > -1 && activePanelIndex > -1 && dashboardIndex < activePanelIndex,'importador deve ficar visível antes do painel de leilão ativo');
  assert.match(html,/whatsapp-import\.js/);
  assert.match(js,/buttons\.forEach\(button=>button\.addEventListener/);
  assert.doesNotMatch(js,/^button\?\.addEventListener/m);
});

test('adaptador aceita manifesto seguro legado e preserva múltiplos itens do mesmo lote',()=>{
  assert.match(js,/raw\.entries/);
  assert.match(js,/lot_mentions/);
  assert.match(js,/legacy_safe_staging_v1/);
  assert.match(js,/item_order/);
  assert.match(js,/uniqueLotEntries/);
  assert.match(js,/legacy_message_sequence_requires_review/);
});

test('importador exige sessão confirmada e usa Storage privado',()=>{
  assert.match(js,/auth\.getUser\(\)/);
  assert.match(js,/email_confirmed_at/);
  assert.match(js,/storage\.from\('auction-media'\)/);
  assert.match(js,/Leilão Thiago — Base inicial/);
  assert.doesNotMatch(js,/service_role/i);
  assert.doesNotMatch(js,/getPublicUrl/);
});

test('build publica o importador sem publicar o pacote privado',()=>{
  assert.match(build,/whatsapp-import\.js/);
  assert.doesNotMatch(build,/IMG-20261002-WA0008/);
  assert.doesNotMatch(build,/manifest_importacao_thiago/);
});

test('importador renova sessão, protege snapshot e trata bloqueio RLS sem perder a base',()=>{
  assert.match(js,/refreshSession\(\)/);
  assert.match(js,/auth\.getUser\(\)/);
  assert.match(js,/user_state_snapshots/);
  assert.match(js,/Base inicial preservada neste navegador e no backup online/);
  assert.match(js,/ensure_owned_auction/);
});


test('upload preserva MIME real aceito pelo Storage privado',()=>{
  assert.match(js,/mimeTypeForName/);
  assert.match(js,/image\/jpeg/);
  assert.match(js,/image\/png/);
  assert.match(js,/image\/webp/);
  assert.match(js,/async\('uint8array'\)/);
  assert.match(js,/new File\(\[bytes\],name,\{type:mimeType\}\)/);
  assert.match(js,/contentType:mimeType/);
  assert.doesNotMatch(js,/contentType:'image\/jpeg'/);
});

test('pacote pode ser vinculado a uma conta sem expor o e-mail em código público',()=>{
  assert.match(js,/expected_account_email_sha256/);
  assert.match(js,/crypto\.subtle\.digest\('SHA-256'/);
  assert.match(js,/assertPackageTargetAccount\(manifest,user\)/);
  assert.match(js,/foi preparado para outra conta/);
});

test('erro parcial não afirma falsamente que nada foi gravado',()=>{
  assert.match(js,/As etapas já concluídas permanecem protegidas/);
  assert.doesNotMatch(js,/Importação interrompida:[^\n]+Nenhum dado foi promovido a oficial/);
});


test('importador persiste candidatos FIPE por lote e item sem selecionar automaticamente',()=>{
  assert.match(js,/replaceLotFipeCandidates/);
  assert.match(js,/lot_fipe_candidates/);
  assert.match(js,/lot_item_id:itemId/);
  assert.match(js,/verification_status:'user_reference'/);
  assert.match(js,/is_selected:false/);
  assert.match(js,/review_required:true/);
});

test('mensagem final informa vínculos FIPE por item',()=>{
  assert.match(js,/referências FIPE \(\$\{lotFipeCount\} vínculos por item\)/);
});

test('ST-MNM-37D bloqueia Base inicial ambígua antes de escrever',()=>{
  const migration=fs.readFileSync('supabase/migrations/20261005045312_harden_ensure_owned_auction_idempotency.sql','utf8');
  assert.match(js,/\.order\('created_at',\{ascending:true\}\)/);
  assert.match(js,/\.limit\(3\)/);
  assert.match(js,/\(found\|\|\[\]\)\.length>1/);
  assert.match(js,/Integridade bloqueou a importação/);
  assert.match(js,/DUPLICATE_OWNED_AUCTION/);
  assert.match(migration,/pg_advisory_xact_lock/);
  assert.match(migration,/hashtextextended/);
  assert.match(migration,/if v_count > 1 then/);
  assert.match(migration,/DUPLICATE_OWNED_AUCTION/);
  assert.match(migration,/private\.is_email_confirmed\(\)/);
});


test('ST-MNM-40G duplicidade aponta reconciliação assistida em vez de ação impossível',()=>{
  assert.match(js,/Reconciliação assistida/);
  assert.match(js,/não exclua dados manualmente/);
  assert.doesNotMatch(js,/Abra Integridade e reconcilie a duplicata antes de importar novamente/);
});
