const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

test('ST-MNM-37B cobre as FKs públicas sinalizadas pelo advisor',()=>{
  const sql=fs.readFileSync('supabase/migrations/20261005044344_index_public_foreign_keys.sql','utf8');

  for(const indexName of [
    'lot_fipe_candidates_selected_by_idx',
    'lot_fipe_candidates_source_media_id_idx',
    'lot_items_created_by_idx',
    'lot_media_source_document_id_idx',
    'user_lot_evidence_auction_id_idx'
  ]){
    assert.match(sql,new RegExp('create index if not exists '+indexName));
  }

  assert.match(sql,/lot_fipe_candidates\(selected_by\)/);
  assert.match(sql,/lot_fipe_candidates\(source_media_id\)/);
  assert.match(sql,/lot_items\(created_by\)/);
  assert.match(sql,/lot_media\(source_document_id\)/);
  assert.match(sql,/user_lot_evidence\(auction_id\)/);
  assert.doesNotMatch(sql,/private\.platform_authorities/);
});
