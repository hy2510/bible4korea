create index if not exists user_profile_settings_affiliation_idx
  on public.user_profile_settings (affiliation)
  where affiliation is not null;
