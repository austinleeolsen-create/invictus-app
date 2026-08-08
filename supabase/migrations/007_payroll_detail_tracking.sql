alter table public.monthly_payroll_entries
add column if not exists team_items jsonb not null default '[]'::jsonb,
add column if not exists extra_pay_note text,
add column if not exists bonus_note text;

alter table public.monthly_payroll_entries
add constraint monthly_payroll_team_items_array
check (jsonb_typeof(team_items) = 'array');
