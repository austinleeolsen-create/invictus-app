create table if not exists public.facility_projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  priority text not null default 'medium' check (priority in ('urgent','high','medium','low')),
  status text not null default 'planned' check (status in ('planned','approved','in_progress','completed','paused')),
  estimated_cost numeric not null default 0 check (estimated_cost >= 0),
  reserved_amount numeric not null default 0 check (reserved_amount >= 0),
  target_date date,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.facility_projects enable row level security;
create policy "admins can view facility projects" on public.facility_projects for select to authenticated using (public.is_owner_admin());
create policy "admins can manage facility projects" on public.facility_projects for all to authenticated using (public.is_owner_admin()) with check (public.is_owner_admin());
