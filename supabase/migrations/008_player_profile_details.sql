create table if not exists public.player_profile_details (player_id uuid primary key references public.players(id) on delete cascade,parent_name text,parent_email text,parent_phone text,emergency_contact text,coach_notes text,admin_notes text,updated_by uuid references auth.users(id) on delete set null,updated_at timestamptz not null default now());
alter table public.player_profile_details enable row level security;
create policy "admins can view player profile details" on public.player_profile_details for select to authenticated using (public.is_owner_admin());
create policy "admins can manage player profile details" on public.player_profile_details for all to authenticated using (public.is_owner_admin()) with check (public.is_owner_admin());
