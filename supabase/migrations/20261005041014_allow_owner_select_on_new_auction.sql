alter policy auctions_select_member on public.auctions
  using ((owner_id = (select auth.uid())) or private.can_view_auction(id));
