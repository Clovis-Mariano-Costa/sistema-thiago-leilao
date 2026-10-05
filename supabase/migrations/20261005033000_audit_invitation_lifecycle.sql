-- ST-MNM-24A — ciclo de vida auditável dos convites.
-- O aceite já é auditado pelo RPC seguro existente.
-- Este trigger registra apenas criação e transições administrativas para revoked/expired.

create or replace function private.audit_invitation_lifecycle()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
begin
  if tg_op = 'INSERT' then
    insert into public.audit_log(
      actor_user_id,auction_id,entity_type,entity_id,action,after_data,metadata
    )
    values(
      coalesce(v_actor,new.invited_by),
      new.auction_id,
      'invitation',
      new.id::text,
      'invitation.created',
      jsonb_build_object(
        'role',new.role::text,
        'status',new.status
      ),
      jsonb_build_object('source','invitations_trigger')
    );
  elsif tg_op = 'UPDATE'
    and old.status is distinct from new.status
    and new.status in ('revoked','expired')
  then
    insert into public.audit_log(
      actor_user_id,auction_id,entity_type,entity_id,action,before_data,after_data,metadata
    )
    values(
      v_actor,
      new.auction_id,
      'invitation',
      new.id::text,
      case new.status
        when 'revoked' then 'invitation.revoked'
        else 'invitation.expired'
      end,
      jsonb_build_object('role',old.role::text,'status',old.status),
      jsonb_build_object('role',new.role::text,'status',new.status),
      jsonb_build_object('source','invitations_trigger')
    );
  end if;

  return new;
end;
$$;

revoke all on function private.audit_invitation_lifecycle() from public;
revoke all on function private.audit_invitation_lifecycle() from anon;
revoke all on function private.audit_invitation_lifecycle() from authenticated;

drop trigger if exists trg_audit_invitation_lifecycle on public.invitations;
create trigger trg_audit_invitation_lifecycle
after insert or update of status on public.invitations
for each row execute function private.audit_invitation_lifecycle();

comment on function private.audit_invitation_lifecycle() is
'Registra no audit_log a criação e as transições administrativas revoked/expired de convites. O aceite continua auditado pelo RPC de aceite.';
