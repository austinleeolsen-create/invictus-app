alter table public.coaches
add column if not exists staff_role text,
add column if not exists is_coach boolean not null default true;

update public.coaches set staff_role = coalesce(nullif(staff_role, ''), 'Coach');

update public.monthly_payroll_entries payroll
set coach_id = staff.id
from public.coaches staff
where payroll.coach_id is null
  and lower(trim(payroll.staff_name)) = lower(trim(staff.name));

create index if not exists coaches_staff_name_idx on public.coaches (lower(name));
