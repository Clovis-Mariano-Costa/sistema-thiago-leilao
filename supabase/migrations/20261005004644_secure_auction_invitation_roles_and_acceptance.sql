-- Sistema Thiago — hierarquia segura de convites e aceite autenticado.
-- Owner pode convidar admin/participant/observer.
-- Admin pode convidar participant/observer.
-- Owner nunca é concedido por convite.
-- O aceite exige sessão autenticada, e-mail confirmado e correspondência com o convite.

create or replace function private.can_invite_role(
  p_auction_id uuid,
  p_role public.auction_member_role
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case private.auction_role(p_auction_id)
    when 'owner'::public.auction_member_role then
      p_role in (
        'admin'::public.auction_member_role,
        'participant'::public.auction_member_role,
        'observer'::public.auction_member_role
      )
    when 'admin'::public.auction_member_role then
      p_role in (
        'participant'::public.auction_member_role,
        'observer'::public.auction_member_role
      )
    else false
  end;
$$;

revoke all on function private.can_invite_role(uuid,public.auction_member_role) from public;
revoke all on function private.can_invite_role(uuid,public.auction_member_role) from anon;
grant execute on function private.can_invite_role(uuid,public.auction_member_role) to authenticated;

drop policy if exists invitations_insert_manager on public.invitations;
create policy invitations_insert_manager on public.invitations
for insert to authenticated
with check (
  private.is_email_confirmed()
  and invited_by = (select auth.uid())
  and status = 'pending'
  and accepted_by is null
  and accepted_at is null
  and private.can_invite_role(auction_id, role)
);

drop policy if exists invitations_update_manager on public.invitations;
create policy invitations_update_manager on public.invitations
for update to authenticated
using (private.can_manage_auction(auction_id))
with check (
  private.is_email_confirmed()
  and status in ('pending','revoked','expired')
  and accepted_by is null
  and accepted_at is null
  and private.can_invite_role(auction_id, role)
);

create or replace function private.accept_auction_invitation_impl(p_invitation_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_user_email text;
  v_inv public.invitations%rowtype;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED' using errcode='28000';
  end if;

  if not private.is_email_confirmed() then
    raise exception 'EMAIL_NOT_CONFIRMED' using errcode='42501';
  end if;

  select lower(u.email)
    into v_user_email
  from auth.users u
  where u.id = v_uid
    and u.email_confirmed_at is not null;

  if v_user_email is null then
    raise exception 'CONFIRMED_EMAIL_REQUIRED' using errcode='42501';
  end if;

  select i.*
    into v_inv
  from public.invitations i
  where i.id = p_invitation_id
    and i.status = 'pending'
    and (i.expires_at is null or i.expires_at > now())
  for update;

  if not found then
    raise exception 'INVITATION_NOT_AVAILABLE' using errcode='P0001';
  end if;

  if lower(v_inv.email) <> v_user_email then
    raise exception 'INVITATION_EMAIL_MISMATCH' using errcode='42501';
  end if;

  if v_inv.role = 'owner'::public.auction_member_role then
    raise exception 'OWNER_ROLE_CANNOT_BE_GRANTED_BY_INVITATION' using errcode='42501';
  end if;

  if exists (
    select 1
    from public.auction_members m
    where m.auction_id = v_inv.auction_id
      and m.user_id = v_uid
  ) then
    raise exception 'ALREADY_MEMBER' using errcode='P0001';
  end if;

  insert into public.auction_members(auction_id,user_id,role,invited_by)
  values (v_inv.auction_id,v_uid,v_inv.role,v_inv.invited_by);

  update public.invitations
     set status='accepted',
         accepted_by=v_uid,
         accepted_at=now()
   where id=v_inv.id;

  insert into public.audit_log(
    actor_user_id,auction_id,entity_type,entity_id,action,after_data,metadata
  )
  values (
    v_uid,
    v_inv.auction_id,
    'invitation',
    v_inv.id::text,
    'invitation.accepted',
    jsonb_build_object('role',v_inv.role::text),
    jsonb_build_object('source','accept_auction_invitation')
  );

  return v_inv.auction_id;
end;
$$;

revoke all on function private.accept_auction_invitation_impl(uuid) from public;
revoke all on function private.accept_auction_invitation_impl(uuid) from anon;
grant execute on function private.accept_auction_invitation_impl(uuid) to authenticated;

create or replace function public.accept_auction_invitation(p_invitation_id uuid)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select private.accept_auction_invitation_impl(p_invitation_id);
$$;

revoke all on function public.accept_auction_invitation(uuid) from public;
revoke all on function public.accept_auction_invitation(uuid) from anon;
grant execute on function public.accept_auction_invitation(uuid) to authenticated;

comment on function private.can_invite_role(uuid,public.auction_member_role) is
'Hierarquia segura de convites: owner pode convidar admin/participant/observer; admin apenas participant/observer; owner nunca e concedido por convite.';

comment on function public.accept_auction_invitation(uuid) is
'Wrapper SECURITY INVOKER para aceite autenticado de convite; valida e-mail confirmado, e-mail do convite, expiracao e membership previa por helper privado.';
