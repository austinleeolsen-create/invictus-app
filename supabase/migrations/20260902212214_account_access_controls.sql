alter table public.profiles
  add column if not exists email text,
  add column if not exists is_active boolean not null default true,
  add column if not exists access_disabled_at timestamptz,
  add column if not exists access_disabled_by uuid references auth.users(id) on delete set null,
  add column if not exists access_disabled_reason text;

update public.profiles as profile
set email = users.email
from auth.users as users
where users.id = profile.id
  and profile.email is distinct from users.email;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

create or replace function private.is_active_account()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from public.profiles as profile
      where profile.id = (select auth.uid())
        and profile.is_active = true
    );
$$;

create or replace function private.is_active_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from public.profiles as profile
      where profile.id = (select auth.uid())
        and profile.is_active = true
        and profile.role = 'owner_admin'
    );
$$;

revoke all on function private.is_active_account() from public, anon;
revoke all on function private.is_active_owner() from public, anon;
grant execute on function private.is_active_account() to authenticated, service_role;
grant execute on function private.is_active_owner() to authenticated, service_role;

grant select on public.profiles to authenticated;
grant update (is_active, access_disabled_at, access_disabled_by, access_disabled_reason)
  on public.profiles to authenticated;

drop policy if exists "active owners view account access" on public.profiles;
create policy "active owners view account access"
on public.profiles for select
to authenticated
using ((select private.is_active_owner()));

drop policy if exists "active owners update account access" on public.profiles;
create policy "active owners update account access"
on public.profiles for update
to authenticated
using ((select private.is_active_owner()))
with check ((select private.is_active_owner()));

do $$
declare
  table_record record;
begin
  for table_record in
    select schemaname, tablename
    from pg_tables
    where schemaname = 'public'
      and rowsecurity = true
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      'active accounts only',
      table_record.schemaname,
      table_record.tablename
    );
    execute format(
      'create policy %I on %I.%I as restrictive for all to authenticated using ((select private.is_active_account())) with check ((select private.is_active_account()))',
      'active accounts only',
      table_record.schemaname,
      table_record.tablename
    );
  end loop;
end
$$;

comment on column public.profiles.is_active is
  'When false, the account is blocked by application checks and restrictive RLS policies while its historical records are preserved.';
