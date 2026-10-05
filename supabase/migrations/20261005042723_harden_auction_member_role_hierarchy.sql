-- ST-MNM-36A — endurece a hierarquia de papéis em auction_members.
-- Owner é atributo canônico de public.auctions.owner_id e nunca é concedido
-- diretamente pela tabela de membros nem por convite.

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
