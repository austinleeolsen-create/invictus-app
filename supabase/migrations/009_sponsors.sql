create table if not exists public.sponsors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_name text,
  contact_email text,
  stage text not null default 'prospect' check (stage in ('prospect','contacted','committed','paid','renewing','declined')),
  contribution_type text not null default 'cash' check (contribution_type in ('cash','in_kind','gear')),
  amount numeric not null default 0 check (amount >= 0),
  renewal_date date,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.sponsors enable row level security;
create policy "admins can view sponsors" on public.sponsors for select to authenticated using (public.is_owner_admin());
create policy "admins can manage sponsors" on public.sponsors for all to authenticated using (public.is_owner_admin()) with check (public.is_owner_admin());
