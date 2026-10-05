-- Sistema Thiago — reduzir superfície privilegiada do RPC ensure_owned_auction.
-- Mantém o nome público usado pelo frontend, mas o wrapper exposto passa a SECURITY INVOKER.
-- A lógica privilegiada fica no schema private, fora da API pública por padrão.
-- O helper deriva owner exclusivamente de auth.uid(), exige e-mail confirmado e não aceita owner_id externo.

create or replace function private.ensure_owned_auction_impl(
  p_title text,
  p_reference text default null,
  p_source_label text default null,
  p_notes text default null,
  p_source_evidence jsonb default '{}'::jsonb,
  p_extra_data jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED' using errcode='28000';
  end if;

  if not private.is_email_confirmed() then
    raise exception 'EMAIL_NOT_CONFIRMED' using errcode='42501';
  end if;

  select a.id
    into v_id
  from public.auctions a
  where a.owner_id = v_uid
    and a.title = p_title
  order by a.created_at
  limit 1;

  if v_id is null then
    insert into public.auctions(
      owner_id,title,reference,source_type,source_label,notes,source_evidence,extra_data
    )
    values(
      v_uid,p_title,p_reference,'user',p_source_label,p_notes,
      coalesce(p_source_evidence,'{}'::jsonb),
      coalesce(p_extra_data,'{}'::jsonb)
    )
    returning id into v_id;
  end if;

  return v_id;
end;
$$;

revoke all on function private.ensure_owned_auction_impl(text,text,text,text,jsonb,jsonb) from public;
revoke all on function private.ensure_owned_auction_impl(text,text,text,text,jsonb,jsonb) from anon;
grant execute on function private.ensure_owned_auction_impl(text,text,text,text,jsonb,jsonb) to authenticated;

create or replace function public.ensure_owned_auction(
  p_title text,
  p_reference text default null,
  p_source_label text default null,
  p_notes text default null,
  p_source_evidence jsonb default '{}'::jsonb,
  p_extra_data jsonb default '{}'::jsonb
)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select private.ensure_owned_auction_impl(
    p_title,
    p_reference,
    p_source_label,
    p_notes,
    p_source_evidence,
    p_extra_data
  );
$$;

revoke all on function public.ensure_owned_auction(text,text,text,text,jsonb,jsonb) from public;
revoke all on function public.ensure_owned_auction(text,text,text,text,jsonb,jsonb) from anon;
grant execute on function public.ensure_owned_auction(text,text,text,text,jsonb,jsonb) to authenticated;

comment on function private.ensure_owned_auction_impl(text,text,text,text,jsonb,jsonb) is
'Implementacao privilegiada interna da criacao idempotente de leilao. Usa auth.uid(), exige email confirmado e permanece fora do schema exposto.';

comment on function public.ensure_owned_auction(text,text,text,text,jsonb,jsonb) is
'Wrapper SECURITY INVOKER exposto ao cliente autenticado; delega para helper privado privilegiado sem aceitar owner_id externo.';
