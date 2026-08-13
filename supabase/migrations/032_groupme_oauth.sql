create table if not exists public.groupme_oauth_connections(user_id uuid primary key references auth.users(id) on delete cascade,access_token_encrypted text not null,connected_at timestamptz not null default now(),updated_at timestamptz not null default now());
alter table public.groupme_oauth_connections enable row level security;
create policy "operations managers manage own groupme oauth" on public.groupme_oauth_connections for all to authenticated using(user_id=auth.uid() and public.can_manage_court_schedule()) with check(user_id=auth.uid() and public.can_manage_court_schedule());
