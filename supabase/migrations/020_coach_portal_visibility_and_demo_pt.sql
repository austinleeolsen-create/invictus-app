create or replace function public.current_coach_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select coach_id from public.profiles where id = auth.uid();
$$;

create or replace function public.is_assigned_coach_for_team(target_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.team_coaches assignment
    join public.profiles profile on profile.coach_id = assignment.coach_id
    where profile.id = auth.uid()
      and assignment.team_id = target_team_id
  );
$$;

grant execute on function public.current_coach_id() to authenticated;
grant execute on function public.is_assigned_coach_for_team(uuid) to authenticated;

drop policy if exists "coaches view assigned teams" on public.teams;
create policy "coaches view assigned teams"
on public.teams for select to authenticated
using (public.is_assigned_coach_for_team(id));

drop policy if exists "coaches view assigned players" on public.players;
create policy "coaches view assigned players"
on public.players for select to authenticated
using (team_id is not null and public.is_assigned_coach_for_team(team_id));

drop policy if exists "coaches view their assignments" on public.team_coaches;
create policy "coaches view their assignments"
on public.team_coaches for select to authenticated
using (coach_id = public.current_coach_id());

drop policy if exists "coaches view own directory record" on public.coaches;
create policy "coaches view own directory record"
on public.coaches for select to authenticated
using (id = public.current_coach_id());

drop policy if exists "coaches view seasons for assigned teams" on public.seasons;
create policy "coaches view seasons for assigned teams"
on public.seasons for select to authenticated
using (
  exists (
    select 1 from public.teams team
    where team.season_id = seasons.id
      and public.is_assigned_coach_for_team(team.id)
  )
);

insert into public.court_slots
  (court_id, start_at, end_at, slot_type, title, age_group, status)
select
  court.id,
  demo_time.start_at,
  demo_time.end_at,
  'open_pt',
  'Coach PT opening',
  null,
  'open'
from public.courts court
join (
  values
    ('Court 1A', date_trunc('day', now()) + interval '1 day 18 hours', date_trunc('day', now()) + interval '1 day 19 hours'),
    ('Court 1B', date_trunc('day', now()) + interval '2 days 17 hours', date_trunc('day', now()) + interval '2 days 18 hours'),
    ('Court 2A', date_trunc('day', now()) + interval '3 days 19 hours', date_trunc('day', now()) + interval '3 days 20 hours'),
    ('Court 2B', date_trunc('day', now()) + interval '4 days 18 hours', date_trunc('day', now()) + interval '4 days 19 hours')
) as demo_time(court_name, start_at, end_at)
  on court.name = demo_time.court_name
where not exists (
  select 1 from public.court_slots existing
  where existing.court_id = court.id
    and existing.start_at < demo_time.end_at
    and existing.end_at > demo_time.start_at
);
