-- ST-MNM-36B — menor privilégio para convites, membros e trilha de auditoria.
-- O frontend autenticado recebe apenas as operações realmente necessárias.
-- Convites devem ser revogados/expirados, nunca apagados, para preservar evidência.

drop policy if exists invitations_delete_manager on public.invitations;

revoke all on table public.audit_log from anon, authenticated;
grant select on table public.audit_log to authenticated;
revoke all on sequence public.audit_log_id_seq from anon, authenticated;

revoke all on table public.invitations from anon;
revoke delete, truncate, references, trigger on table public.invitations from authenticated;
grant select, insert, update on table public.invitations to authenticated;

revoke all on table public.auction_members from anon;
revoke truncate, references, trigger on table public.auction_members from authenticated;
grant select, insert, update, delete on table public.auction_members to authenticated;
