create table if not exists public.player_jersey_tracking (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  season_id uuid not null references public.seasons(id) on delete cascade,
  team_id uuid references public.teams(id) on delete set null,
  jersey_number text,
  jersey_size text,
  status text not null default 'needs_ordering' check (status in ('needs_ordering','ordered','at_gym','given_to_player','issue')),
  received_at timestamptz,
  distributed_at timestamptz,
  notes text,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(player_id, season_id)
);

alter table public.player_jersey_tracking enable row level security;

drop policy if exists "operations managers view jersey tracking" on public.player_jersey_tracking;
create policy "operations managers view jersey tracking"
on public.player_jersey_tracking for select to authenticated
using (public.can_manage_court_schedule());

drop policy if exists "operations managers create jersey tracking" on public.player_jersey_tracking;
create policy "operations managers create jersey tracking"
on public.player_jersey_tracking for insert to authenticated
with check (public.can_manage_court_schedule());

drop policy if exists "operations managers update jersey tracking" on public.player_jersey_tracking;
create policy "operations managers update jersey tracking"
on public.player_jersey_tracking for update to authenticated
using (public.can_manage_court_schedule())
with check (public.can_manage_court_schedule());

create index if not exists player_jersey_tracking_status_idx
  on public.player_jersey_tracking(season_id, status);
