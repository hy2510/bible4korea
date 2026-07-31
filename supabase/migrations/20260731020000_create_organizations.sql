begin;

alter table public.user_profile_settings
  drop column if exists affiliation_filter_only;

create or replace function public.normalize_organization_name(value text)
returns text
language sql
immutable
strict
set search_path = public
as $$
  select lower(regexp_replace(btrim(value), '\s+', ' ', 'g'));
$$;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null
    check (
      char_length(name) between 1 and 50
      and name = regexp_replace(btrim(name), '\s+', ' ', 'g')
    ),
  normalized_name text not null unique
    check (
      char_length(normalized_name) between 1 and 50
      and normalized_name = public.normalize_organization_name(name)
    ),
  owner_user_id uuid not null unique
    references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_memberships (
  user_id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid not null
    references public.organizations(id) on delete cascade,
  role text not null default 'member'
    check (role in ('owner', 'member')),
  status text not null default 'pending'
    check (status in ('pending', 'approved')),
  requested_at timestamptz not null default now(),
  approved_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id),
  check (role <> 'owner' or status = 'approved')
);

create index if not exists organizations_normalized_name_prefix_idx
  on public.organizations (normalized_name text_pattern_ops);

create index if not exists organization_memberships_org_status_requested_idx
  on public.organization_memberships (
    organization_id,
    status,
    requested_at
  );

create index if not exists organization_memberships_org_role_status_idx
  on public.organization_memberships (
    organization_id,
    role,
    status
  );

alter table public.organizations enable row level security;
alter table public.organization_memberships enable row level security;

revoke all on table public.organizations
  from public, anon, authenticated;
revoke all on table public.organization_memberships
  from public, anon, authenticated;

with legacy_organizations as (
  select
    (array_agg(
      regexp_replace(btrim(profile.affiliation), '\s+', ' ', 'g')
      order by profile.updated_at, profile.user_id
    ))[1] as name,
    public.normalize_organization_name(profile.affiliation) as normalized_name,
    (array_agg(
      profile.user_id
      order by profile.updated_at, profile.user_id
    ))[1] as owner_user_id,
    min(profile.updated_at) as created_at
  from public.user_profile_settings as profile
  where profile.affiliation is not null
  group by public.normalize_organization_name(profile.affiliation)
)
insert into public.organizations (
  name,
  normalized_name,
  owner_user_id,
  created_at,
  updated_at
)
select
  legacy.name,
  legacy.normalized_name,
  legacy.owner_user_id,
  legacy.created_at,
  now()
from legacy_organizations as legacy
on conflict (normalized_name) do nothing;

insert into public.organization_memberships (
  user_id,
  organization_id,
  role,
  status,
  requested_at,
  approved_at,
  updated_at
)
select
  profile.user_id,
  organization.id,
  case
    when organization.owner_user_id = profile.user_id then 'owner'
    else 'member'
  end,
  'approved',
  profile.updated_at,
  profile.updated_at,
  now()
from public.user_profile_settings as profile
join public.organizations as organization
  on organization.normalized_name =
    public.normalize_organization_name(profile.affiliation)
where profile.affiliation is not null
on conflict (user_id) do nothing;

create or replace function public.create_organization(
  p_owner_user_id uuid,
  p_name text
)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  normalized_display_name text;
  normalized_key text;
  organization_id uuid;
begin
  normalized_display_name :=
    regexp_replace(btrim(coalesce(p_name, '')), '\s+', ' ', 'g');
  normalized_key :=
    public.normalize_organization_name(normalized_display_name);

  if char_length(normalized_display_name) < 1
    or char_length(normalized_display_name) > 50 then
    raise exception 'invalid_organization_name';
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
    owner_user_id
  )
  values (
    normalized_display_name,
    normalized_key,
    p_owner_user_id
  )
  returning id into organization_id;

  insert into public.organization_memberships (
    user_id,
    organization_id,
    role,
    status,
    approved_at
  )
  values (
    p_owner_user_id,
    organization_id,
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

create or replace function public.request_organization_membership(
  p_user_id uuid,
  p_organization_id uuid
)
returns void
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.organizations as organization
    where organization.id = p_organization_id
  ) then
    raise exception 'organization_not_found';
  end if;

  if exists (
    select 1
    from public.organization_memberships as membership
    where membership.user_id = p_user_id
  ) then
    raise exception 'already_has_organization_membership';
  end if;

  insert into public.organization_memberships (
    user_id,
    organization_id,
    role,
    status
  )
  values (
    p_user_id,
    p_organization_id,
    'member',
    'pending'
  );
end;
$$;

create or replace function public.leave_organization(
  p_user_id uuid
)
returns void
language plpgsql
set search_path = public
as $$
declare
  membership_role text;
begin
  select membership.role
  into membership_role
  from public.organization_memberships as membership
  where membership.user_id = p_user_id
  for update;

  if membership_role is null then
    return;
  end if;

  if membership_role = 'owner' then
    raise exception 'organization_owner_cannot_leave';
  end if;

  delete from public.organization_memberships
  where user_id = p_user_id;

  update public.user_profile_settings
  set affiliation = null,
      updated_at = now()
  where user_id = p_user_id;
end;
$$;

create or replace function public.review_organization_membership(
  p_owner_user_id uuid,
  p_member_user_id uuid,
  p_action text
)
returns void
language plpgsql
set search_path = public
as $$
declare
  owner_organization_id uuid;
  member_status text;
  organization_name text;
begin
  select membership.organization_id
  into owner_organization_id
  from public.organization_memberships as membership
  where membership.user_id = p_owner_user_id
    and membership.role = 'owner'
    and membership.status = 'approved';

  if owner_organization_id is null then
    raise exception 'organization_owner_required';
  end if;

  select membership.status
  into member_status
  from public.organization_memberships as membership
  where membership.organization_id = owner_organization_id
    and membership.user_id = p_member_user_id
    and membership.role = 'member'
  for update;

  if member_status is null then
    raise exception 'organization_member_not_found';
  end if;

  if p_action = 'approve' and member_status = 'pending' then
    update public.organization_memberships
    set status = 'approved',
        approved_at = now(),
        updated_at = now()
    where user_id = p_member_user_id;

    select organization.name
    into organization_name
    from public.organizations as organization
    where organization.id = owner_organization_id;

    insert into public.user_profile_settings (
      user_id,
      affiliation,
      updated_at
    )
    values (
      p_member_user_id,
      organization_name,
      now()
    )
    on conflict (user_id) do update
      set affiliation = excluded.affiliation,
          updated_at = excluded.updated_at;
    return;
  end if;

  if p_action = 'reject' and member_status = 'pending' then
    delete from public.organization_memberships
    where user_id = p_member_user_id;
    return;
  end if;

  if p_action = 'remove' and member_status = 'approved' then
    delete from public.organization_memberships
    where user_id = p_member_user_id;

    update public.user_profile_settings
    set affiliation = null,
        updated_at = now()
    where user_id = p_member_user_id;
    return;
  end if;

  raise exception 'invalid_membership_action';
end;
$$;

create or replace function public.search_organizations(
  p_query text,
  p_offset integer default 0,
  p_limit integer default 10
)
returns table (
  id uuid,
  name text
)
language sql
stable
set search_path = public
as $$
  select
    organization.id,
    organization.name
  from public.organizations as organization
  where organization.normalized_name like
    replace(
      replace(
        replace(
          public.normalize_organization_name(p_query),
          E'\\',
          E'\\\\'
        ),
        '%',
        E'\\%'
      ),
      '_',
      E'\\_'
    ) || '%'
    escape E'\\'
  order by organization.normalized_name, organization.id
  offset greatest(p_offset, 0)
  limit least(greatest(p_limit, 1), 20);
$$;

drop function if exists public.get_activity_ranking(
  date,
  date,
  text,
  integer,
  integer
);

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
      profile.nickname,
      organization.name as affiliation,
      weekly.read_count,
      row_number() over (
        order by weekly.read_count desc, account.username asc
      ) as ranking_position,
      count(*) over () as total_count
    from weekly_counts as weekly
    join public.user_accounts as account
      on account.user_id = weekly.user_id
    join public.organizations as organization
      on organization.id = p_organization_id
    left join public.user_profile_settings as profile
      on profile.user_id = weekly.user_id
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

drop function if exists public.get_activity_ranking_user_summary(
  text,
  date,
  date
);

create or replace function public.get_activity_ranking_user_summary(
  p_username text,
  p_start_date date,
  p_end_date date,
  p_organization_id uuid
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
    profile.nickname,
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
  join public.organization_memberships as membership
    on membership.user_id = account.user_id
    and membership.organization_id = p_organization_id
    and membership.status = 'approved'
  join public.organizations as organization
    on organization.id = membership.organization_id
  left join public.user_profile_settings as profile
    on profile.user_id = account.user_id
  where account.username = p_username;
$$;

revoke all on function public.normalize_organization_name(text)
  from public, anon, authenticated;
revoke all on function public.create_organization(uuid, text)
  from public, anon, authenticated;
revoke all on function public.request_organization_membership(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.leave_organization(uuid)
  from public, anon, authenticated;
revoke all on function public.review_organization_membership(uuid, uuid, text)
  from public, anon, authenticated;
revoke all on function public.search_organizations(text, integer, integer)
  from public, anon, authenticated;
revoke all on function public.get_activity_ranking(
  date,
  date,
  uuid,
  integer,
  integer
) from public, anon, authenticated;
revoke all on function public.get_activity_ranking_user_summary(
  text,
  date,
  date,
  uuid
) from public, anon, authenticated;

grant execute on function public.create_organization(uuid, text)
  to service_role;
grant execute on function public.normalize_organization_name(text)
  to service_role;
grant execute on function public.request_organization_membership(uuid, uuid)
  to service_role;
grant execute on function public.leave_organization(uuid)
  to service_role;
grant execute on function public.review_organization_membership(
  uuid,
  uuid,
  text
) to service_role;
grant execute on function public.search_organizations(text, integer, integer)
  to service_role;
grant execute on function public.get_activity_ranking(
  date,
  date,
  uuid,
  integer,
  integer
) to service_role;
grant execute on function public.get_activity_ranking_user_summary(
  text,
  date,
  date,
  uuid
) to service_role;

revoke insert, update, delete
  on table public.user_profile_settings
  from authenticated;
grant insert (user_id, nickname, updated_at)
  on table public.user_profile_settings
  to authenticated;
grant update (nickname, updated_at)
  on table public.user_profile_settings
  to authenticated;

commit;
