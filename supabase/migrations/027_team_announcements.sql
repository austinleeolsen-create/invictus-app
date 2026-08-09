create table if not exists public.team_announcements (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references public.teams(id) on delete cascade,
  title text not null,
  message text not null,
  priority text not null default 'normal' check (priority in ('normal','important','urgent')),
  expires_at timestamptz,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.team_announcements enable row level security;
drop policy if exists "staff view relevant announcements" on public.team_announcements;
create policy "staff view relevant announcements" on public.team_announcements
for select to authenticated using (
  public.can_manage_court_schedule()
  or (is_active and (team_id is null or public.is_assigned_coach_for_team(team_id)))
);
drop policy if exists "operations managers create announcements" on public.team_announcements;
create policy "operations managers create announcements" on public.team_announcements
for insert to authenticated with check (public.can_manage_court_schedule());
drop policy if exists "operations managers update announcements" on public.team_announcements;
create policy "operations managers update announcements" on public.team_announcements
for update to authenticated using (public.can_manage_court_schedule()) with check (public.can_manage_court_schedule());
create index if not exists team_announcements_active_idx on public.team_announcements(is_active, created_at desc);
