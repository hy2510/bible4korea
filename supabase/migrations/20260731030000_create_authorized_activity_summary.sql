begin;

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
        from public.organization_memberships as requester_membership
        where requester_membership.user_id = p_requester_user_id
          and requester_membership.status = 'approved'
          and requester_membership.organization_id =
            target_membership.organization_id
      )
    );
$$;

revoke all on function public.get_authorized_activity_summary(
  text,
  date,
  date,
  uuid
) from public, anon, authenticated;

grant execute on function public.get_authorized_activity_summary(
  text,
  date,
  date,
  uuid
) to service_role;

commit;
