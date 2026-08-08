create table if not exists public.qbo_financial_snapshots (
  id uuid primary key default gen_random_uuid(),
  realm_id text not null,
  company_name text not null,
  report_start date not null,
  report_end date not null,
  total_income numeric,
  total_expenses numeric,
  net_income numeric,
  cash_balance numeric,
  total_assets numeric,
  total_liabilities numeric,
  total_equity numeric,
  synced_by uuid references auth.users(id) on delete set null,
  synced_at timestamptz not null default now()
);

create index if not exists qbo_financial_snapshots_synced_at_idx
on public.qbo_financial_snapshots (synced_at desc);

alter table public.qbo_financial_snapshots enable row level security;

create policy "admins can view qbo financial snapshots"
on public.qbo_financial_snapshots for select to authenticated
using (public.is_owner_admin());

create policy "admins can create qbo financial snapshots"
on public.qbo_financial_snapshots for insert to authenticated
with check (public.is_owner_admin());
