-- RECONCILIACAO DE HISTORICO — 2026-10-04
-- Versao alinhada ao historico remoto Supabase 20261002222219.
-- Conteudo funcional derivado de supabase/002_harden_security_and_indexes.sql.
-- Este arquivo reconstrói o estado versionado; nao afirma ser byte-a-byte o SQL historico originalmente executado.

-- Complemento aplicado na PoC Supabase em 2026-10-02.
-- Endurece search_path e cobre FKs apontadas pelo advisor.

alter function public.set_updated_at() set search_path = public;

create index if not exists auction_members_invited_by_idx on public.auction_members(invited_by);
create index if not exists audit_actor_idx on public.audit_log(actor_user_id);
create index if not exists fipe_auction_idx on public.fipe_references(auction_id);
create index if not exists invitations_accepted_by_idx on public.invitations(accepted_by);
create index if not exists invitations_auction_idx on public.invitations(auction_id);
create index if not exists invitations_invited_by_idx on public.invitations(invited_by);
create index if not exists lots_created_by_idx on public.lots(created_by);
create index if not exists source_documents_auction_idx on public.source_documents(auction_id);
create index if not exists source_documents_source_idx on public.source_documents(source_id);
