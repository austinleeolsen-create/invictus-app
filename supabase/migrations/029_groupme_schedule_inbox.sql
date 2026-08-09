create table if not exists public.groupme_team_connections (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null unique references public.teams(id) on delete cascade,
  group_id text not null unique,
  group_name text not null,
  bot_id_encrypted text,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.groupme_schedule_submissions (
  id uuid primary key default gen_random_uuid(),
  group_message_id text not null unique,
  team_id uuid not null references public.teams(id) on delete cascade,
  sender_name text,
  raw_message text not null,
  event_type text not null check (event_type in ('practice','game','tournament','meeting','other')),
  title text not null,
  start_at timestamptz,
  end_at timestamptz,
  location text,
  opponent text,
  notes text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  received_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null
);

alter table public.groupme_team_connections enable row level security;
alter table public.groupme_schedule_submissions enable row level security;
drop policy if exists "operations managers manage groupme connections" on public.groupme_team_connections;
create policy "operations managers manage groupme connections" on public.groupme_team_connections for all to authenticated using (public.can_manage_court_schedule()) with check (public.can_manage_court_schedule());
drop policy if exists "operations managers manage groupme submissions" on public.groupme_schedule_submissions;
create policy "operations managers manage groupme submissions" on public.groupme_schedule_submissions for all to authenticated using (public.can_manage_court_schedule()) with check (public.can_manage_court_schedule());
create index if not exists groupme_submissions_status_idx on public.groupme_schedule_submissions(status, received_at desc);
