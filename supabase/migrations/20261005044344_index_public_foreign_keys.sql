-- ST-MNM-37B — índices de cobertura para FKs públicas sinalizadas pelo advisor.
-- Limita-se às tabelas do Sistema Thiago em public; private.platform_authorities
-- fica fora deste pacote por pertencer a uma camada privada/governança.

create index if not exists lot_fipe_candidates_selected_by_idx
  on public.lot_fipe_candidates(selected_by);

create index if not exists lot_fipe_candidates_source_media_id_idx
  on public.lot_fipe_candidates(source_media_id);

create index if not exists lot_items_created_by_idx
  on public.lot_items(created_by);

create index if not exists lot_media_source_document_id_idx
  on public.lot_media(source_document_id);

create index if not exists user_lot_evidence_auction_id_idx
  on public.user_lot_evidence(auction_id);
