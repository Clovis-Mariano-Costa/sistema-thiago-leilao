-- Sistema Thiago — hardening do RPC de criação segura de leilão.
-- O RPC é intencionalmente executável apenas por authenticated.
-- Remove execução anônima/default e fixa search_path vazio para SECURITY DEFINER.

alter function public.ensure_owned_auction(text,text,text,text,jsonb,jsonb)
  set search_path = '';

revoke execute on function public.ensure_owned_auction(text,text,text,text,jsonb,jsonb) from anon;
revoke execute on function public.ensure_owned_auction(text,text,text,text,jsonb,jsonb) from public;
grant execute on function public.ensure_owned_auction(text,text,text,text,jsonb,jsonb) to authenticated;
