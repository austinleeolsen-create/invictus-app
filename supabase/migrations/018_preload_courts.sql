insert into public.courts (name)
values
  ('Court 1A'),
  ('Court 1B'),
  ('Court 2A'),
  ('Court 2B')
on conflict (name) do nothing;
