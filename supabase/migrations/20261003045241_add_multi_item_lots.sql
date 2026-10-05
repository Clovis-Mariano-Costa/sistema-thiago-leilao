-- RECONCILIACAO DE HISTORICO — 2026-10-04
-- Versao alinhada ao historico remoto Supabase 20261003045241.
-- Conteudo funcional derivado do arquivo Git anterior 20261003005000_add_multi_item_lots.sql.
-- O arquivo anterior permanece no historico Git; esta versao alinha a pasta migrations ao remoto.

create table if not exists public.lot_items (
  id uuid primary key default gen_random_uuid(),
  lot_id uuid not null references public.lots(id) on delete cascade,
  item_order integer not null default 1 check (item_order > 0),
  item_identifier text,
  description text,
  item_type text,
  vehicle text,
  plate text,
  brand_model text,
  chassis text,
  engine text,
  model_year text,
  color text,
  fuel text,
  licensing text,
  city text,
  state text,
  source_type public.source_kind not null default 'user',
  source_media_label text,
  source_evidence jsonb not null default '{}'::jsonb,
  extra_data jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (lot_id, item_order)
);

create index if not exists lot_items_lot_id_idx on public.lot_items(lot_id);
create index if not exists lot_items_identifier_idx on public.lot_items(item_identifier);

alter table public.lot_media
  add column if not exists lot_item_id uuid references public.lot_items(id) on delete cascade;
create index if not exists lot_media_lot_item_id_idx on public.lot_media(lot_item_id);

alter table public.lot_fipe_candidates
  add column if not exists lot_item_id uuid references public.lot_items(id) on delete cascade;
create index if not exists lot_fipe_candidates_lot_item_id_idx on public.lot_fipe_candidates(lot_item_id);

alter table public.lot_items enable row level security;

drop policy if exists lot_items_select on public.lot_items;
create policy lot_items_select on public.lot_items for select to authenticated
using (exists (select 1 from public.lots l where l.id=lot_items.lot_id and private.can_view_auction(l.auction_id)));

drop policy if exists lot_items_insert on public.lot_items;
create policy lot_items_insert on public.lot_items for insert to authenticated
with check (
  private.is_email_confirmed()
  and (created_by is null or created_by=(select auth.uid()))
  and exists (select 1 from public.lots l where l.id=lot_items.lot_id and private.can_edit_lots(l.auction_id))
);

drop policy if exists lot_items_update on public.lot_items;
create policy lot_items_update on public.lot_items for update to authenticated
using (exists (select 1 from public.lots l where l.id=lot_items.lot_id and private.can_edit_lots(l.auction_id)))
with check (
  private.is_email_confirmed()
  and exists (select 1 from public.lots l where l.id=lot_items.lot_id and private.can_edit_lots(l.auction_id))
);

drop policy if exists lot_items_delete on public.lot_items;
create policy lot_items_delete on public.lot_items for delete to authenticated
using (exists (select 1 from public.lots l where l.id=lot_items.lot_id and private.can_edit_lots(l.auction_id)));

comment on table public.lot_items is 'Itens individuais pertencentes a um lote. Um lote pode conter um ou muitos itens.';
comment on column public.lot_items.item_identifier is 'Identificador observado na fonte do item; não deve ser silenciosamente substituído por outro identificador.';
