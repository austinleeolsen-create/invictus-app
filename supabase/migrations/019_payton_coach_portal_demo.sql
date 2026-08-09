do $$
declare
  demo_season_id uuid;
  payton_coach_id uuid;
  demo_team_id uuid;
  demo_team record;
  demo_player record;
begin
  select id into demo_season_id
  from public.seasons
  where lower(name) = lower('Coach Portal Demo')
  limit 1;

  if demo_season_id is null then
    insert into public.seasons (name, is_current)
    values ('Coach Portal Demo', false)
    returning id into demo_season_id;
  end if;

  select id into payton_coach_id
  from public.coaches
  where name ilike 'Payton%'
  limit 1;

  if payton_coach_id is null then
    insert into public.coaches (name, staff_role, is_coach)
    values ('Payton (Demo Coach)', 'Coach', true)
    returning id into payton_coach_id;
  end if;

  for demo_team in
    select * from (values
      ('Payton Rockets 12U', '12U'),
      ('Payton Rockets 14U', '14U'),
      ('Payton Rockets 16U', '16U')
    ) as team_list(name, age_group)
  loop
    select id into demo_team_id
    from public.teams
    where season_id = demo_season_id
      and lower(name) = lower(demo_team.name)
    limit 1;

    if demo_team_id is null then
      insert into public.teams (name, age_group, season_id)
      values (demo_team.name, demo_team.age_group, demo_season_id)
      returning id into demo_team_id;
    end if;

    insert into public.team_coaches (team_id, coach_id, role)
    values (demo_team_id, payton_coach_id, 'head')
    on conflict (team_id, coach_id)
    do update set role = excluded.role;
  end loop;

  for demo_player in
    select * from (values
      ('Amen', 'Thompson', '1', 'Payton Rockets 12U'),
      ('Kevin', 'Durant', '7', 'Payton Rockets 12U'),
      ('Jabari', 'Smith Jr.', '10', 'Payton Rockets 12U'),
      ('Steven', 'Adams', '12', 'Payton Rockets 12U'),
      ('Reed', 'Sheppard', '15', 'Payton Rockets 12U'),
      ('Alperen', 'Sengun', '28', 'Payton Rockets 12U'),
      ('Aaron', 'Holiday', '0', 'Payton Rockets 14U'),
      ('Fred', 'VanVleet', '5', 'Payton Rockets 14U'),
      ('Jae''Sean', 'Tate', '8', 'Payton Rockets 14U'),
      ('Tari', 'Eason', '17', 'Payton Rockets 14U'),
      ('Clint', 'Capela', '30', 'Payton Rockets 14U'),
      ('Marcus', 'Smart', '36', 'Payton Rockets 14U'),
      ('Bruce', 'Thornton', null, 'Payton Rockets 16U'),
      ('Quadir', 'Copeland', null, 'Payton Rockets 16U'),
      ('JD', 'Davison', '4', 'Payton Rockets 16U'),
      ('Tristen', 'Newton', '13', 'Payton Rockets 16U'),
      ('Isaiah', 'Crawford', '27', 'Payton Rockets 16U'),
      ('Jeff', 'Green', '32', 'Payton Rockets 16U')
    ) as player_list(first_name, last_name, jersey, team_name)
  loop
    select id into demo_team_id
    from public.teams
    where season_id = demo_season_id
      and lower(name) = lower(demo_player.team_name)
    limit 1;

    if not exists (
      select 1 from public.players
      where team_id = demo_team_id
        and lower(first_name) = lower(demo_player.first_name)
        and lower(last_name) = lower(demo_player.last_name)
    ) then
      insert into public.players
        (first_name, last_name, jersey, team_id, status, billing_status)
      values
        (demo_player.first_name, demo_player.last_name, demo_player.jersey, demo_team_id, 'active', 'no_sub');
    end if;
  end loop;
end $$;
