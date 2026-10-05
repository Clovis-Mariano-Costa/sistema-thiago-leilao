-- ST-MNM-36C — leitura de metadados de acesso exige e-mail confirmado.
-- Defesa em profundidade: a UI já bloqueia contas não confirmadas, mas a RLS
-- também deve impedir leitura direta via Data API.

alter policy members_select on public.auction_members
  using (
    private.is_email_confirmed()
    and (
      user_id = (select auth.uid())
      or private.can_manage_auction(auction_id)
    )
  );

alter policy invitations_select on public.invitations
  using (
    private.is_email_confirmed()
    and (
      private.can_manage_auction(auction_id)
      or lower(email) = lower(coalesce((select auth.jwt())->>'email',''))
    )
  );

alter policy audit_read on public.audit_log
  using (
    private.is_email_confirmed()
    and (
      actor_user_id = (select auth.uid())
      or (auction_id is not null and private.can_manage_auction(auction_id))
    )
  );
