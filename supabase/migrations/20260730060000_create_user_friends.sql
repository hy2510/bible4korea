create table if not exists public.user_friends (
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  friend_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (owner_user_id, friend_user_id),
  check (owner_user_id <> friend_user_id)
);

create index if not exists user_friends_owner_created_idx
  on public.user_friends (owner_user_id, created_at desc);

alter table public.user_friends enable row level security;

revoke all on table public.user_friends from anon;

grant select, insert, delete
  on table public.user_friends to authenticated;

create policy "Users read only their own friends"
  on public.user_friends
  for select
  to authenticated
  using ((select auth.uid()) = owner_user_id);

create policy "Users add only their own friends"
  on public.user_friends
  for insert
  to authenticated
  with check (
    (select auth.uid()) = owner_user_id
    and owner_user_id <> friend_user_id
  );

create policy "Users delete only their own friends"
  on public.user_friends
  for delete
  to authenticated
  using ((select auth.uid()) = owner_user_id);
