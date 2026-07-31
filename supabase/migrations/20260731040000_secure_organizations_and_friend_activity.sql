begin;

create extension if not exists pgcrypto with schema extensions;

alter table public.organizations
  add column if not exists description text,
  add column if not exists join_password_hash text;

alter table public.organizations
  add constraint organizations_description_check
  check (
    description is null
    or (
      char_length(description) between 1 and 300
      and description = regexp_replace(btrim(description), '\s+', ' ', 'g')
    )
  );

comment on column public.organizations.description is
  'Optional public description shown in organization search results.';
comment on column public.organizations.join_password_hash is
  'Optional bcrypt hash for organization membership requests; plaintext is never stored.';

create index if not exists organization_memberships_org_status_user_idx
  on public.organization_memberships (
    organization_id,
    status,
    user_id
  );

drop function if exists public.create_organization(uuid, text);

create function public.create_organization(
  p_owner_user_id uuid,
  p_name text,
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
  normalized_description text;
  organization_id uuid;
begin
  normalized_display_name :=
    regexp_replace(btrim(coalesce(p_name, '')), '\s+', ' ', 'g');
  normalized_key :=
    public.normalize_organization_name(normalized_display_name);
  normalized_description :=
    nullif(
      regexp_replace(btrim(coalesce(p_description, '')), '\s+', ' ', 'g'),
      ''
    );

  if char_length(normalized_display_name) < 1
    or char_length(normalized_display_name) > 50 then
    raise exception 'invalid_organization_name';
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

  if not exists (
    select 1
    from public.user_profile_settings as profile
    where profile.user_id = p_owner_user_id
      and nullif(btrim(profile.nickname), '') is not null
  ) then
    raise exception 'nickname_required';
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

drop function if exists public.request_organization_membership(uuid, uuid);

create function public.request_organization_membership(
  p_user_id uuid,
  p_organization_id uuid,
  p_password text default null
)
returns void
language plpgsql
set search_path = public, extensions
as $$
declare
  organization_password_hash text;
begin
  select organization.join_password_hash
  into organization_password_hash
  from public.organizations as organization
  where organization.id = p_organization_id;

  if not found then
    raise exception 'organization_not_found';
  end if;

  if not exists (
    select 1
    from public.user_profile_settings as profile
    where profile.user_id = p_user_id
      and nullif(btrim(profile.nickname), '') is not null
  ) then
    raise exception 'nickname_required';
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

drop function if exists public.search_organizations(text, integer, integer);

create function public.search_organizations(
  p_query text,
  p_offset integer default 0,
  p_limit integer default 10
)
returns table (
  id uuid,
  name text,
  description text,
  requires_password boolean
)
language sql
stable
set search_path = public
as $$
  select
    organization.id,
    organization.name,
    organization.description,
    organization.join_password_hash is not null as requires_password
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
  left join public.user_profile_settings as profile
    on profile.user_id = account.user_id
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

revoke all on function public.create_organization(
  uuid,
  text,
  text,
  text
) from public, anon, authenticated;
revoke all on function public.request_organization_membership(
  uuid,
  uuid,
  text
) from public, anon, authenticated;
revoke all on function public.search_organizations(
  text,
  integer,
  integer
) from public, anon, authenticated;
revoke all on function public.get_authorized_activity_summary(
  text,
  date,
  date,
  uuid
) from public, anon, authenticated;

grant execute on function public.create_organization(
  uuid,
  text,
  text,
  text
) to service_role;
grant execute on function public.request_organization_membership(
  uuid,
  uuid,
  text
) to service_role;
grant execute on function public.search_organizations(
  text,
  integer,
  integer
) to service_role;
grant execute on function public.get_authorized_activity_summary(
  text,
  date,
  date,
  uuid
) to service_role;

commit;
