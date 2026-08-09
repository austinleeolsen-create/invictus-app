create table if not exists public.coach_time_entries (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.coaches(id) on delete cascade,
  team_id uuid references public.teams(id) on delete set null,
  work_date date not null,
  category text not null check (category in ('team', 'skills', 'pt', 'admin', 'other')),
  hours numeric not null check (hours > 0 and hours <= 24),
  notes text,
  status text not null default 'submitted' check (status in ('submitted', 'approved', 'rejected')),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.coach_time_entries enable row level security;

drop policy if exists "coaches view own time entries" on public.coach_time_entries;
create policy "coaches view own time entries"
on public.coach_time_entries for select to authenticated
using (coach_id = public.current_coach_id() or public.can_manage_court_schedule());

drop policy if exists "coaches submit own time entries" on public.coach_time_entries;
create policy "coaches submit own time entries"
on public.coach_time_entries for insert to authenticated
with check (coach_id = public.current_coach_id() and created_by = auth.uid());

drop policy if exists "managers review coach time entries" on public.coach_time_entries;
create policy "managers review coach time entries"
on public.coach_time_entries for update to authenticated
using (public.can_manage_court_schedule())
with check (public.can_manage_court_schedule());

create index if not exists coach_time_entries_month_idx
  on public.coach_time_entries(work_date, status);

create index if not exists coach_time_entries_coach_idx
  on public.coach_time_entries(coach_id, work_date);
