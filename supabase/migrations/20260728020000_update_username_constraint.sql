alter table public.user_accounts
  drop constraint if exists user_accounts_username_check;

alter table public.user_accounts
  add constraint user_accounts_username_check
  check (
    username ~ '^[a-z0-9][a-z0-9._-]{2,18}[a-z0-9_-]$'
    and username !~ '\.\.'
  );
