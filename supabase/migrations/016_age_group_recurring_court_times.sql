alter table public.court_slots add column if not exists age_group text;
create index if not exists court_slots_court_time_idx on public.court_slots(court_id,start_at,end_at);
