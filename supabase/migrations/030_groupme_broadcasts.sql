create table if not exists public.groupme_broadcasts (
  id uuid primary key default gen_random_uuid(),
  message text not null,
  status text not null default 'sending' check (status in ('sending','completed','partial','failed')),
  sent_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.groupme_broadcast_deliveries (
  id uuid primary key default gen_random_uuid(),
  broadcast_id uuid not null references public.groupme_broadcasts(id) on delete cascade,
  connection_id uuid references public.groupme_team_connections(id) on delete set null,
  team_id uuid references public.teams(id) on delete set null,
  group_name text not null,
  status text not null default 'pending' check (status in ('pending','sent','failed')),
  error_message text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique(broadcast_id, connection_id)
);

alter table public.groupme_broadcasts enable row level security;
alter table public.groupme_broadcast_deliveries enable row level security;
drop policy if exists "operations managers manage groupme broadcasts" on public.groupme_broadcasts;
create policy "operations managers manage groupme broadcasts" on public.groupme_broadcasts for all to authenticated using (public.can_manage_court_schedule()) with check (public.can_manage_court_schedule());
drop policy if exists "operations managers manage groupme deliveries" on public.groupme_broadcast_deliveries;
create policy "operations managers manage groupme deliveries" on public.groupme_broadcast_deliveries for all to authenticated using (public.can_manage_court_schedule()) with check (public.can_manage_court_schedule());
create index if not exists groupme_broadcasts_created_idx on public.groupme_broadcasts(created_at desc);
