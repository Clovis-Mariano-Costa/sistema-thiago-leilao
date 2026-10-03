create table if not exists public.user_state_snapshots (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state_version integer not null default 4,
  state jsonb not null default '{}'::jsonb,
  source_origin text,
  last_client_change timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists user_state_snapshots_set_updated_at on public.user_state_snapshots;
create trigger user_state_snapshots_set_updated_at
before update on public.user_state_snapshots
for each row execute function public.set_updated_at();

alter table public.user_state_snapshots enable row level security;

drop policy if exists user_state_snapshots_select_self on public.user_state_snapshots;
create policy user_state_snapshots_select_self on public.user_state_snapshots
for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists user_state_snapshots_insert_self on public.user_state_snapshots;
create policy user_state_snapshots_insert_self on public.user_state_snapshots
for insert to authenticated
with check (private.is_email_confirmed() and user_id = (select auth.uid()));

drop policy if exists user_state_snapshots_update_self on public.user_state_snapshots;
create policy user_state_snapshots_update_self on public.user_state_snapshots
for update to authenticated
using (user_id = (select auth.uid()))
with check (private.is_email_confirmed() and user_id = (select auth.uid()));

drop policy if exists user_state_snapshots_delete_self on public.user_state_snapshots;
create policy user_state_snapshots_delete_self on public.user_state_snapshots
for delete to authenticated using (user_id = (select auth.uid()));

comment on table public.user_state_snapshots is
'Backup/sincronizacao transitoria do estado do MVP por usuario autenticado, com RLS. Nao substitui o modelo relacional canonico de leiloes/lotes.';

drop policy if exists auction_media_select_member on storage.objects;
create policy auction_media_select_member on storage.objects
for select to authenticated
using (
  bucket_id = 'auction-media'
  and (storage.foldername(name))[1] ~* '^[0-9a-f-]{36}$'
  and private.can_view_auction(((storage.foldername(name))[1])::uuid)
);

drop policy if exists auction_media_insert_editor on storage.objects;
create policy auction_media_insert_editor on storage.objects
for insert to authenticated
with check (
  bucket_id = 'auction-media'
  and (storage.foldername(name))[1] ~* '^[0-9a-f-]{36}$'
  and private.is_email_confirmed()
  and private.can_edit_lots(((storage.foldername(name))[1])::uuid)
);

drop policy if exists auction_media_update_editor on storage.objects;
create policy auction_media_update_editor on storage.objects
for update to authenticated
using (
  bucket_id = 'auction-media'
  and (storage.foldername(name))[1] ~* '^[0-9a-f-]{36}$'
  and private.can_edit_lots(((storage.foldername(name))[1])::uuid)
)
with check (
  bucket_id = 'auction-media'
  and (storage.foldername(name))[1] ~* '^[0-9a-f-]{36}$'
  and private.is_email_confirmed()
  and private.can_edit_lots(((storage.foldername(name))[1])::uuid)
);

drop policy if exists auction_media_delete_editor on storage.objects;
create policy auction_media_delete_editor on storage.objects
for delete to authenticated
using (
  bucket_id = 'auction-media'
  and (storage.foldername(name))[1] ~* '^[0-9a-f-]{36}$'
  and private.can_edit_lots(((storage.foldername(name))[1])::uuid)
);
