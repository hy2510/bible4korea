alter table public.user_profile_settings
  add column if not exists nickname text
    check (
      nickname is null
      or (
        char_length(nickname) between 1 and 20
        and nickname = btrim(nickname)
      )
    );
