create table if not exists public.qbo_connections (
  id uuid primary key default gen_random_uuid(),
  realm_id text not null unique,
  environment text not null check (environment in ('sandbox', 'production')),
  access_token_encrypted text not null,
  refresh_token_encrypted text not null,
  access_token_expires_at timestamptz not null,
  refresh_token_expires_at timestamptz not null,
  connected_by uuid references auth.users(id) on delete set null,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.qbo_connections enable row level security;

create policy "admins can view qbo connections"
on public.qbo_connections for select to authenticated
using (public.is_owner_admin());

create policy "admins can manage qbo connections"
on public.qbo_connections for all to authenticated
using (public.is_owner_admin())
with check (public.is_owner_admin());
