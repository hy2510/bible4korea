alter table public.user_profile_settings
  add column if not exists affiliation_filter_only boolean not null default false;
