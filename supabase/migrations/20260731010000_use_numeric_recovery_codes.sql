alter table public.user_accounts
  drop column recovery_question;

alter table public.user_accounts
  rename column recovery_answer_salt to recovery_code_salt;

alter table public.user_accounts
  rename column recovery_answer_hash to recovery_code_hash;

delete from public.password_recovery_attempts
where action = 'question';

alter table public.password_recovery_attempts
  drop constraint if exists password_recovery_attempts_action_check;

alter table public.password_recovery_attempts
  add constraint password_recovery_attempts_action_check
  check (action in ('signup', 'reset'));

comment on column public.user_accounts.recovery_code_salt is
  'Salt used to hash the six-digit password recovery code.';

comment on column public.user_accounts.recovery_code_hash is
  'Scrypt hash of the six-digit password recovery code; the original code is never stored.';
