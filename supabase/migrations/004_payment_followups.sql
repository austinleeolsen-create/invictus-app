create table if not exists public.payment_followups (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  followup_month date not null,
  status text not null default 'not_contacted' check (status in ('not_contacted','contacted','payment_promised','resolved','write_off')),
  note text,
  contacted_at timestamptz,
  resolved_at timestamptz,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (player_id, followup_month)
);

alter table public.payment_followups enable row level security;

create policy "admins can view payment followups"
on public.payment_followups for select to authenticated
using (public.is_owner_admin());

create policy "admins can create payment followups"
on public.payment_followups for insert to authenticated
with check (public.is_owner_admin());

create policy "admins can update payment followups"
on public.payment_followups for update to authenticated
using (public.is_owner_admin())
with check (public.is_owner_admin());
