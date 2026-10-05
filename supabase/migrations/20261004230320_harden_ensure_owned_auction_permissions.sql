-- RECONCILIACAO DE HISTORICO — 2026-10-04
-- Versao alinhada ao historico remoto Supabase 20261004230320.
-- Conteudo funcional derivado do arquivo Git anterior 20261004230500_harden_ensure_owned_auction_permissions.sql.

-- Sistema Thiago — hardening do RPC de criação segura de leilão.
-- O RPC é intencionalmente executável apenas por authenticated.
-- Remove execução anônima/default e fixa search_path vazio para SECURITY DEFINER.

alter function public.ensure_owned_auction(text,text,text,text,jsonb,jsonb)
  set search_path = '';

revoke execute on function public.ensure_owned_auction(text,text,text,text,jsonb,jsonb) from anon;
revoke execute on function public.ensure_owned_auction(text,text,text,text,jsonb,jsonb) from public;
grant execute on function public.ensure_owned_auction(text,text,text,text,jsonb,jsonb) to authenticated;
