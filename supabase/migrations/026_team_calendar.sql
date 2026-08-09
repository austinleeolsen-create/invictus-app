create table if not exists public.team_events (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  event_type text not null check (event_type in ('practice','game','tournament','meeting','other')),
  title text not null,
  opponent text,
  location text,
  start_at timestamptz not null,
  end_at timestamptz,
  status text not null default 'scheduled' check (status in ('scheduled','cancelled','completed')),
  arrival_minutes integer not null default 0 check (arrival_minutes >= 0),
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_at is null or end_at > start_at)
);

alter table public.team_events enable row level security;
drop policy if exists "managers and assigned coaches view team events" on public.team_events;
create policy "managers and assigned coaches view team events" on public.team_events
for select to authenticated using (public.can_manage_court_schedule() or public.is_assigned_coach_for_team(team_id));
drop policy if exists "operations managers create team events" on public.team_events;
create policy "operations managers create team events" on public.team_events
for insert to authenticated with check (public.can_manage_court_schedule());
drop policy if exists "operations managers update team events" on public.team_events;
create policy "operations managers update team events" on public.team_events
for update to authenticated using (public.can_manage_court_schedule()) with check (public.can_manage_court_schedule());
create index if not exists team_events_start_idx on public.team_events(start_at, team_id);
