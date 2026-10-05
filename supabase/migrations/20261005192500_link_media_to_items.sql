-- ST-MNM-44C — vincular mídia privada ao item correto quando há prova exata.
-- Regra 1: source_label da mídia == source_media_label do item.
-- Regra 2 (fallback conservador): lote com exatamente um item.
-- Nunca escolhe arbitrariamente entre múltiplos itens.

with exact_matches as (
  select lm.id media_id, li.id item_id
  from public.lot_media lm
  join public.lot_items li on li.lot_id=lm.lot_id
  where lm.lot_item_id is null
    and nullif(btrim(lm.source_label),'') is not null
    and nullif(btrim(li.source_media_label),'') is not null
    and lower(btrim(lm.source_label))=lower(btrim(li.source_media_label))
),
unique_exact as (
  select media_id,min(item_id::text)::uuid item_id
  from exact_matches
  group by media_id
  having count(*)=1
)
update public.lot_media lm
set lot_item_id=ue.item_id,
    metadata=coalesce(lm.metadata,'{}'::jsonb) || jsonb_build_object(
      'item_link_method','exact_source_label',
      'item_linked_at',now()
    )
from unique_exact ue
where lm.id=ue.media_id
  and lm.lot_item_id is null;

with sole_items as (
  select lot_id,min(id::text)::uuid item_id
  from public.lot_items
  group by lot_id
  having count(*)=1
)
update public.lot_media lm
set lot_item_id=si.item_id,
    metadata=coalesce(lm.metadata,'{}'::jsonb) || jsonb_build_object(
      'item_link_method','sole_item_fallback',
      'item_linked_at',now()
    )
from sole_items si
where lm.lot_id=si.lot_id
  and lm.lot_item_id is null;
