-- ST-MNM-44D.1 — complemento para duas linhas PRF sem casas decimais no texto extraído.
-- A regra só aceita inteiro imediatamente antes de "DEL 8/6".

with target as (
  select l.id,
         (regexp_match(
           l.official_payload->>'rawOfficialRow',
           '([0-9]{2,6})[[:space:]]+DEL[[:space:]]+8/6',
           'i'
         ))[1] raw_money
  from public.lots l
  join public.auctions a on a.id=l.auction_id
  where a.source_evidence->>'officialResultId'='prf-sc-02-2026'
    and l.minimum_bid is null
),
parsed as (
  select id,raw_money::numeric minimum_value
  from target
  where nullif(raw_money,'') is not null
)
update public.lots l
set minimum_bid=p.minimum_value,
    extra_data=coalesce(l.extra_data,'{}'::jsonb) || jsonb_build_object(
      'minimum_bid_recovered_from','official_payload.rawOfficialRow',
      'minimum_bid_parser_revision','ST-MNM-44D.1',
      'minimum_bid_recovered_at',now()
    ),
    updated_at=now()
from parsed p
where l.id=p.id;

update public.lot_items li
set minimum_bid=l.minimum_bid,
    extra_data=coalesce(li.extra_data,'{}'::jsonb) || jsonb_build_object(
      'minimum_bid_recovered_from','lot.official_payload.rawOfficialRow',
      'minimum_bid_parser_revision','ST-MNM-44D.1'
    ),
    updated_at=now()
from public.lots l
join public.auctions a on a.id=l.auction_id
where li.lot_id=l.id
  and a.source_evidence->>'officialResultId'='prf-sc-02-2026'
  and l.minimum_bid is not null
  and (select count(*) from public.lot_items x where x.lot_id=l.id)=1
  and li.minimum_bid is null;
