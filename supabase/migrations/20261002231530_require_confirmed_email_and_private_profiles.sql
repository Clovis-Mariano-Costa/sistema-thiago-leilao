-- RECONCILIACAO DE HISTORICO — 2026-10-04
-- Versao alinhada ao historico remoto Supabase 20261002231530.
-- Conteudo funcional derivado de supabase/003_require_confirmed_email_and_private_profiles.sql.
-- Este arquivo reconstrói o estado versionado; nao afirma ser byte-a-byte o SQL historico originalmente executado.

-- Sistema Thiago — segurança de identidade e perfil
-- Aplicada no projeto Supabase Free em 2026-10-02.

alter table public.profiles
  add column if not exists avatar_path text,
  add column if not exists profile_completed_at timestamptz;

create or replace function private.is_email_confirmed()
returns boolean
language sql
stable
security definer
set search_path = auth, public
as $$
  select exists (
    select 1
    from auth.users u
    where u.id = (select auth.uid())
      and u.email_confirmed_at is not null
  );
$$;

revoke all on function private.is_email_confirmed() from public;
grant execute on function private.is_email_confirmed() to authenticated;

create or replace function private.auction_role(p_auction_id uuid)
returns public.auction_member_role
language sql
stable
security definer
set search_path = public, auth, private
as $$
  select case
    when not private.is_email_confirmed() then null::public.auction_member_role
    when a.owner_id = (select auth.uid()) then 'owner'::public.auction_member_role
    else (
      select m.role
      from public.auction_members m
      where m.auction_id = p_auction_id
        and m.user_id = (select auth.uid())
      limit 1
    )
  end
  from public.auctions a
  where a.id = p_auction_id;
$$;

drop policy if exists auctions_insert_owner on public.auctions;
create policy auctions_insert_owner on public.auctions
for insert to authenticated
with check (
  private.is_email_confirmed()
  and owner_id = (select auth.uid())
);

drop policy if exists fipe_insert on public.fipe_references;
create policy fipe_insert on public.fipe_references
for insert to authenticated
with check (
  private.is_email_confirmed()
  and owner_id = (select auth.uid())
  and (auction_id is null or private.can_edit_lots(auction_id))
);

drop policy if exists fipe_update on public.fipe_references;
create policy fipe_update on public.fipe_references
for update to authenticated
using (
  private.is_email_confirmed()
  and owner_id = (select auth.uid())
  and (auction_id is null or private.can_edit_lots(auction_id))
)
with check (
  private.is_email_confirmed()
  and owner_id = (select auth.uid())
  and (auction_id is null or private.can_edit_lots(auction_id))
);

drop policy if exists fipe_delete on public.fipe_references;
create policy fipe_delete on public.fipe_references
for delete to authenticated
using (
  private.is_email_confirmed()
  and owner_id = (select auth.uid())
  and (auction_id is null or private.can_edit_lots(auction_id))
);

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values (
  'profile-avatars',
  'profile-avatars',
  false,
  2097152,
  array['image/jpeg','image/png','image/webp']::text[]
)
on conflict (id) do update
set public=false,
    file_size_limit=2097152,
    allowed_mime_types=array['image/jpeg','image/png','image/webp']::text[];

drop policy if exists profile_avatars_select_own on storage.objects;
create policy profile_avatars_select_own on storage.objects
for select to authenticated
using (
  bucket_id='profile-avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists profile_avatars_insert_own on storage.objects;
create policy profile_avatars_insert_own on storage.objects
for insert to authenticated
with check (
  private.is_email_confirmed()
  and bucket_id='profile-avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists profile_avatars_update_own on storage.objects;
create policy profile_avatars_update_own on storage.objects
for update to authenticated
using (
  private.is_email_confirmed()
  and bucket_id='profile-avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  private.is_email_confirmed()
  and bucket_id='profile-avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists profile_avatars_delete_own on storage.objects;
create policy profile_avatars_delete_own on storage.objects
for delete to authenticated
using (
  private.is_email_confirmed()
  and bucket_id='profile-avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
