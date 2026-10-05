-- ST-MNM-37D — idempotência fail-closed do ensure_owned_auction.
-- Serializa owner+título para impedir corrida concorrente e recusa ambiguidades
-- já existentes em vez de escolher uma linha arbitrariamente.

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
  v_count integer;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED' using errcode='28000';
  end if;

  if not private.is_email_confirmed() then
    raise exception 'EMAIL_NOT_CONFIRMED' using errcode='42501';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_uid::text || '|' || coalesce(p_title,''),0)
  );

  select count(*)::integer
    into v_count
  from public.auctions a
  where a.owner_id = v_uid
    and a.title = p_title;

  if v_count > 1 then
    raise exception 'DUPLICATE_OWNED_AUCTION'
      using errcode='P0001',
            detail='Mais de um leilao do mesmo titulo pertence ao usuario autenticado.',
            hint='Resolva a divergencia na tela Integridade antes de importar novamente.';
  end if;

  if v_count = 1 then
    select a.id
      into v_id
    from public.auctions a
    where a.owner_id = v_uid
      and a.title = p_title
    order by a.created_at
    limit 1;
    return v_id;
  end if;

  insert into public.auctions(
    owner_id,title,reference,source_type,source_label,notes,source_evidence,extra_data
  )
  values(
    v_uid,p_title,p_reference,'user',p_source_label,p_notes,
    coalesce(p_source_evidence,'{}'::jsonb),
    coalesce(p_extra_data,'{}'::jsonb)
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function private.ensure_owned_auction_impl(text,text,text,text,jsonb,jsonb) from public;
revoke all on function private.ensure_owned_auction_impl(text,text,text,text,jsonb,jsonb) from anon;
grant execute on function private.ensure_owned_auction_impl(text,text,text,text,jsonb,jsonb) to authenticated;

comment on function private.ensure_owned_auction_impl(text,text,text,text,jsonb,jsonb) is
'Implementacao interna fail-closed: serializa owner+titulo, exige email confirmado, reutiliza exatamente uma linha e recusa ambiguidades em vez de escolher uma duplicata.';
