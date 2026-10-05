-- ST-MNM-36A — endurece a hierarquia de papéis em auction_members.
-- Owner é atributo canônico de public.auctions.owner_id e nunca é concedido
-- diretamente pela tabela de membros nem por convite.
--
-- Remediação pré-constraint:
-- versões anteriores permitiam role=owner em auction_members. Antes de validar
-- a nova restrição, preservamos evidência no audit_log e removemos essas linhas.
-- A remoção é fail-closed: nenhum owner legado permanece como membership.

insert into public.audit_log(
  actor_user_id,
  auction_id,
  entity_type,
  entity_id,
  action,
  before_data,
  metadata
)
select
  null,
  m.auction_id,
  'auction_member',
  m.user_id::text,
  'membership.owner_legacy_removed',
  jsonb_build_object(
    'user_id',m.user_id::text,
    'role',m.role::text
  ),
  jsonb_build_object(
    'source','20261005042723_harden_auction_member_role_hierarchy',
    'canonical_owner_id',a.owner_id::text,
    'reason','owner_role_is_canonical_only_in_auctions_owner_id'
  )
from public.auction_members m
join public.auctions a on a.id=m.auction_id
where m.role='owner'::public.auction_member_role;

delete from public.auction_members
where role='owner'::public.auction_member_role;

alter table public.auction_members
  drop constraint if exists auction_members_no_owner_role;

alter table public.auction_members
  add constraint auction_members_no_owner_role
  check (role <> 'owner'::public.auction_member_role);

drop policy if exists members_insert_manager on public.auction_members;
create policy members_insert_manager on public.auction_members
for insert to authenticated
with check (
  private.is_email_confirmed()
  and private.can_invite_role(auction_id, role)
);

drop policy if exists members_update_manager on public.auction_members;
create policy members_update_manager on public.auction_members
for update to authenticated
using (
  private.is_email_confirmed()
  and private.can_invite_role(auction_id, role)
)
with check (
  private.is_email_confirmed()
  and private.can_invite_role(auction_id, role)
);

drop policy if exists members_delete_manager on public.auction_members;
create policy members_delete_manager on public.auction_members
for delete to authenticated
using (
  private.is_email_confirmed()
  and private.can_invite_role(auction_id, role)
);
