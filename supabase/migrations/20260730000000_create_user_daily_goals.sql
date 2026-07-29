create table if not exists public.user_daily_goals (
  user_id uuid primary key references auth.users(id) on delete cascade,
  target_verses integer not null default 31
    check (target_verses between 1 and 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_daily_goal_achievements (
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_date date not null,
  target_verses integer not null
    check (target_verses between 1 and 1000),
  completed_verses integer not null
    check (completed_verses >= target_verses),
  achieved_at timestamptz not null default now(),
  primary key (user_id, goal_date)
);

create index if not exists user_daily_goal_achievements_user_date_idx
  on public.user_daily_goal_achievements (user_id, goal_date desc);

alter table public.user_daily_goals enable row level security;
alter table public.user_daily_goal_achievements enable row level security;

revoke all on table public.user_daily_goals from anon;
revoke all on table public.user_daily_goal_achievements from anon;

grant select, insert, update, delete
  on table public.user_daily_goals to authenticated;
grant select, insert, update, delete
  on table public.user_daily_goal_achievements to authenticated;

create policy "Users manage only their daily goal"
  on public.user_daily_goals
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users manage only their daily goal achievements"
  on public.user_daily_goal_achievements
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
