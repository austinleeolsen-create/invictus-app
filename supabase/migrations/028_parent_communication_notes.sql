alter table public.player_development_notes drop constraint if exists player_development_notes_category_check;
alter table public.player_development_notes
  add constraint player_development_notes_category_check
  check (category in ('development','strength','improvement','attendance','behavior','parent_contact','payment_discussion','general'));

alter table public.player_development_notes alter column coach_id drop not null;
alter table public.player_development_notes
  add column if not exists contact_method text check (contact_method is null or contact_method in ('call','text','email','in_person','other')),
  add column if not exists contact_outcome text check (contact_outcome is null or contact_outcome in ('attempted','reached','waiting_response','resolved')),
  add column if not exists manager_only boolean not null default false;

drop policy if exists "assigned coaches and managers view player development" on public.player_development_notes;
create policy "assigned coaches and managers view player development"
on public.player_development_notes for select to authenticated
using (public.can_manage_court_schedule() or (not manager_only and public.is_assigned_coach_for_team(team_id)));

drop policy if exists "assigned coaches add player development" on public.player_development_notes;
create policy "assigned coaches add player development"
on public.player_development_notes for insert to authenticated
with check (
  author_id = auth.uid()
  and (
    public.can_manage_court_schedule()
    or (coach_id = public.current_coach_id() and not manager_only and public.is_assigned_coach_for_team(team_id))
  )
);
