create table if not exists public.player_season_readiness (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  season_id uuid not null references public.seasons(id) on delete cascade,
  team_id uuid references public.teams(id) on delete set null,
  registration_form boolean not null default false,
  waiver boolean not null default false,
  emergency_medical boolean not null default false,
  proof_of_age boolean not null default false,
  notes text,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(player_id, season_id)
);

alter table public.player_season_readiness enable row level security;

drop policy if exists "operations managers view season readiness" on public.player_season_readiness;
create policy "operations managers view season readiness" on public.player_season_readiness
for select to authenticated using (public.can_manage_court_schedule());

drop policy if exists "operations managers create season readiness" on public.player_season_readiness;
create policy "operations managers create season readiness" on public.player_season_readiness
for insert to authenticated with check (public.can_manage_court_schedule());

drop policy if exists "operations managers update season readiness" on public.player_season_readiness;
create policy "operations managers update season readiness" on public.player_season_readiness
for update to authenticated using (public.can_manage_court_schedule()) with check (public.can_manage_court_schedule());

create index if not exists player_season_readiness_status_idx on public.player_season_readiness(season_id, team_id);
