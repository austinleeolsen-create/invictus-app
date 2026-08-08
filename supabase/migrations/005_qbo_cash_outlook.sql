create table if not exists public.qbo_cash_items (
  id uuid primary key default gen_random_uuid(),
  realm_id text not null,
  item_type text not null check (item_type in ('bank','receivable','bill')),
  qbo_id text not null,
  name text not null,
  document_number text,
  due_date date,
  balance numeric not null default 0,
  account_subtype text,
  active boolean not null default true,
  synced_at timestamptz not null default now(),
  unique (realm_id, item_type, qbo_id)
);

create index if not exists qbo_cash_items_active_due_idx
on public.qbo_cash_items (item_type, active, due_date);

alter table public.qbo_cash_items enable row level security;

create policy "admins can view qbo cash items"
on public.qbo_cash_items for select to authenticated
using (public.is_owner_admin());

create policy "admins can manage qbo cash items"
on public.qbo_cash_items for all to authenticated
using (public.is_owner_admin())
with check (public.is_owner_admin());
