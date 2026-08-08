create table if not exists public.monthly_payroll_entries (
  id uuid primary key default gen_random_uuid(),
  plan_month date not null,
  coach_id uuid references public.coaches(id) on delete set null,
  staff_name text not null,
  role text,
  hourly_rate numeric not null default 0 check (hourly_rate >= 0),
  skills_hours numeric not null default 0 check (skills_hours >= 0),
  additional_hours numeric not null default 0 check (additional_hours >= 0),
  team_stipend numeric not null default 0 check (team_stipend >= 0),
  manager_pay numeric not null default 0 check (manager_pay >= 0),
  bonus numeric not null default 0 check (bonus >= 0),
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists monthly_payroll_entries_month_idx
on public.monthly_payroll_entries (plan_month, staff_name);

alter table public.monthly_payroll_entries enable row level security;

create policy "admins can view monthly payroll entries"
on public.monthly_payroll_entries for select to authenticated
using (public.is_owner_admin());

create policy "admins can create monthly payroll entries"
on public.monthly_payroll_entries for insert to authenticated
with check (public.is_owner_admin());

create policy "admins can update monthly payroll entries"
on public.monthly_payroll_entries for update to authenticated
using (public.is_owner_admin())
with check (public.is_owner_admin());

create policy "admins can delete monthly payroll entries"
on public.monthly_payroll_entries for delete to authenticated
using (public.is_owner_admin());
