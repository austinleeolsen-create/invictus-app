create table if not exists public.player_development_notes (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  team_id uuid references public.teams(id) on delete set null,
  coach_id uuid not null references public.coaches(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('development', 'strength', 'improvement', 'attendance', 'behavior', 'general')),
  attendance_status text check (attendance_status is null or attendance_status in ('present', 'late', 'absent', 'excused')),
  note text not null,
  follow_up_needed boolean not null default false,
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.player_development_notes enable row level security;

drop policy if exists "assigned coaches and managers view player development" on public.player_development_notes;
create policy "assigned coaches and managers view player development"
on public.player_development_notes for select to authenticated
using (public.can_manage_court_schedule() or public.is_assigned_coach_for_team(team_id));

drop policy if exists "assigned coaches add player development" on public.player_development_notes;
create policy "assigned coaches add player development"
on public.player_development_notes for insert to authenticated
with check (
  coach_id = public.current_coach_id()
  and author_id = auth.uid()
  and public.is_assigned_coach_for_team(team_id)
);

drop policy if exists "managers resolve player development followups" on public.player_development_notes;
create policy "managers resolve player development followups"
on public.player_development_notes for update to authenticated
using (public.can_manage_court_schedule())
with check (public.can_manage_court_schedule());

create index if not exists player_development_notes_player_date_idx
  on public.player_development_notes(player_id, created_at desc);

create index if not exists player_development_notes_followup_idx
  on public.player_development_notes(follow_up_needed, resolved_at)
  where follow_up_needed = true;
