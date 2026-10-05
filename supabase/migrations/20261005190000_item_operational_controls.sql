-- ST-MNM-44B — controle operacional por item
-- O lote continua como contêiner. Cada item passa a poder ter seus próprios
-- valores operacionais, status, preferência e resultado.

alter table public.lot_items
  add column if not exists fipe_value numeric,
  add column if not exists minimum_bid numeric,
  add column if not exists max_bid numeric,
  add column if not exists final_value numeric,
  add column if not exists preference_level smallint not null default 0,
  add column if not exists sold boolean not null default false,
  add column if not exists result text,
  add column if not exists note text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.lot_items'::regclass
      and conname='lot_items_preference_level_check'
  ) then
    alter table public.lot_items
      add constraint lot_items_preference_level_check
      check (preference_level between 0 and 2);
  end if;
end $$;

-- Identificador interno somente quando a fonte não trouxe um identificador.
-- Nunca substitui item_identifier existente.
update public.lot_items li
set item_identifier =
      'ST-L' || lpad(l.lot_number::text,3,'0') ||
      '-I' || lpad(li.item_order::text,2,'0'),
    extra_data = coalesce(li.extra_data,'{}'::jsonb) || jsonb_build_object(
      'generated_identifier', true,
      'generated_identifier_origin', 'sistema_thiago',
      'generated_identifier_at', now()
    ),
    updated_at = now()
from public.lots l
where l.id=li.lot_id
  and nullif(btrim(li.item_identifier),'') is null;

-- Compatibilidade: para lotes que têm exatamente um item, promove os valores
-- operacionais já existentes no lote para esse único item, sem sobrescrever
-- qualquer valor de item que já exista.
with single_items as (
  select li.id,li.lot_id
  from public.lot_items li
  join (
    select lot_id
    from public.lot_items
    group by lot_id
    having count(*)=1
  ) one on one.lot_id=li.lot_id
)
update public.lot_items li
set fipe_value=coalesce(li.fipe_value,l.fipe_value),
    minimum_bid=coalesce(li.minimum_bid,l.minimum_bid),
    max_bid=coalesce(li.max_bid,l.max_bid),
    final_value=coalesce(li.final_value,l.final_value),
    preference_level=case when li.preference_level=0 then coalesce(l.preference_level,0) else li.preference_level end,
    sold=case when li.sold=false then coalesce(l.sold,false) else li.sold end,
    result=coalesce(li.result,l.result),
    note=coalesce(li.note,l.note),
    updated_at=now()
from single_items si
join public.lots l on l.id=si.lot_id
where li.id=si.id;

comment on column public.lot_items.fipe_value is 'Valor FIPE operacional do item; não implica confirmação oficial da referência.';
comment on column public.lot_items.minimum_bid is 'Lance/valor mínimo do item quando individualizado pela fonte ou confirmado pelo usuário.';
comment on column public.lot_items.max_bid is 'Nosso máximo para este item.';
comment on column public.lot_items.preference_level is 'Preferência operacional do item: 0 normal, 1 preferência, 2 prioridade.';
comment on column public.lot_items.sold is 'Situação operacional do item dentro do lote.';
comment on column public.lot_items.item_identifier is 'Identificador da fonte ou, quando ausente, identificador interno estável gerado pelo Sistema Thiago.';
