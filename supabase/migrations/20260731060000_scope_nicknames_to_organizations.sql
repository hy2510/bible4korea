begin;

alter table public.organization_memberships
  add column nickname text;

update public.organization_memberships as membership
set nickname = coalesce(
  nullif(btrim(profile.nickname), ''),
  account.username
)
from public.user_accounts as account
left join public.user_profile_settings as profile
  on profile.user_id = account.user_id
where account.user_id = membership.user_id;

alter table public.organization_memberships
  alter column nickname set not null,
  add constraint organization_memberships_nickname_check
  check (
    char_length(nickname) between 1 and 20
    and nickname = regexp_replace(btrim(nickname), '\s+', ' ', 'g')
  );

comment on column public.organization_memberships.nickname is
  'Organization-scoped nickname chosen when creating or joining the organization.';

drop function if exists public.create_organization(uuid, text, text, text);

create function public.create_organization(
  p_owner_user_id uuid,
  p_name text,
  p_nickname text,
  p_description text default null,
  p_password text default null
)
returns uuid
language plpgsql
set search_path = public, extensions
as $$
declare
  normalized_display_name text;
  normalized_key text;
  normalized_nickname text;
  normalized_description text;
  organization_id uuid;
begin
  normalized_display_name :=
    regexp_replace(btrim(coalesce(p_name, '')), '\s+', ' ', 'g');
  normalized_key :=
    public.normalize_organization_name(normalized_display_name);
  normalized_nickname :=
    regexp_replace(btrim(coalesce(p_nickname, '')), '\s+', ' ', 'g');
  normalized_description :=
    nullif(
      regexp_replace(btrim(coalesce(p_description, '')), '\s+', ' ', 'g'),
      ''
    );

  if char_length(normalized_display_name) < 1
    or char_length(normalized_display_name) > 50 then
    raise exception 'invalid_organization_name';
  end if;

  if char_length(normalized_nickname) < 1
    or char_length(normalized_nickname) > 20 then
    raise exception 'invalid_organization_nickname';
  end if;

  if normalized_description is not null
    and char_length(normalized_description) > 300 then
    raise exception 'invalid_organization_description';
  end if;

  if p_password is not null
    and (
      char_length(p_password) < 4
      or char_length(p_password) > 20
    ) then
    raise exception 'invalid_organization_password';
  end if;

  if exists (
    select 1
    from public.organization_memberships as membership
    where membership.user_id = p_owner_user_id
  ) then
    raise exception 'already_has_organization_membership';
  end if;

  insert into public.organizations (
    name,
    normalized_name,
    description,
    join_password_hash,
    owner_user_id
  )
  values (
    normalized_display_name,
    normalized_key,
    normalized_description,
    case
      when p_password is null then null
      else crypt(p_password, gen_salt('bf', 10))
    end,
    p_owner_user_id
  )
  returning id into organization_id;

  insert into public.organization_memberships (
    user_id,
    organization_id,
    nickname,
    role,
    status,
    approved_at
  )
  values (
    p_owner_user_id,
    organization_id,
    normalized_nickname,
    'owner',
    'approved',
    now()
  );

  insert into public.user_profile_settings (
    user_id,
    affiliation,
    updated_at
  )
  values (
    p_owner_user_id,
    normalized_display_name,
    now()
  )
  on conflict (user_id) do update
    set affiliation = excluded.affiliation,
        updated_at = excluded.updated_at;

  return organization_id;
exception
  when unique_violation then
    raise exception 'organization_name_taken';
end;
$$;

drop function if exists public.request_organization_membership(
  uuid,
  uuid,
  text
);

create function public.request_organization_membership(
  p_user_id uuid,
  p_organization_id uuid,
  p_nickname text,
  p_password text default null
)
returns void
language plpgsql
set search_path = public, extensions
as $$
declare
  organization_password_hash text;
  normalized_nickname text;
begin
  normalized_nickname :=
    regexp_replace(btrim(coalesce(p_nickname, '')), '\s+', ' ', 'g');

  if char_length(normalized_nickname) < 1
    or char_length(normalized_nickname) > 20 then
    raise exception 'invalid_organization_nickname';
  end if;

  select organization.join_password_hash
  into organization_password_hash
  from public.organizations as organization
  where organization.id = p_organization_id;

  if not found then
    raise exception 'organization_not_found';
  end if;

  if exists (
    select 1
    from public.organization_memberships as membership
    where membership.user_id = p_user_id
  ) then
    raise exception 'already_has_organization_membership';
  end if;

  if organization_password_hash is not null then
    if p_password is null then
      raise exception 'organization_password_required';
    end if;

    if crypt(p_password, organization_password_hash) <>
      organization_password_hash then
      raise exception 'invalid_organization_password';
    end if;
  end if;

  insert into public.organization_memberships (
    user_id,
    organization_id,
    nickname,
    role,
    status
  )
  values (
    p_user_id,
    p_organization_id,
    normalized_nickname,
    'member',
    'pending'
  );
end;
$$;

create or replace function public.get_activity_ranking(
  p_start_date date,
  p_end_date date,
  p_organization_id uuid,
  p_offset integer default 0,
  p_limit integer default 5
)
returns table (
  user_id uuid,
  username text,
  nickname text,
  affiliation text,
  read_count bigint,
  ranking_position bigint,
  total_count bigint
)
language sql
stable
set search_path = public
as $$
  with weekly_counts as (
    select
      stats.user_id,
      sum(stats.read_count)::bigint as read_count
    from public.user_reading_daily_stats as stats
    join public.organization_memberships as membership
      on membership.user_id = stats.user_id
      and membership.organization_id = p_organization_id
      and membership.status = 'approved'
    where stats.reading_date >= p_start_date
      and stats.reading_date < p_end_date
    group by stats.user_id
  ),
  ranked as (
    select
      account.user_id,
      account.username,
      membership.nickname,
      organization.name as affiliation,
      weekly.read_count,
      row_number() over (
        order by weekly.read_count desc, account.username asc
      ) as ranking_position,
      count(*) over () as total_count
    from weekly_counts as weekly
    join public.user_accounts as account
      on account.user_id = weekly.user_id
    join public.organization_memberships as membership
      on membership.user_id = weekly.user_id
      and membership.organization_id = p_organization_id
      and membership.status = 'approved'
    join public.organizations as organization
      on organization.id = p_organization_id
    where weekly.read_count > 0
  )
  select
    ranked.user_id,
    ranked.username,
    ranked.nickname,
    ranked.affiliation,
    ranked.read_count,
    ranked.ranking_position,
    ranked.total_count
  from ranked
  order by ranked.ranking_position
  offset greatest(p_offset, 0)
  limit least(greatest(p_limit, 1), 50);
$$;

create or replace function public.get_authorized_activity_summary(
  p_username text,
  p_start_date date,
  p_end_date date,
  p_requester_user_id uuid
)
returns table (
  username text,
  nickname text,
  affiliation text,
  this_week_read_count bigint,
  total_read_count bigint,
  active_book_count bigint,
  completed_book_count bigint,
  book_completion_count bigint,
  bible_completion_count integer,
  daily_goal_achievement_count bigint,
  daily_goal_achievement_dates date[],
  daily_goal_started_date date,
  weekly_read_counts jsonb
)
language sql
stable
set search_path = public
as $$
  select
    account.username,
    target_membership.nickname,
    organization.name as affiliation,
    coalesce((
      select sum(stats.read_count)
      from public.user_reading_daily_stats as stats
      where stats.user_id = account.user_id
        and stats.reading_date >= p_start_date
        and stats.reading_date < p_end_date
    ), 0)::bigint as this_week_read_count,
    (
      select count(*)
      from public.user_verse_completions as completion
      where completion.user_id = account.user_id
    )::bigint as total_read_count,
    (
      select count(distinct active_book.book_slug)
      from (
        select completion.book_slug
        from public.user_verse_completions as completion
        where completion.user_id = account.user_id
        union
        select achievement.book_slug
        from public.user_book_reading_achievements as achievement
        where achievement.user_id = account.user_id
      ) as active_book
    )::bigint as active_book_count,
    (
      select count(distinct achievement.book_slug)
      from public.user_book_reading_achievements as achievement
      where achievement.user_id = account.user_id
    )::bigint as completed_book_count,
    (
      select count(*)
      from public.user_book_reading_achievements as achievement
      where achievement.user_id = account.user_id
    )::bigint as book_completion_count,
    coalesce((
      select max(achievement.completion_count)
      from public.user_bible_reading_achievements as achievement
      where achievement.user_id = account.user_id
    ), 0)::integer as bible_completion_count,
    (
      select count(*)
      from public.user_daily_goal_achievements as achievement
      where achievement.user_id = account.user_id
    )::bigint as daily_goal_achievement_count,
    coalesce((
      select array_agg(
        achievement.goal_date
        order by achievement.goal_date desc
      )
      from public.user_daily_goal_achievements as achievement
      where achievement.user_id = account.user_id
    ), array[]::date[]) as daily_goal_achievement_dates,
    coalesce(
      (
        select (goal.created_at at time zone 'Asia/Seoul')::date
        from public.user_daily_goals as goal
        where goal.user_id = account.user_id
      ),
      (
        select min(achievement.goal_date)
        from public.user_daily_goal_achievements as achievement
        where achievement.user_id = account.user_id
      )
    ) as daily_goal_started_date,
    coalesce((
      select jsonb_object_agg(
        stats.reading_date::text,
        stats.read_count
        order by stats.reading_date
      )
      from public.user_reading_daily_stats as stats
      where stats.user_id = account.user_id
        and stats.reading_date >= p_start_date
        and stats.reading_date < p_end_date
    ), '{}'::jsonb) as weekly_read_counts
  from public.user_accounts as account
  left join public.organization_memberships as target_membership
    on target_membership.user_id = account.user_id
    and target_membership.status = 'approved'
  left join public.organizations as organization
    on organization.id = target_membership.organization_id
  where account.username = p_username
    and (
      account.user_id = p_requester_user_id
      or exists (
        select 1
        from public.user_friends as friendship
        where (
          friendship.owner_user_id = p_requester_user_id
          and friendship.friend_user_id = account.user_id
        )
        or (
          friendship.owner_user_id = account.user_id
          and friendship.friend_user_id = p_requester_user_id
        )
      )
    );
$$;

drop function if exists public.get_activity_ranking_user_summary(
  text,
  date,
  date,
  uuid
);

alter table public.user_profile_settings
  drop column nickname;

revoke all on function public.create_organization(
  uuid,
  text,
  text,
  text,
  text
) from public, anon, authenticated;
revoke all on function public.request_organization_membership(
  uuid,
  uuid,
  text,
  text
) from public, anon, authenticated;

grant execute on function public.create_organization(
  uuid,
  text,
  text,
  text,
  text
) to service_role;
grant execute on function public.request_organization_membership(
  uuid,
  uuid,
  text,
  text
) to service_role;

commit;
