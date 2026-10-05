-- ST-MNM-44D — recuperar valor mínimo PRF a partir do rawOfficialRow oficial já preservado.
-- Só atua no resultado oficial prf-sc-02-2026 e apenas quando minimum_bid está vazio.

with target as (
  select l.id,l.lot_number,l.official_payload->>'rawOfficialRow' raw_row,
         coalesce(
           (regexp_match(l.official_payload->>'rawOfficialRow','([0-9]{1,3}(?:\\.[0-9]{3})*,[0-9]{2})','i'))[1],
           (regexp_match(l.official_payload->>'rawOfficialRow','\\b([0-9]{2,6})\\s+(?:(?:DOCA|CALDERAN|SUDE\\s*STE|TET\\s*O)\\s*-\\s*)?DEL\\s+8/6\\b','i'))[1]
         ) raw_money
  from public.lots l
  join public.auctions a on a.id=l.auction_id
  where a.source_evidence->>'officialResultId'='prf-sc-02-2026'
    and l.minimum_bid is null
),
parsed as (
  select id,lot_number,raw_money,
         case when raw_money like '%,%'
           then replace(replace(raw_money,'.',''),',','.')::numeric
           else raw_money::numeric
         end minimum_value
  from target
  where nullif(raw_money,'') is not null
)
update public.lots l
set minimum_bid=p.minimum_value,
    extra_data=coalesce(l.extra_data,'{}'::jsonb) || jsonb_build_object(
      'minimum_bid_recovered_from','official_payload.rawOfficialRow',
      'minimum_bid_parser_revision','ST-MNM-44D',
      'minimum_bid_recovered_at',now()
    ),
    updated_at=now()
from parsed p
where l.id=p.id;

-- PRF possui um item por lote; espelha o mínimo recuperado no item operacional.
update public.lot_items li
set minimum_bid=l.minimum_bid,
    extra_data=coalesce(li.extra_data,'{}'::jsonb) || jsonb_build_object(
      'minimum_bid_recovered_from','lot.official_payload.rawOfficialRow',
      'minimum_bid_parser_revision','ST-MNM-44D'
    ),
    updated_at=now()
from public.lots l
join public.auctions a on a.id=l.auction_id
where li.lot_id=l.id
  and a.source_evidence->>'officialResultId'='prf-sc-02-2026'
  and l.minimum_bid is not null
  and (select count(*) from public.lot_items x where x.lot_id=l.id)=1
  and li.minimum_bid is null;
