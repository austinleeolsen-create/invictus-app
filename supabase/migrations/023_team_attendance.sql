alter table public.player_development_notes
  add column if not exists activity_date date not null default current_date;

create index if not exists player_development_attendance_date_idx
  on public.player_development_notes(team_id, activity_date)
  where category = 'attendance';
