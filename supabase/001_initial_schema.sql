-- Sistema Thiago — PoC Supabase
-- Versão inicial para teste com dados sintéticos.
-- NÃO contém credenciais, chaves ou dados reais.

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'auction_member_role') then
    create type public.auction_member_role as enum ('owner','admin','participant','observer');
  end if;
  if not exists (select 1 from pg_type where typname = 'source_kind') then
    create type public.source_kind as enum ('official','user');
  end if;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.auctions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete restrict,
  title text not null default 'Leilão sem título',
  auction_date date,
  auction_time time,
  reference text,
  location text,
  source_type public.source_kind not null default 'user',
  source_label text,
  official_url text,
  notes text,
  cover_path text,
  official_payload jsonb,
  source_evidence jsonb,
  extra_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.auction_members (
  auction_id uuid not null references public.auctions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.auction_member_role not null default 'observer',
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (auction_id,user_id)
);

create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  auction_id uuid not null references public.auctions(id) on delete cascade,
  email text not null,
  role public.auction_member_role not null default 'observer',
  status text not null default 'pending' check (status in ('pending','accepted','revoked','expired')),
  invited_by uuid not null references auth.users(id) on delete restrict,
  expires_at timestamptz,
  accepted_by uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  extra_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.lots (
  id uuid primary key default gen_random_uuid(),
  auction_id uuid not null references public.auctions(id) on delete cascade,
  lot_number integer not null check (lot_number > 0),
  vehicle text,
  item_type text,
  plate text,
  brand_model text,
  chassis text,
  engine text,
  model_year text,
  color text,
  fuel text,
  fipe_value numeric(14,2),
  minimum_bid numeric(14,2),
  max_bid numeric(14,2),
  final_value numeric(14,2),
  preference_level smallint not null default 0 check (preference_level between 0 and 2),
  sold boolean not null default false,
  result text,
  note text,
  source_type public.source_kind not null default 'user',
  official_url text,
  photo_path text,
  official_payload jsonb,
  source_evidence jsonb,
  extra_data jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (auction_id,lot_number)
);

create table if not exists public.fipe_references (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  auction_id uuid references public.auctions(id) on delete cascade,
  vehicle text,
  plate text,
  city_uf text,
  chassis text,
  vehicle_year text,
  color text,
  licensing text,
  reference_month text,
  brand text,
  model text,
  fipe_code text,
  fipe_year text,
  fuel text,
  fipe_value numeric(14,2),
  source_type public.source_kind not null default 'user',
  official_url text,
  user_reported_official_consultation boolean not null default false,
  note text,
  extra_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.official_sources (
  id text primary key,
  name text not null,
  agency text,
  scope text,
  kind text,
  url text not null,
  search_url text,
  method text,
  status text,
  last_verified date,
  active boolean not null default true,
  extra_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.source_search_runs (
  id uuid primary key default gen_random_uuid(),
  source_id text not null references public.official_sources(id) on delete cascade,
  query text,
  status text not null default 'started' check (status in ('started','success','no_results','partial','error')),
  found_count integer not null default 0,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  error_message text,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.source_documents (
  id uuid primary key default gen_random_uuid(),
  source_id text not null references public.official_sources(id) on delete cascade,
  auction_id uuid references public.auctions(id) on delete set null,
  title text,
  reference text,
  document_url text not null,
  published_at timestamptz,
  fetched_at timestamptz,
  content_hash text,
  storage_path text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_log (
  id bigint generated by default as identity primary key,
  actor_user_id uuid references auth.users(id) on delete set null,
  auction_id uuid references public.auctions(id) on delete set null,
  entity_type text not null,
  entity_id text,
  action text not null,
  before_data jsonb,
  after_data jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists auctions_owner_idx on public.auctions(owner_id);
create index if not exists auction_members_user_idx on public.auction_members(user_id);
create index if not exists lots_auction_idx on public.lots(auction_id,lot_number);
create index if not exists lots_plate_idx on public.lots(plate);
create index if not exists fipe_owner_idx on public.fipe_references(owner_id);
create index if not exists fipe_plate_idx on public.fipe_references(plate);
create index if not exists source_runs_source_idx on public.source_search_runs(source_id,started_at desc);
create index if not exists audit_auction_idx on public.audit_log(auction_id,created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists auctions_set_updated_at on public.auctions;
create trigger auctions_set_updated_at before update on public.auctions
for each row execute function public.set_updated_at();

drop trigger if exists lots_set_updated_at on public.lots;
create trigger lots_set_updated_at before update on public.lots
for each row execute function public.set_updated_at();

drop trigger if exists fipe_set_updated_at on public.fipe_references;
create trigger fipe_set_updated_at before update on public.fipe_references
for each row execute function public.set_updated_at();

drop trigger if exists sources_set_updated_at on public.official_sources;
create trigger sources_set_updated_at before update on public.official_sources
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles(id,display_name,email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name',new.raw_user_meta_data->>'name',split_part(coalesce(new.email,''),'@',1)),
    new.email
  )
  on conflict (id) do update set email=excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert or update of email on auth.users
for each row execute function public.handle_new_user();

create or replace function public.auction_role(p_auction_id uuid)
returns public.auction_member_role
language sql
stable
security definer
set search_path = public
as $$
  select case
    when a.owner_id = auth.uid() then 'owner'::public.auction_member_role
    else (
      select m.role
      from public.auction_members m
      where m.auction_id = p_auction_id
        and m.user_id = auth.uid()
      limit 1
    )
  end
  from public.auctions a
  where a.id = p_auction_id;
$$;

create or replace function public.can_view_auction(p_auction_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.auction_role(p_auction_id) is not null;
$$;

create or replace function public.can_manage_auction(p_auction_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.auction_role(p_auction_id)::text in ('owner','admin'),false);
$$;

create or replace function public.can_edit_lots(p_auction_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.auction_role(p_auction_id)::text in ('owner','admin','participant'),false);
$$;

grant execute on function public.auction_role(uuid) to authenticated;
grant execute on function public.can_view_auction(uuid) to authenticated;
grant execute on function public.can_manage_auction(uuid) to authenticated;
grant execute on function public.can_edit_lots(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.auctions enable row level security;
alter table public.auction_members enable row level security;
alter table public.invitations enable row level security;
alter table public.lots enable row level security;
alter table public.fipe_references enable row level security;
alter table public.official_sources enable row level security;
alter table public.source_search_runs enable row level security;
alter table public.source_documents enable row level security;
alter table public.audit_log enable row level security;

drop policy if exists profiles_self_select on public.profiles;
create policy profiles_self_select on public.profiles
for select to authenticated using (id = auth.uid());

drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles
for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists auctions_select_member on public.auctions;
create policy auctions_select_member on public.auctions
for select to authenticated using (public.can_view_auction(id));

drop policy if exists auctions_insert_owner on public.auctions;
create policy auctions_insert_owner on public.auctions
for insert to authenticated with check (owner_id = auth.uid());

drop policy if exists auctions_update_manager on public.auctions;
create policy auctions_update_manager on public.auctions
for update to authenticated using (public.can_manage_auction(id)) with check (public.can_manage_auction(id));

drop policy if exists auctions_delete_manager on public.auctions;
create policy auctions_delete_manager on public.auctions
for delete to authenticated using (public.can_manage_auction(id));

drop policy if exists members_select on public.auction_members;
create policy members_select on public.auction_members
for select to authenticated using (user_id = auth.uid() or public.can_manage_auction(auction_id));

drop policy if exists members_insert_manager on public.auction_members;
create policy members_insert_manager on public.auction_members
for insert to authenticated with check (public.can_manage_auction(auction_id));

drop policy if exists members_update_manager on public.auction_members;
create policy members_update_manager on public.auction_members
for update to authenticated using (public.can_manage_auction(auction_id)) with check (public.can_manage_auction(auction_id));

drop policy if exists members_delete_manager on public.auction_members;
create policy members_delete_manager on public.auction_members
for delete to authenticated using (public.can_manage_auction(auction_id));

drop policy if exists invitations_select on public.invitations;
create policy invitations_select on public.invitations
for select to authenticated using (
  public.can_manage_auction(auction_id)
  or lower(email) = lower(coalesce(auth.jwt()->>'email',''))
);

drop policy if exists invitations_insert_manager on public.invitations;
create policy invitations_insert_manager on public.invitations
for insert to authenticated with check (
  public.can_manage_auction(auction_id)
  and invited_by = auth.uid()
);

drop policy if exists invitations_update_manager on public.invitations;
create policy invitations_update_manager on public.invitations
for update to authenticated using (public.can_manage_auction(auction_id))
with check (public.can_manage_auction(auction_id));

drop policy if exists invitations_delete_manager on public.invitations;
create policy invitations_delete_manager on public.invitations
for delete to authenticated using (public.can_manage_auction(auction_id));

drop policy if exists lots_select_member on public.lots;
create policy lots_select_member on public.lots
for select to authenticated using (public.can_view_auction(auction_id));

drop policy if exists lots_insert_editor on public.lots;
create policy lots_insert_editor on public.lots
for insert to authenticated with check (public.can_edit_lots(auction_id));

drop policy if exists lots_update_editor on public.lots;
create policy lots_update_editor on public.lots
for update to authenticated using (public.can_edit_lots(auction_id))
with check (public.can_edit_lots(auction_id));

drop policy if exists lots_delete_editor on public.lots;
create policy lots_delete_editor on public.lots
for delete to authenticated using (public.can_edit_lots(auction_id));

drop policy if exists fipe_select on public.fipe_references;
create policy fipe_select on public.fipe_references
for select to authenticated using (
  owner_id = auth.uid()
  or (auction_id is not null and public.can_view_auction(auction_id))
);

drop policy if exists fipe_insert on public.fipe_references;
create policy fipe_insert on public.fipe_references
for insert to authenticated with check (
  owner_id = auth.uid()
  and (auction_id is null or public.can_edit_lots(auction_id))
);

drop policy if exists fipe_update on public.fipe_references;
create policy fipe_update on public.fipe_references
for update to authenticated using (
  owner_id = auth.uid()
  and (auction_id is null or public.can_edit_lots(auction_id))
) with check (
  owner_id = auth.uid()
  and (auction_id is null or public.can_edit_lots(auction_id))
);

drop policy if exists fipe_delete on public.fipe_references;
create policy fipe_delete on public.fipe_references
for delete to authenticated using (
  owner_id = auth.uid()
  and (auction_id is null or public.can_edit_lots(auction_id))
);

drop policy if exists sources_read on public.official_sources;
create policy sources_read on public.official_sources
for select to authenticated using (active = true);

drop policy if exists source_runs_read on public.source_search_runs;
create policy source_runs_read on public.source_search_runs
for select to authenticated using (true);

drop policy if exists source_documents_read on public.source_documents;
create policy source_documents_read on public.source_documents
for select to authenticated using (
  auction_id is null or public.can_view_auction(auction_id)
);

drop policy if exists audit_read on public.audit_log;
create policy audit_read on public.audit_log
for select to authenticated using (
  actor_user_id = auth.uid()
  or (auction_id is not null and public.can_manage_auction(auction_id))
);

-- Storage: bucket privado para capas/fotos.
-- Convenção futura de caminho: <auction_uuid>/<tipo>/<arquivo>.
insert into storage.buckets (id,name,public)
values ('auction-media','auction-media',false)
on conflict (id) do nothing;

-- A política de upload/download do bucket será aplicada depois do primeiro teste
-- com IDs reais, para validar o padrão de path sem abrir acesso acidental.
