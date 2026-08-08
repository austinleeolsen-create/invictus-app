create table if not exists public.monthly_cash_plans (
  id uuid primary key default gen_random_uuid(),
  plan_month date not null unique,
  other_revenue numeric not null default 0 check (other_revenue >= 0),
  rent numeric not null default 0 check (rent >= 0),
  payroll numeric not null default 0 check (payroll >= 0),
  utilities numeric not null default 0 check (utilities >= 0),
  insurance numeric not null default 0 check (insurance >= 0),
  programs_and_events numeric not null default 0 check (programs_and_events >= 0),
  other_expenses numeric not null default 0 check (other_expenses >= 0),
  safety_cushion numeric not null default 0 check (safety_cushion >= 0),
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.monthly_cash_plans enable row level security;

create policy "admins can view monthly cash plans"
on public.monthly_cash_plans for select to authenticated
using (public.is_owner_admin());

create policy "admins can create monthly cash plans"
on public.monthly_cash_plans for insert to authenticated
with check (public.is_owner_admin());

create policy "admins can update monthly cash plans"
on public.monthly_cash_plans for update to authenticated
using (public.is_owner_admin())
with check (public.is_owner_admin());
