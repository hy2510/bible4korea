create table if not exists public.user_viewed_history (
  user_id uuid primary key references auth.users(id) on delete cascade,
  entries jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.user_reading_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  progress jsonb not null default jsonb_build_object(
    'completedVerseKeys', jsonb_build_array(),
    'chapterVerseCounts', jsonb_build_object(),
    'completedVerseDetails', jsonb_build_object()
  ),
  updated_at timestamptz not null default now()
);

alter table public.user_viewed_history enable row level security;
alter table public.user_reading_progress enable row level security;

revoke all on table public.user_viewed_history from anon;
revoke all on table public.user_reading_progress from anon;

grant select, insert, update, delete
  on table public.user_viewed_history to authenticated;
grant select, insert, update, delete
  on table public.user_reading_progress to authenticated;

create policy "Users manage only their viewed history"
  on public.user_viewed_history
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users manage only their reading progress"
  on public.user_reading_progress
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
