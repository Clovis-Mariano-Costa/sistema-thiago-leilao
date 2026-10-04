-- Sistema Thiago — criação segura da Base inicial pelo próprio usuário
-- Motivo: permitir criação idempotente do leilão de importação sem afrouxar RLS.
-- A função usa auth.uid(), exige e-mail confirmado e nunca aceita owner_id arbitrário.

create or replace function public.ensure_owned_auction(
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
set search_path = public, auth, private
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

revoke all on function public.ensure_owned_auction(text,text,text,text,jsonb,jsonb) from public;
grant execute on function public.ensure_owned_auction(text,text,text,text,jsonb,jsonb) to authenticated;

comment on function public.ensure_owned_auction(text,text,text,text,jsonb,jsonb) is
'Cria ou reutiliza um leilão pertencente ao usuário autenticado, exigindo e-mail confirmado. Não recebe owner_id externo.';
