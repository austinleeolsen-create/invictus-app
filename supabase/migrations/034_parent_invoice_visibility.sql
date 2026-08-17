drop policy if exists "parents view linked separate invoices" on public.stripe_invoice_links;
create policy "parents view linked separate invoices"
on public.stripe_invoice_links for select to authenticated
using (public.is_parent_for_player(player_id));
