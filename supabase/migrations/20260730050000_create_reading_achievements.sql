create table if not exists public.user_book_reading_achievements (
  user_id uuid not null references auth.users(id) on delete cascade,
  book_slug text not null,
  completion_count integer not null check (completion_count > 0),
  completed_at timestamptz not null default now(),
  primary key (user_id, book_slug, completion_count)
);

create table if not exists public.user_bible_reading_achievements (
  user_id uuid not null references auth.users(id) on delete cascade,
  completion_count integer not null check (completion_count > 0),
  completed_at timestamptz not null default now(),
  primary key (user_id, completion_count)
);

create index if not exists user_book_reading_achievements_user_date_idx
  on public.user_book_reading_achievements (user_id, completed_at desc);
create index if not exists user_bible_reading_achievements_user_date_idx
  on public.user_bible_reading_achievements (user_id, completed_at desc);

alter table public.user_book_reading_achievements enable row level security;
alter table public.user_bible_reading_achievements enable row level security;

revoke all on table public.user_book_reading_achievements from anon;
revoke all on table public.user_bible_reading_achievements from anon;

grant select, insert
  on table public.user_book_reading_achievements to authenticated;
grant select, insert
  on table public.user_bible_reading_achievements to authenticated;

create policy "Users read only their book reading achievements"
  on public.user_book_reading_achievements
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users insert only their book reading achievements"
  on public.user_book_reading_achievements
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users read only their Bible reading achievements"
  on public.user_bible_reading_achievements
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users insert only their Bible reading achievements"
  on public.user_bible_reading_achievements
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);
