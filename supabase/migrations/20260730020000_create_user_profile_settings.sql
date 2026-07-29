create table if not exists public.user_profile_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  affiliation text
    check (
      affiliation is null
      or (
        char_length(affiliation) between 1 and 50
        and affiliation = btrim(affiliation)
      )
    ),
  updated_at timestamptz not null default now()
);

alter table public.user_profile_settings enable row level security;

revoke all on table public.user_profile_settings from anon;

grant select, insert, update, delete
  on table public.user_profile_settings to authenticated;

create policy "Users manage only their profile settings"
  on public.user_profile_settings
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
