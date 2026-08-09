alter table public.pt_session_requests
  drop constraint if exists pt_session_requests_slot_id_key;

create unique index if not exists pt_session_requests_one_active_per_slot_idx
  on public.pt_session_requests(slot_id)
  where status in ('requested', 'approved', 'completed');
