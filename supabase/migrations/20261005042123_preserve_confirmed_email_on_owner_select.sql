alter policy auctions_select_member on public.auctions
  using (
    (private.is_email_confirmed() and owner_id = (select auth.uid()))
    or private.can_view_auction(id)
  );
