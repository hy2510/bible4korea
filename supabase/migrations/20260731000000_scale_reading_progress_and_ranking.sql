create table if not exists public.user_verse_completions (
  user_id uuid not null references auth.users(id) on delete cascade,
  verse_key text not null
    check (verse_key ~ '^[a-z0-9-]+:[1-9][0-9]*:[1-9][0-9]*$'),
  book_slug text not null check (book_slug ~ '^[a-z0-9-]+$'),
  chapter integer not null check (chapter > 0),
  verse_num integer not null check (verse_num > 0),
  completed_at timestamptz not null,
  completed_date date not null,
  primary key (user_id, verse_key),
  check (
    verse_key =
      book_slug || ':' || chapter::text || ':' || verse_num::text
  )
);

create index if not exists user_verse_completions_user_recent_idx
  on public.user_verse_completions (user_id, completed_at desc);
create index if not exists user_verse_completions_user_book_idx
  on public.user_verse_completions (user_id, book_slug);
create index if not exists user_verse_completions_date_user_idx
  on public.user_verse_completions (completed_date, user_id);

create table if not exists public.user_reading_chapters (
  user_id uuid not null references auth.users(id) on delete cascade,
  chapter_key text not null
    check (chapter_key ~ '^[a-z0-9-]+:[1-9][0-9]*$'),
  book_slug text not null check (book_slug ~ '^[a-z0-9-]+$'),
  chapter integer not null check (chapter > 0),
  total_verses integer not null check (total_verses > 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, chapter_key),
  check (chapter_key = book_slug || ':' || chapter::text)
);

create table if not exists public.user_reading_daily_stats (
  user_id uuid not null references auth.users(id) on delete cascade,
  reading_date date not null,
  read_count integer not null default 0 check (read_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, reading_date)
);

create index if not exists user_reading_daily_stats_date_count_idx
  on public.user_reading_daily_stats
  (reading_date, read_count desc, user_id);

alter table public.user_verse_completions enable row level security;
alter table public.user_reading_chapters enable row level security;
alter table public.user_reading_daily_stats enable row level security;

revoke all on table public.user_verse_completions from anon;
revoke all on table public.user_reading_chapters from anon;
revoke all on table public.user_reading_daily_stats from anon, authenticated;

grant select, insert, update, delete
  on table public.user_verse_completions to authenticated;
grant select, insert, update, delete
  on table public.user_reading_chapters to authenticated;

create policy "Users manage only their verse completions"
  on public.user_verse_completions
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users manage only their reading chapter metadata"
  on public.user_reading_chapters
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Preserve existing users' progress before the application switches to
-- normalized writes. Entries without trustworthy completion dates are kept
-- outside current ranking windows instead of being counted as newly read.
create or replace function public.migration_safe_timestamptz(
  value text,
  fallback_value timestamptz
)
returns timestamptz
language plpgsql
immutable
as $$
begin
  return value::timestamptz;
exception when others then
  return fallback_value;
end;
$$;

create or replace function public.migration_safe_date(
  value text,
  fallback_value date
)
returns date
language plpgsql
immutable
as $$
begin
  return value::date;
exception when others then
  return fallback_value;
end;
$$;

insert into public.user_verse_completions (
  user_id,
  verse_key,
  book_slug,
  chapter,
  verse_num,
  completed_at,
  completed_date
)
select
  progress_row.user_id,
  verse.value,
  split_part(verse.value, ':', 1),
  split_part(verse.value, ':', 2)::integer,
  split_part(verse.value, ':', 3)::integer,
  public.migration_safe_timestamptz(
    detail.value ->> 'completedAt',
    '1970-01-01 00:00:00+00'::timestamptz
  ),
  public.migration_safe_date(
    detail.value ->> 'completedDate',
    '1970-01-01'::date
  )
from public.user_reading_progress as progress_row
cross join lateral jsonb_array_elements_text(
  case
    when jsonb_typeof(progress_row.progress -> 'completedVerseKeys') = 'array'
      then progress_row.progress -> 'completedVerseKeys'
    else '[]'::jsonb
  end
) as verse(value)
left join lateral (
  select progress_row.progress -> 'completedVerseDetails' -> verse.value as value
) as detail on true
where verse.value ~ '^[a-z0-9-]+:[1-9][0-9]*:[1-9][0-9]*$'
on conflict (user_id, verse_key) do nothing;

drop function public.migration_safe_timestamptz(text, timestamptz);
drop function public.migration_safe_date(text, date);

insert into public.user_reading_chapters (
  user_id,
  chapter_key,
  book_slug,
  chapter,
  total_verses,
  updated_at
)
select
  progress_row.user_id,
  chapter_entry.key,
  split_part(chapter_entry.key, ':', 1),
  split_part(chapter_entry.key, ':', 2)::integer,
  chapter_entry.value::integer,
  progress_row.updated_at
from public.user_reading_progress as progress_row
cross join lateral jsonb_each_text(
  case
    when jsonb_typeof(progress_row.progress -> 'chapterVerseCounts') = 'object'
      then progress_row.progress -> 'chapterVerseCounts'
    else '{}'::jsonb
  end
) as chapter_entry(key, value)
where chapter_entry.key ~ '^[a-z0-9-]+:[1-9][0-9]*$'
  and chapter_entry.value ~ '^[1-9][0-9]*$'
on conflict (user_id, chapter_key) do update
set
  total_verses = greatest(
    public.user_reading_chapters.total_verses,
    excluded.total_verses
  ),
  updated_at = greatest(
    public.user_reading_chapters.updated_at,
    excluded.updated_at
  );

insert into public.user_reading_daily_stats (
  user_id,
  reading_date,
  read_count
)
select user_id, completed_date, count(*)::integer
from public.user_verse_completions
group by user_id, completed_date
on conflict (user_id, reading_date) do update
set
  read_count = excluded.read_count,
  updated_at = now();

create or replace function public.adjust_user_reading_daily_stat(
  target_user_id uuid,
  target_date date,
  count_delta integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_reading_daily_stats (
    user_id,
    reading_date,
    read_count,
    updated_at
  )
  values (
    target_user_id,
    target_date,
    greatest(count_delta, 0),
    now()
  )
  on conflict (user_id, reading_date) do update
  set
    read_count = greatest(
      public.user_reading_daily_stats.read_count + count_delta,
      0
    ),
    updated_at = now();

  delete from public.user_reading_daily_stats
  where user_id = target_user_id
    and reading_date = target_date
    and read_count = 0;
end;
$$;

revoke all on function public.adjust_user_reading_daily_stat(
  uuid,
  date,
  integer
) from public, anon, authenticated;

create or replace function public.sync_user_reading_daily_stat()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.adjust_user_reading_daily_stat(
      new.user_id,
      new.completed_date,
      1
    );
    return new;
  end if;

  if tg_op = 'DELETE' then
    perform public.adjust_user_reading_daily_stat(
      old.user_id,
      old.completed_date,
      -1
    );
    return old;
  end if;

  if old.user_id is distinct from new.user_id
    or old.completed_date is distinct from new.completed_date then
    perform public.adjust_user_reading_daily_stat(
      old.user_id,
      old.completed_date,
      -1
    );
    perform public.adjust_user_reading_daily_stat(
      new.user_id,
      new.completed_date,
      1
    );
  end if;
  return new;
end;
$$;

revoke all on function public.sync_user_reading_daily_stat()
  from public, anon, authenticated;

drop trigger if exists sync_user_reading_daily_stat
  on public.user_verse_completions;
create trigger sync_user_reading_daily_stat
after insert or delete or update of user_id, completed_date
on public.user_verse_completions
for each row execute function public.sync_user_reading_daily_stat();

-- Already-open PWA clients can still write the legacy JSON during rollout.
-- Mirror only newer entries so applying this migration before the application
-- deployment cannot lose progress recorded in between.
create or replace function public.sync_legacy_reading_progress()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  verse_record record;
  chapter_record record;
  parsed_completed_at timestamptz;
  parsed_completed_date date;
begin
  for verse_record in
    select
      verse.value as verse_key,
      new.progress -> 'completedVerseDetails' -> verse.value as detail
    from jsonb_array_elements_text(
      case
        when jsonb_typeof(new.progress -> 'completedVerseKeys') = 'array'
          then new.progress -> 'completedVerseKeys'
        else '[]'::jsonb
      end
    ) as verse(value)
    where verse.value ~ '^[a-z0-9-]+:[1-9][0-9]*:[1-9][0-9]*$'
  loop
    begin
      parsed_completed_at :=
        (verse_record.detail ->> 'completedAt')::timestamptz;
      parsed_completed_date :=
        (verse_record.detail ->> 'completedDate')::date;
    exception when others then
      continue;
    end;

    insert into public.user_verse_completions (
      user_id,
      verse_key,
      book_slug,
      chapter,
      verse_num,
      completed_at,
      completed_date
    )
    values (
      new.user_id,
      verse_record.verse_key,
      split_part(verse_record.verse_key, ':', 1),
      split_part(verse_record.verse_key, ':', 2)::integer,
      split_part(verse_record.verse_key, ':', 3)::integer,
      parsed_completed_at,
      parsed_completed_date
    )
    on conflict (user_id, verse_key) do update
    set
      completed_at = excluded.completed_at,
      completed_date = excluded.completed_date
    where excluded.completed_at >
      public.user_verse_completions.completed_at;
  end loop;

  for chapter_record in
    select chapter_entry.key, chapter_entry.value
    from jsonb_each_text(
      case
        when jsonb_typeof(new.progress -> 'chapterVerseCounts') = 'object'
          then new.progress -> 'chapterVerseCounts'
        else '{}'::jsonb
      end
    ) as chapter_entry(key, value)
    where chapter_entry.key ~ '^[a-z0-9-]+:[1-9][0-9]*$'
      and chapter_entry.value ~ '^[1-9][0-9]*$'
  loop
    insert into public.user_reading_chapters (
      user_id,
      chapter_key,
      book_slug,
      chapter,
      total_verses,
      updated_at
    )
    values (
      new.user_id,
      chapter_record.key,
      split_part(chapter_record.key, ':', 1),
      split_part(chapter_record.key, ':', 2)::integer,
      chapter_record.value::integer,
      new.updated_at
    )
    on conflict (user_id, chapter_key) do update
    set
      total_verses = greatest(
        public.user_reading_chapters.total_verses,
        excluded.total_verses
      ),
      updated_at = greatest(
        public.user_reading_chapters.updated_at,
        excluded.updated_at
      );
  end loop;

  return new;
end;
$$;

revoke all on function public.sync_legacy_reading_progress()
  from public, anon, authenticated;

drop trigger if exists sync_legacy_reading_progress
  on public.user_reading_progress;
create trigger sync_legacy_reading_progress
after insert or update of progress
on public.user_reading_progress
for each row execute function public.sync_legacy_reading_progress();

create or replace function public.get_my_normalized_reading_progress()
returns table (
  completed_verse_keys text[],
  chapter_verse_counts jsonb,
  completed_verse_details jsonb
)
language sql
stable
set search_path = public
as $$
  select
    coalesce((
      select array_agg(
        completion.verse_key
        order by completion.completed_at, completion.verse_key
      )
      from public.user_verse_completions as completion
      where completion.user_id = (select auth.uid())
    ), array[]::text[]) as completed_verse_keys,
    coalesce((
      select jsonb_object_agg(
        chapter.chapter_key,
        chapter.total_verses
      )
      from public.user_reading_chapters as chapter
      where chapter.user_id = (select auth.uid())
    ), '{}'::jsonb) as chapter_verse_counts,
    coalesce((
      select jsonb_object_agg(
        completion.verse_key,
        jsonb_build_object(
          'completedAt',
          completion.completed_at,
          'completedDate',
          completion.completed_date
        )
      )
      from public.user_verse_completions as completion
      where completion.user_id = (select auth.uid())
    ), '{}'::jsonb) as completed_verse_details;
$$;

revoke all on function public.get_my_normalized_reading_progress()
  from public, anon;
grant execute on function public.get_my_normalized_reading_progress()
  to authenticated;

create or replace function public.get_activity_ranking(
  p_start_date date,
  p_end_date date,
  p_affiliation text default null,
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
    where stats.reading_date >= p_start_date
      and stats.reading_date < p_end_date
    group by stats.user_id
  ),
  ranked as (
    select
      account.user_id,
      account.username,
      profile.nickname,
      profile.affiliation,
      weekly.read_count,
      row_number() over (
        order by weekly.read_count desc, account.username asc
      ) as ranking_position,
      count(*) over () as total_count
    from weekly_counts as weekly
    join public.user_accounts as account
      on account.user_id = weekly.user_id
    left join public.user_profile_settings as profile
      on profile.user_id = weekly.user_id
    where weekly.read_count > 0
      and (
        p_affiliation is null
        or profile.affiliation = p_affiliation
      )
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

revoke all on function public.get_activity_ranking(
  date,
  date,
  text,
  integer,
  integer
) from public, anon, authenticated;
grant execute on function public.get_activity_ranking(
  date,
  date,
  text,
  integer,
  integer
) to service_role;

create or replace function public.get_activity_ranking_user_summary(
  p_username text,
  p_start_date date,
  p_end_date date
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
    profile.affiliation,
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
      select array_agg(achievement.goal_date order by achievement.goal_date desc)
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
  where account.username = p_username;
$$;

revoke all on function public.get_activity_ranking_user_summary(
  text,
  date,
  date
) from public, anon, authenticated;
grant execute on function public.get_activity_ranking_user_summary(
  text,
  date,
  date
) to service_role;

create table if not exists public.api_rate_limits (
  bucket_key text primary key,
  request_count integer not null check (request_count > 0),
  expires_at timestamptz not null
);

create index if not exists api_rate_limits_expires_at_idx
  on public.api_rate_limits (expires_at);

alter table public.api_rate_limits enable row level security;
revoke all on table public.api_rate_limits from public, anon, authenticated;

create or replace function public.consume_api_rate_limit(
  p_bucket_key text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  accepted_key text;
begin
  if p_bucket_key is null
    or length(p_bucket_key) > 200
    or p_limit < 1
    or p_window_seconds < 1 then
    return false;
  end if;

  insert into public.api_rate_limits (
    bucket_key,
    request_count,
    expires_at
  )
  values (
    p_bucket_key,
    1,
    now() + make_interval(secs => p_window_seconds)
  )
  on conflict (bucket_key) do update
  set
    request_count = case
      when public.api_rate_limits.expires_at <= now() then 1
      else public.api_rate_limits.request_count + 1
    end,
    expires_at = case
      when public.api_rate_limits.expires_at <= now()
        then now() + make_interval(secs => p_window_seconds)
      else public.api_rate_limits.expires_at
    end
  where public.api_rate_limits.expires_at <= now()
    or public.api_rate_limits.request_count < p_limit
  returning bucket_key into accepted_key;

  if random() < 0.01 then
    delete from public.api_rate_limits
    where expires_at < now() - interval '1 hour';
  end if;

  return accepted_key is not null;
end;
$$;

revoke all on function public.consume_api_rate_limit(text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.consume_api_rate_limit(
  text,
  integer,
  integer
) to service_role;

create index if not exists password_recovery_attempts_created_at_idx
  on public.password_recovery_attempts (created_at);
