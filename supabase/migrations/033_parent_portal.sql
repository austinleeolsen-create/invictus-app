create table if not exists public.parent_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.parent_player_links (
  parent_user_id uuid not null references public.parent_accounts(user_id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  relationship text not null default 'Parent / guardian',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (parent_user_id, player_id)
);

alter table public.player_development_notes add column if not exists parent_visible boolean not null default false;
alter table public.parent_accounts enable row level security;
alter table public.parent_player_links enable row level security;

create or replace function public.is_parent_for_player(target_player_id uuid)
returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.parent_player_links where parent_user_id=auth.uid() and player_id=target_player_id); $$;

create or replace function public.is_parent_for_team(target_team_id uuid)
returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.parent_player_links link join public.players player on player.id=link.player_id where link.parent_user_id=auth.uid() and player.team_id=target_team_id); $$;

drop policy if exists "parents view own parent account" on public.parent_accounts;
create policy "parents view own parent account" on public.parent_accounts for select to authenticated using(user_id=auth.uid());
drop policy if exists "owners manage parent accounts" on public.parent_accounts;
create policy "owners manage parent accounts" on public.parent_accounts for all to authenticated using(public.is_owner_admin()) with check(public.is_owner_admin());
drop policy if exists "parents view own player links" on public.parent_player_links;
create policy "parents view own player links" on public.parent_player_links for select to authenticated using(parent_user_id=auth.uid());
drop policy if exists "owners manage parent player links" on public.parent_player_links;
create policy "owners manage parent player links" on public.parent_player_links for all to authenticated using(public.is_owner_admin()) with check(public.is_owner_admin());

drop policy if exists "parents view linked players" on public.players;
create policy "parents view linked players" on public.players for select to authenticated using(public.is_parent_for_player(id));
drop policy if exists "parents view linked player billing" on public.player_billing;
create policy "parents view linked player billing" on public.player_billing for select to authenticated using(public.is_parent_for_player(player_id));
drop policy if exists "parents view linked teams" on public.teams;
create policy "parents view linked teams" on public.teams for select to authenticated using(public.is_parent_for_team(id));
drop policy if exists "parents view linked team events" on public.team_events;
create policy "parents view linked team events" on public.team_events for select to authenticated using(public.is_parent_for_team(team_id));
drop policy if exists "parents view relevant announcements" on public.team_announcements;
create policy "parents view relevant announcements" on public.team_announcements for select to authenticated using(is_active and (team_id is null or public.is_parent_for_team(team_id)) and (expires_at is null or expires_at>now()));
drop policy if exists "parents view linked jersey status" on public.player_jersey_tracking;
create policy "parents view linked jersey status" on public.player_jersey_tracking for select to authenticated using(public.is_parent_for_player(player_id));
drop policy if exists "parents view published development" on public.player_development_notes;
create policy "parents view published development" on public.player_development_notes for select to authenticated using(parent_visible and not manager_only and public.is_parent_for_player(player_id));
drop policy if exists "parents view linked separate invoices" on public.stripe_invoice_links;
create policy "parents view linked separate invoices" on public.stripe_invoice_links for select to authenticated using(public.is_parent_for_player(player_id));

create index if not exists parent_player_links_player_idx on public.parent_player_links(player_id);
create index if not exists player_development_parent_visible_idx on public.player_development_notes(player_id,created_at desc) where parent_visible=true;
